# v2 Architecture — the internal shape of `central/billing`

## Purpose and scope

This document is about **how the billing code is organised, and why it is (or is not) readable**.

It is deliberately narrow, because a proliferation of overlapping documents is one of the problems it
is trying to solve:

| Document | Answers |
|---|---|
| [architecture.md](architecture.md) | **System shape.** What Central is, what the cluster manager is, where the seams are, what flows between them. |
| **v2-architecture.md** (this) | **Code shape.** How `central/billing` is structured internally, who owns state, what a report reads, and where a new engineer looks first. |
| `central/billing/ARCHITECTURE.md` (in the app) | **Debugging map.** The live symptom → file cheat-sheet. Generated from the code, kept next to it. |

If a fact belongs in two of these, it belongs in exactly one and is linked from the other.

---

## 1. What we already got right — do not redo this

The instinct to rebuild billing "properly" should be resisted where the current design is already
correct, and it is correct in more places than it feels. Three in particular.

**The gateway seam is right.** Press has `stripe_payment_event`, `razorpay_payment_record`,
`mpesa_payment_record`, `stripe_micro_charge_record`, `stripe_webhook_log`, `razorpay_webhook_log` —
the gateway's name is baked into the doctype name, so gateway number four means new tables and new
code paths through the whole system. Central has **one** `Payment Attempt`, **one** `Webhook Event`,
and a `GatewayAdapter` protocol with three implementations behind a registry. That is the same shape
as Hyperswitch's connector trait, and it is the single most valuable structural asset in the module.
Adding Flutterwave is an adapter, not a migration.

**`Payment Attempt` is already a first-class attempt record.** It carries `idempotency_key`,
`retry_number`, `gateway_transaction_id`, `failure_code`, `decline_code`, `failure_reason`,
`gateway_response`, and `resolved_by` (webhook vs reconciliation). Very few billing systems at this
stage record *why* a charge failed and *which* subsystem resolved it. Keep it.

**The append-only records that carry money are the right ones.** `Subscription Change` is the
contract-and-price ledger ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)),
`Credit Ledger Entry` is the wallet's source of truth, `Webhook Event` holds the raw payload for
dedupe and replay. Each has one job.

What is missing is not doctypes. It is a **spine**.

---

## 2. The standard: every state is debuggable, reproducible, authentic

Before the moves, the bar they are trying to clear. Every state in billing must satisfy three
properties, and each one is bought by a different mechanism — which is why neither ADR alone is
sufficient.

**Debuggable** — you can always ask *what happened, in order*, and get an answer without a six-way
join. Bought by the correlated `Billing Event` stream
([ADR 0016](docs/adr/0016-billing-event-stream-and-single-transition-authority.md)).

**Reproducible** — the same inputs yield the same state, every time, no matter how many times you
re-run. Bought by idempotency: invoice generation is already idempotent per `(team, period)`; the
payment idempotency key becomes a deterministic function of `(invoice, retry_number)` rather than a
random docname ([ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md)), so a
retry of the same charge is the *same* charge and the gateway says so.

**Authentic** — a state never asserts a fact about the outside world that we have not verified with
the outside world. `Captured` may be set from an adapter's return value because that is a claim about
our own request; `Paid` may be set only from a signed webhook or a read back from the gateway, because
that is a claim about money. Optimistic settlement is banned. Bought by durable intent
([ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md)): no irreversible act
without a committed record of the intent to perform it, so there is no path on which money moves and
the system does not know.

A state that fails any of the three is a defect, even if no customer has noticed yet. Most of the
"billing is confusing" feeling is the accumulated weight of states that fail one of them silently.

**The ACID lens says the same thing, and names the gap.** Billing is a database problem, so audit it
like one. **A**tomicity across the gateway is physically impossible — there is no `ROLLBACK` for a
captured card — so we do not pretend, and
[ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md) makes the partial state
*recoverable* instead. **I**solation is in decent shape (`FOR UPDATE` on the invoice row, the wallet
anchor, the usage rollup). **D**urability is what ADR 0017 repairs at the money boundary. That leaves
**C**onsistency — and across 36 DocTypes there are twelve unique fields and **no other constraint of
any kind**. Every other invariant is a line of Python in one function, holding only for callers polite
enough to route through it.
[ADR 0018](docs/adr/0018-invariants-are-enforced-not-observed.md) closes that letter: every invariant
is pushed to the lowest rung that can physically hold it, and a detection counter is an admission of
failure, not a design.

