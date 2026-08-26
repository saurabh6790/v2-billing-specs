# Durable intent before irreversible side effects

Date: 2026-07-13

A database transaction gives us atomicity over our own tables and **precisely zero atomicity over the
payment gateway**. Today we call the gateway from inside a transaction, and the gap between those two
facts is where money is lost.

`payments/charges.py:90–127` runs inside `open_and_collect`, which is a background job. It inserts a
`Payment Attempt` (`Initiated`, carrying an `idempotency_key`), calls `adapter.charge()` — real money
moves — and then updates the attempt to `Captured` or `Failed`. Nothing is committed until the job
ends. So if the worker dies between the charge and the commit — OOM, deploy, SIGKILL, a restart
mid-collection — or if the adapter raises anything not mapped to `GatewayTimeout` (a
`GatewayAuthError`, an unmapped `stripe.error.APIError`, a `KeyError` parsing the response), Frappe
rolls the transaction back and **the Payment Attempt row ceases to exist.** The gateway still took the
money.

It gets worse, because of how the key is minted. `doctype/payment_attempt/payment_attempt.py` sets
`idempotency_key = self.name` — the attempt's own **random** docname. When the row rolls back, the key
dies with it. Dunning later retries, mints a **fresh random key**, and the gateway has nothing to
deduplicate against, so **it charges the card again**. The webhook for the first charge arrives
referencing an attempt that no longer exists locally and is dropped. The customer is charged twice,
the invoice is settled once, and one payment is stranded with no record on our side.

And it is undetectable. `payments/reconciliation.py` finds charged-but-never-webhooked payments by
walking the `Payment Attempt` rows that exist. A rolled-back attempt is invisible to it. Our own
safety net cannot see this failure. We learn about it when the customer emails us.

We have met this class of bug before and patched it locally rather than naming it:
`payments/payments.py:88` commits `ensure_gateway_customer` before placing the order "so failures
don't orphan". The same hazard is open on the path where actual money moves, and on the
cluster-manager call in `catalog/subscriptions.py:462–465`, which hand-rolls a `rollback()`/`commit()`
pair around provisioning for exactly the same reason.

## Decision

**No irreversible external act may be performed except under a durably committed record of intent,
whose idempotency key is a deterministic function of the business fact it represents.**

The external call moves *out* of the transaction and sits *between* two of them. This holds for every
irreversible act billing performs: charging a card, issuing a refund, creating a mandate, capturing a
top-up, and provisioning through the cluster manager.

The decision has three parts, and each one buys exactly one of the three properties a billing state
must have.

### 1. Durable intent — two transactions, the call in between (this buys *authenticity*)

```
  ── Txn 1: CLAIM ─────────────────────────────────────
     lock the subject, verify no intent in flight,
     INSERT the intent record (Initiated, with its key)
     COMMIT                                              ← the intent is now a fact
  ─────────────────────────────────────────────────────

     adapter.charge(…, key)        ← irreversible, outside any transaction

  ── Txn 2: RESOLVE ───────────────────────────────────
     stamp the outcome onto the intent record
     COMMIT
  ─────────────────────────────────────────────────────
```

A crash anywhere after the claim leaves a **durable `Initiated` attempt carrying its key**. That is a
question, and the system now has everything it needs to answer it. The state can no longer lie about
reality: there is no path on which money moves without a record of the attempt to move it.

### 2. The idempotency key is deterministic, not random (this buys *reproducibility*)

The key stops being the attempt's random docname and becomes a deterministic function of the fact:

```
idempotency_key = sha256(f"{invoice}:{retry_number}")
```

`retry_number` is already computed (`frappe.db.count("Payment Attempt", {"invoice": …})`) and the
field is already `unique: 1`. Making the key deterministic changes two things.

**It is the mutual-exclusion token.** Two workers racing to open retry #0 of `INV-42` compute the
*same* key, so one insert wins and the other takes a duplicate-key error. This replaces the
`FOR UPDATE` lock as the safety mechanism — which is what makes the early commit in Txn 1 safe at all,
since committing would release the lock. The lock stays, demoted from *guarantee* to *optimisation*
that avoids a wasted race.

**It is self-healing.** If a crash loses the attempt, `retry_number` reverts to `0`, so the retry
reconstructs the **same key** and the gateway replays its original result instead of charging again.
The double-charge chain is severed at the gateway, not merely in our bookkeeping. Legitimate retries
still get fresh keys, because a persisted `Failed` attempt increments `retry_number` — a Day 3 dunning
retry is a genuinely new charge and must be allowed to be one.

This is a net, not the guarantee: Stripe expires idempotency keys after 24 hours, and other gateways
differ. **Durable intent is the guarantee; the deterministic key is what catches the case where the
guarantee was violated by a crash.** Both, not either.

### 3. Every non-terminal intent is a question the system must answer (this buys *debuggability*)

