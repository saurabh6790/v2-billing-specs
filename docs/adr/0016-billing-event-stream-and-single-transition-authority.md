# One transition authority, and a derived Billing Event stream

Date: 2026-07-13

Billing has six independent state machines — `Invoice.status`, `Payment Attempt.status`,
`Payment Method.status`, `Subscription.account_standing`, `Refund.status`, `Webhook Event.status`
— and nowhere that owns any of them. Roughly nine production modules assign a status directly onto
a document. `Invoice.status` alone is written from **two** places: `payments/charges.py` sets it to
`Paid` when a webhook settles an attempt, and `revenue/invoicing/lifecycle.py` sets `Open` / `Paid` /
`Cancelled` during the billing run. Neither knows about the other. There is no transition table, no
guard, and nothing that forbids paying a cancelled invoice — the one `InvalidTransition` exception in
the codebase lives in `catalog/subscriptions.py` and protects nothing outside it. The symptom of an
unowned state model is already visible in the reports: `api/admin/teams.py` carries a private
`_STANDING_RANK` constant because it had nowhere to import the ordering from.

The second half of the same problem is that **nothing records what happened, in order**. To answer
"why was this customer not charged" an engineer joins Invoice, Payment Attempt, Webhook Event, Credit
Ledger Entry, Subscription Change and Billing Notification Log by timestamp, by hand, and hopes the
six status fields agree. The sixteen reports each re-derive revenue by querying those same mutable
documents, which is why adding the seventeenth is expensive and why two of them can legitimately
disagree.

This is the difference between our billing and a system like Hyperswitch that reads as though it
were simple. It is not the language and it is not the reports. It is that their write path is a state
machine with one owner, and everything a human or a report reads is a projection off an append-only
stream.

## Decision

**Every billing state transition goes through one authority, and every transition appends one
immutable `Billing Event`. The Billing Event stream is *derived*: it is the read model for humans and
reports, and the write path is forbidden from reading it.**

### `billing/states.py` is the only thing that writes a status

It declares each state machine — the states, and the legal transitions between them — and exposes a
single entry point:

```python
transition(doc, to_state, reason=None, actor=None, correlation=None) -> None
```

`transition()` validates the move against the machine (raising `InvalidTransition` on an illegal
one), writes the field, and appends the Billing Event. Assigning a status field directly, anywhere
else in `central/billing`, is banned. The ban is enforced by a test that greps the module for
`\.status\s*=` and `set_value(..., "status", ...)` outside `states.py` and fails on a hit — the same
shape of guard we already use to keep raw SQL out.

The split-brain on `Invoice.status` dies here: `charges.py` and `lifecycle.py` both call
`transition(inv, "Paid", …)`, and the machine — not the caller — decides whether that is legal from
the invoice's current state.

Gateway adapters are unaffected. They translate a gateway's vocabulary into ours and return a
normalised result; they never touch a document. That seam stays exactly as it is.

### `Billing Event` is the append-only stream

One row per transition, never edited, never deleted by application code:

```
Billing Event
  team              Link(Team)
  occurred_at       Datetime            (indexed with team)
  event_type        Data                ("Invoice Opened", "Attempt Failed", "Credit Applied", …)
  subject_doctype   Link(DocType)       ─┐
  subject           Dynamic Link         ─┴ the document that moved
  from_state        Data
  to_state          Data
  amount            Currency            (nullable — not every event moves money)
  currency          Link(Currency)
  actor             Data                (user, "scheduler", "webhook:stripe", "reconciliation")
  reason            Small Text
  correlation       Data                (indexed)
  payload           Code (JSON)
```

`correlation` is the thread that makes the stream readable. Everything triggered by settling one
invoice — the attempt, the webhook, the credit draw, the dunning step, the notification — carries
that invoice's name. Debugging becomes one query, ordered by time:

```
SELECT * FROM `tabBilling Event` WHERE correlation = 'INV-2026-0042' ORDER BY occurred_at
```

Money movements that are not status changes (a credit applied to an invoice, a wallet top-up, a
commitment clawback) also append an event, so the stream is the complete monetary story of a team and
not merely a status log.

### The stream is derived, and the write path may not read it

This is the load-bearing constraint, and it is what stops this decision from re-creating the very
thing [ADR 0010](0010-price-lock-folded-into-subscription-change.md) deleted.

**No pricing, invoicing, settlement, dunning or entitlement code may query `Billing Event`.** If the
table were dropped tomorrow, not one invoice total would change. Its readers are: engineers
debugging, the admin UI, and the reports.