## 3. The spine

Everything in this document follows from one decision, recorded in
[ADR 0016](docs/adr/0016-billing-event-stream-and-single-transition-authority.md):

> **Every state transition goes through one authority, and every transition appends one immutable
> `Billing Event`. The event stream is derived — the write path may never read it.**

Today `Invoice.status` is written from two modules that do not know about each other
(`payments/charges.py` and `revenue/invoicing/lifecycle.py`), roughly nine production modules assign
a status directly, and no transition table exists anywhere. There is no ordered record of what
happened, so debugging is a six-way manual join and every one of the sixteen reports re-derives
revenue from mutable documents.

After the spine:

```
                 ┌──────────────────────────────────────────┐
   write path    │  catalog · revenue · payments · gateways │
                 └────────────────────┬─────────────────────┘
                                      │  every status change
                                      ▼
                          ┌───────────────────────┐
                          │  billing/states.py    │   the only writer of a status
                          │  transition(doc, to)  │   validates against the machine
                          └───────────┬───────────┘
                                      │ appends exactly one row
                                      ▼
                          ┌───────────────────────┐
                          │     Billing Event     │   append-only · never edited
                          │  (team, occurred_at,  │   correlation threads the story
                          │   subject, from→to,   │
                          │   amount, actor)      │
                          └───────────┬───────────┘
                                      │  read-only
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
               debugging          admin UI           reports
```

The arrow only ever points down. Nothing under the stream feeds back into the write path — that
constraint is what keeps Billing Event from becoming the second load-bearing ledger that
[ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) deleted. If the table were
dropped tomorrow, not one invoice total would change.

**Debugging, before and after.**

| | Today | With the spine |
|---|---|---|
| "Why wasn't this customer charged?" | Join Invoice, Payment Attempt, Webhook Event, Credit Ledger Entry, Subscription Change and Billing Notification Log by timestamp; hope six status fields agree | `WHERE correlation = 'INV-…' ORDER BY occurred_at` |
| "Can an invoice go Cancelled → Paid?" | Read nine modules and find out | Read one transition table |
| "What did we bill in June?" | Sixteen reports, sixteen derivations, two can disagree | `GROUP BY` over one immutable fact table |

---

## 4. Report-first is a write-path property

The reason a system like Hyperswitch can ship analytics generously is not that it has a good
reporting layer. It is that its writes are boring: an exhaustive status enum, one function that maps
attempt status onto intent status, and an append-only stream that everything else projects from. The
reports are cheap because the history is already a fact table.

Ours are expensive because each of the sixteen reconstructs history by querying documents that are
still being mutated. `report/_revenue.py` and `report/_currency.py` exist to share that reconstruction
logic, which is the tell — shared helpers for re-deriving a fact you never recorded.

So: **"report-first" is not a reporting decision, it is a write-path decision.** Move the reports onto
`Billing Event`, and adding the seventeenth costs an afternoon instead of a week. Per-currency
column-splitting stays exactly as it is today (INR and USD never share a column or a total); the
change is what the report reads, not how it presents.

---

## 5. The moves, in payoff order

Move 0 is a live money bug and jumps every queue. Moves 1–5 are the structural work; they make the
system readable, but nothing in them is on fire today.

### Move 0 — durable intent on the money path (fix the orphan charge)

`payments/charges.py:90–127` calls the gateway from inside a transaction that has not committed the
`Payment Attempt`. A worker crash or an unmapped adapter exception rolls the attempt away *after* the
money moved; the random-docname idempotency key dies with it, so the dunning retry mints a fresh key
and **charges the card a second time**, while the first webhook is dropped for referencing an attempt
that no longer exists. Reconciliation cannot see it, because it walks attempts that exist.

Split `pay_invoice` into a committed claim and a charge, and make the idempotency key deterministic
from `(invoice, retry_number)`. Both halves are required: the commit is only safe because the unique
deterministic key replaces the `FOR UPDATE` lock that the commit would release. Full reasoning in
[ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md).