**No intent may remain non-terminal indefinitely.** An `Initiated` attempt older than a threshold is,
by definition, a charge whose outcome we do not know — and *not knowing* is a defect, not a resting
state.

`reconciliation.py` is promoted from an ad-hoc scan into the **universal resolver of non-terminal
intents**. It sweeps every intent past the threshold, reads the truth from the gateway, drives the
record to a terminal state, and stamps `resolved_by` — the field already exists and already
distinguishes `Webhook` from `Reconciliation`. Each resolution appends a Billing Event
([ADR 0016](0016-billing-event-stream-and-single-transition-authority.md)) correlated to the invoice,
so the crash, the orphan and its resolution all appear on one timeline in order.

### The rule that follows: a state may never assert an unverified fact

`Captured` is set from the adapter's return value — a *local claim*. `Paid` is set only when a
**signed webhook** or a **read back from the gateway** confirms it; `charges.py:121` already carries the
comment "gateway captured; invoice Paid waits on webhook". That instinct is correct and is hereby
promoted from a comment to a rule:

> No billing state may assert a fact about the outside world that we have not verified with the outside
> world. Optimistic settlement is banned.

## Considered Options

- **Just add `frappe.db.commit()` before the charge.** The obvious one-liner. Rejected: `commit()`
  releases the `FOR UPDATE` lock on the invoice row, which is currently the *only* thing stopping two
  workers from opening concurrent attempts. It trades an orphan charge for a double charge. The
  deterministic unique key is what makes the early commit safe, so the two parts of this decision are
  not separable.

- **A full transactional outbox** — write the intended call to a table, let a drainer worker perform
  it. Rejected as the wrong shape for us: it pushes the gateway call out of band, which breaks the
  customer-present checkout flow that must return a result synchronously, and Frappe has no
  exactly-once queue to drain it with. Committing the intent record *is* the outbox, with the drainer
  collapsed into the caller and reconciliation as the backstop.

- **Rely on reconciliation alone.** Rejected: reconciliation can only find records that exist, and the
  entire failure is that the record does not exist.

- **Two-phase commit / XA across the gateway.** Not on offer. No payment gateway participates in our
  transaction, and none ever will.

- **Keep the random key, add only the commit.** Rejected: it fixes the orphan but leaves the system
  unable to recover from any crash that beat the commit, and leaves the key non-reproducible — so two
  honest attempts to perform the same charge remain indistinguishable to the gateway.

## Consequences

- **`pay_invoice` splits into claim and charge.** The claim phase (lock, in-flight check, insert,
  commit) is separated from the charge phase (call, resolve, commit). The gateway call sits outside
  both.

- **`open_and_collect`'s transaction boundary moves.** The credit draw commits with the claim, so a
  crash before the charge leaves credits durably applied, the invoice `Open`, and a resolvable
  `Initiated` attempt — which dunning and the sweeper both handle. This is strictly better than
  today's silent rollback, and it is visible on the timeline.

- **`retry_number` becomes load-bearing.** It is part of the key, so it must be computed inside the
  claim's lock. It stops being a diagnostic integer and becomes a correctness-relevant one.

- **The rule generalises past payments.** Provisioning through the cluster manager is the same shape —
  an irreversible external act inside a transaction — and the hand-rolled `rollback()`/`commit()` in
  `catalog/subscriptions.py:462–465` is the same patch applied by hand. A VM created against a
  subscription that then rolls back is an orphan machine nobody is billed for. Refunds, mandate
  creation and top-up capture all follow the same pattern.

- **Gateway adapters are untouched.** `GatewayAdapter.charge()` already accepts an idempotency key.
  The seam was right; only the caller's transaction discipline was wrong.

- **A migration for existing keys is not required.** The key is only meaningful for the lifetime of an
  in-flight attempt; historical attempts keep their docname-derived keys and are never re-sent.

- **The 24-hour window is a stated limitation.** Beyond a gateway's key TTL, the deterministic key no
  longer dedupes, and durable intent plus the sweeper are the sole protection. This is acceptable
  because the sweeper's threshold is minutes, not hours.

## Supersedes / amends

- Depends on [ADR 0016](0016-billing-event-stream-and-single-transition-authority.md): resolutions and
  orphan sweeps are only debuggable because every transition appends a correlated Billing Event.
- Generalises the local fix at `payments/payments.py:88` (`ensure_gateway_customer` commits before the
  order) into a rule that covers every irreversible external act.
- Extends the reconciliation job of [issue #21](../../issues/21-reconciliation-job.md) from a
  charged-but-never-webhooked scan into the universal resolver of non-terminal intents.
- Constrains the payment state machine of [issue #10](../../issues/10-charge-invoice-payment-attempt-webhook.md):
  `Paid` may be reached only from a verified external fact, never from a local return value.