The distinction matters. ADR 0010 retired an event log that invoicing had to *join against* to
compute a segment — a second load-bearing ledger keyed the same way as the first, which meant two
records that could disagree about money. Billing Event cannot disagree about money, because nothing
computes money from it. The append-only records that *are* load-bearing keep their jobs unchanged:

| Record | Job | Load-bearing? |
|---|---|---|
| **Subscription Change** | the contract + `locked_rate` ledger invoicing computes segments from ([ADR 0010](0010-price-lock-folded-into-subscription-change.md)) | **Yes** |
| **Credit Ledger Entry** | the source of truth for wallet balance | **Yes** |
| **Webhook Event** | the raw inbound payload, for dedupe and replay | **Yes** |
| **Payment Attempt** | each try against a gateway, with `idempotency_key` and `decline_code` | **Yes** |
| **Billing Event** | the ordered, human- and report-readable story | **No — derived** |

A Subscription Change still gets written by the subscription code and still prices the invoice; it
*additionally* emits a Billing Event so the timeline is complete. That is a projection, not a second
source of truth.

### Reports read the stream

The sixteen existing reports move off joins across mutable documents and onto `Billing Event`. This
is what "report-first" actually means: it is a property of the write path, not of the reporting
layer. Revenue, AR aging, failed payments, gateway success ratio and credit-wallet movement are all
`GROUP BY` over one immutable fact table, at a point in time, reproducibly. Reports that need catalog
or team attributes join out to those masters; they do not reconstruct history from them.

## Considered Options

- **Frappe's built-in `Version` doctype.** It already records a field-level diff on every save.
  Rejected: it is a diff log, not a domain log — there is no `amount`, no `currency`, no
  `correlation`, no way to ask "every state change that moved money for this team in June". It is
  noisy (every field on every save) and, decisively, it is **not written for `frappe.db.set_value`
  calls**, which is precisely how most of our status writes happen today.

- **The document timeline / Comments.** Presentation only. Not queryable, not a report substrate.

- **A transition authority with no stream.** Gets us the invariants and kills the `Invoice.status`
  split-brain, but leaves debugging as a six-way manual join and leaves every report re-deriving
  revenue. Half the value for most of the work.

- **Full event sourcing — documents become projections of the stream.** Rejected as both too large a
  rewrite and, more importantly, wrong for us: it would make the stream load-bearing, and a
  load-bearing second ledger is exactly the failure mode ADR 0010 was written to end.

## Consequences

- **Debugging collapses to one query.** The six-way join is replaced by `WHERE correlation = …
  ORDER BY occurred_at`. This is the single largest readability win available in billing.

- **Illegal transitions become impossible rather than merely unlikely.** Paying a cancelled invoice,
  refunding an uncaptured attempt, or suspending an already-terminated subscription are rejected by
  the machine instead of relying on each caller to check.

- **The state model gains a home.** `_STANDING_RANK` in `api/admin/teams.py` and the lone
  `InvalidTransition` in `catalog/subscriptions.py` are deleted and imported from `states.py`.

- **Adding a report gets cheap**, and two reports can no longer disagree about the same month.

- **Roughly nine production modules are refactored** to route their status writes through
  `transition()`: `payments/charges.py`, `payments/refunds.py`, `payments/reconciliation.py`,
  `payments/payments.py`, `payments/mandates.py`, `revenue/invoicing/lifecycle.py`,
  `revenue/dunning.py`, `catalog/subscriptions.py`, `catalog/commitments.py`. The change is
  mechanical, and the grep-test keeps it from regressing.

- **One extra insert per transition.** Cheap on the write path; the table is append-only, indexed on
  `(team, occurred_at)` and `correlation`.

- **Retention is a real question.** The reports need history, so events are kept, but the `payload`
  JSON is the bulky part and can be pruned on the schedule `payments.charges.cleanup_payment_logs`
  already runs, leaving the structured columns intact. Retention policy is deliberately left to the
  implementing issue rather than fixed here.

- **Backfill is not attempted.** The stream starts empty and accrues forward. Historical reporting
  keeps reading the documents until the stream has enough depth; there is no honest way to
  reconstruct an ordered `actor`/`reason` history that was never recorded.

## Supersedes / amends

- Does **not** reopen [ADR 0010](0010-price-lock-folded-into-subscription-change.md).
  `Subscription Change` remains the single load-bearing append-only spine for price and contract.
  Billing Event is derived and is forbidden to the write path, which is the precise property the
  retired event log lacked.
- Builds on [ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md): with one
  component provisioning, recording and pricing, there is exactly one writer to route through one
  authority.
- The module layout, the shrinking of `Invoice`, the pricing entry point and the API packaging that
  follow from this decision are described in [v2-architecture.md](../../v2-architecture.md).