The same shape is open on the cluster-manager call in `catalog/subscriptions.py:462–465`, where the
consequence is an orphan VM nobody is billed for.

### Move 1 — one transition authority (`billing/states.py`)

Declares every billing state machine and their legal transitions, and exposes `transition()` as the
sole writer of any status field. A grep-test fails the build on a direct `\.status =` assignment
anywhere else in the module — the same guard shape we already use to keep raw SQL out.

Deletes the `_STANDING_RANK` constant that `api/admin/teams.py` had to invent for itself, and gives
the lone `InvalidTransition` in `catalog/subscriptions.py` a home that covers all six machines.

### Move 2 — the `Billing Event` stream

`transition()` appends one immutable row per transition; money movements that are not status changes
(credit applied, top-up, clawback) append one too. `correlation` threads an invoice's entire story —
attempt, webhook, credit draw, dunning step, notification — onto one queryable timeline. Schema in
[ADR 0016](docs/adr/0016-billing-event-stream-and-single-transition-authority.md).

Moves 1 and 2 ship together; neither is worth much alone.

### Move 3 — reports read the stream

The existing sixteen migrate from document joins to `GROUP BY` over `Billing Event`, joining out to
catalog and team masters only for attributes. No new reports are needed to prove the point — the
proof is that the old ones get shorter.

### Move 4 — evict integration state from `Invoice`

`Invoice` carries thirty-two data fields. Five of them are ERPNext retry plumbing
(`erpnext_invoice`, `erpnext_sync_status`, `erpnext_sync_attempts`, `erpnext_next_retry_at`,
`erpnext_sync_error`) and two are e-mandate pre-debit scheduling (`predebit_notified_at`,
`predebit_charge_after`).

Retry state for an outbound integration is not a property of the money document. It goes to its own
record (`Integration Sync`, keyed by subject, reusable for any future push); the pre-debit schedule
belongs with the mandate that owns it. `Invoice` drops to roughly twenty-five fields, all of which
are the invoice: who, what period, what lines, what tax, what's owed, what's paid.

The test of a good money doctype is whether an accountant can read the form. Today they cannot.

### Move 5 — one door per concept

**Pricing.** Eight files in `catalog/` — `pricing.py`, `rate_card.py`, `component_card.py`,
`composition.py`, `configurator.py`, `plans.py`, `plan_setup.py`, `services.py` — about a thousand
lines and thirty functions, and their names do not tell you which one answers "what does this cost".
`rate_card` versus `component_card` versus `pricing` is a coin flip.

One public entry point, `pricing.resolve(subject, region, currency) -> Rate`, with everything else
demoted to a private helper behind it. The Plan Configurator remains the single pricing *authority*
([ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md)) — this is about
having a single pricing *entry point* in code, which is a different thing and currently absent.

**APIs.** There are three audiences and eighty-seven whitelisted endpoints, and the package names do
not say which is which. `api/billing_api.py` is not dead code — it is the pilot-token-authenticated
consumer-service facade from
[ADR 0015](docs/adr/0015-consumer-service-metering-api-contract.md), correctly IDOR-guarded, taking
the team from the credential and never from a parameter. But it sits at a path that says nothing
about its audience while re-exposing payment methods, billing profile, plans and credits, so
`save_billing_profile` exists in two files with no hint which one you want.

Rename by audience, so the path answers the question:

```
api/customer/    session user, team-scoped        (was api/dashboard/)
api/admin/       capability-gated                 (unchanged)
api/pilot/       X-Pilot-Token, ADR 0015          (was api/billing_api.py)
```

---

## 6. The rules that keep it readable

These are the invariants. A change that breaks one of them is a change that puts us back where we
started.

1. **Only `states.py` writes a status.** Enforced by test.
2. **The write path never reads `Billing Event`.** No pricing, invoicing, settlement, dunning or
   entitlement code may query it. Enforced by test.
3. **No irreversible external act without a committed record of intent.** The gateway call and the
   cluster-manager call sit *between* transactions, never inside one
   ([ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md)).
4. **No state asserts an unverified fact about the outside world.** `Paid` comes from a signed webhook
   or a read back from the gateway — never from a local return value. Optimistic settlement is banned.
5. **No intent may remain non-terminal indefinitely.** An `Initiated` attempt past the sweeper's
   threshold is a defect, not a resting state; reconciliation drives it to terminal and stamps
   `resolved_by`.
6. **Every invariant sits on the lowest rung that can hold it** — DB constraint, then transition
   guard, then write-path assertion, then continuous audit
   ([ADR 0018](docs/adr/0018-invariants-are-enforced-not-observed.md)). A drift counter is the last
   resort, never the first. In particular: **for every `(team, currency)`, the credit balance is
   never negative**, and that is a `CHECK` constraint, not a Python `if`.
7. **Money columns are never written by `frappe.db.set_value`** outside their guarded service
   function — `set_value` skips `validate()` entirely, so any invariant living there is not enforced
   against our own code.
8. **Gateway names appear only inside `gateways/`.** Nowhere else in the module knows Stripe exists.
   This is currently true and is the thing that most separates us from press. Enforced by test.
9. **One public entry point per concept**, everything else private. Pricing is the first to comply.
10. **Money is float `Currency` in major units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md),
   deprecated — read the banner). Conversion to minor units happens at the gateway boundary and
   nowhere else.
11. **A doctype has one job.** Integration retry state, scheduling state and presentation state do not
   live on the money document.
12. **Dashboard mutations declare `methods=["POST"]`.** frappe-ui's `useCall` defaults to GET and
     Frappe rolls back writes on GET — the toast lies and nothing persists.

---

## 7. Sequence

The moves are ordered so that each one is shippable and none blocks the product roadmap.

0. **Durable intent on `pay_invoice`**, plus the deterministic idempotency key, plus the sweeper for
   non-terminal attempts ([ADR 0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md)).
   This is a live money bug and does not wait for the spine. The `catalog/subscriptions.py`
   provisioning call follows.
1. **`states.py` + `Billing Event`, written but not yet enforced.** New transitions route through the
   authority; old direct writes still work. Nothing breaks.
2. **Migrate the nine status-writing modules**, one at a time, each with its tests green:
   `payments/charges.py` first (it holds the `Invoice.status` split-brain with
   `revenue/invoicing/lifecycle.py`, so those two go together), then `refunds`, `reconciliation`,
   `payments`, `mandates`, `dunning`, `subscriptions`, `commitments`.
3. **Turn on the grep-test.** From here the invariant holds by construction.
3b. **Land the constraints** ([ADR 0018](docs/adr/0018-invariants-are-enforced-not-observed.md)):
   re-key `Credit Wallet` to `(team, currency)` with `CHECK (balance >= 0)`, add `Invoice.period_key`
   to close the double-billing race, then the rung-4 audit job. Expect the first audit run to fail —
   its output *is* the backlog.
4. **Migrate the reports** onto the stream, starting with the revenue ones that share
   `report/_revenue.py`, and delete the shared re-derivation helpers as they empty out.
5. **Split `Invoice`** — `Integration Sync` doctype, pre-debit fields to the mandate, patch to move
   the data.
6. **Collapse pricing to one door**, and rename the API packages by audience.

Step 0 stops the bleeding. Steps 1–3 are the ones that change how the system feels. Steps 4–6 are
tidying that only becomes easy once the spine exists — which is why they come after, not before.

---

## 8. What this does not change

- **The catalog model.** Polymorphic categories
  ([ADR 0007](docs/adr/0007-polymorphic-catalog-category-masters.md)), composed configs
  ([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)) and the Plan
  Configurator as pricing authority ([ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md))
  are untouched.
- **`Subscription Change` as the price spine.**
  [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) stands. Invoicing still
  computes segments from it and from nothing else.
- **The agentless model.** [ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)
  stands; one component provisions, records and prices, which is precisely why a single transition
  authority is even possible.
- **Capability IAM.** [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md) stands;
  `authz.py` keeps delegating to `central.iam`.
- **The gateway adapters.** They translate and return; they never write a document. That seam is the
  reference for how every other seam in billing should look.
