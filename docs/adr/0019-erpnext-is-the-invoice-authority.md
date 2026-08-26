# ERPNext is the invoice authority

Date: 2026-07-21

Accounting will run on ERPNext, on its own site on its own server. ERPNext already knows how to do
three things Central currently guesses at: settle an invoice against money held on account, compute
and post GST, and issue statutory invoice numbers from the correct series — one each for domestic
B2B, domestic B2C, export B2B and export B2C. Central will never be a better GST engine than
ERPNext, and every month we keep our own is a month the two drift.

Today the integration is backwards. `revenue/erpnext_sync.py` pushes a Sales Invoice **after the
invoice reaches `Paid`** — one-way, failure-isolated, three retries with backoff. That was right when
Cloud Billing was the system of record for everything. Under the new plan it produces two defects
that are not fixable by tuning it:

**The customer is charged an amount the books have not seen.** `revenue/tax.py:resolve_tax` computes
GST/SEZ/TDS in Central, `open_and_collect` charges the result, and ERPNext learns about it afterwards.
If ERPNext is the authority on tax and on advances, then by the time it disagrees, the money has
moved. An advance the books would have applied cannot reduce a charge that already happened.

**One document has two numbers.** `doctype/invoice/invoice.py:25` mints
`make_autoname("INV-YYYY-MM-.#####")`; ERPNext independently mints its own. The number on the
customer's PDF is not the number in the statutory series, and under GST the series is not decoration —
it must be consecutive, per-series, and belong to the legal entity whose books they are. Two numbering
authorities for one sale is an audit finding.

The tempting correction is to stop creating invoices in Central and create them directly on ERPNext
over the API. That is worse, for reasons that have nothing to do with ERPNext and everything to do
with distance.

## Decision

**Central rates; ERPNext issues; Central collects what ERPNext says is outstanding.** The monthly run
grows a third phase, and the boundary between the two systems is drawn at the point where a
computation becomes a statutory document.

```
  ── DRAFT (Central, local) ────────────────────────────
     rate the period from Subscription Change segments
     + metered rollups; INSERT Invoice (Draft)
     COMMIT                                            ← unique period_key holds here
  ──────────────────────────────────────────────────────

  ── ISSUE (ERPNext, remote) ───────────────────────────
     COMMIT the intent to issue                        ← durable intent, ADR 0017
     POST the lines, keyed on period_key
        ERPNext: pick series, compute GST, apply
                 advances, submit the Sales Invoice
     record {sales_invoice, grand_total, outstanding}
     COMMIT
  ──────────────────────────────────────────────────────

  ── COLLECT (gateway) ─────────────────────────────────
     charge `outstanding_amount` — never Central's own total
  ──────────────────────────────────────────────────────
```

### 1. Central keeps the draft, because the draft is not the invoice

The Central `Invoice` stops being the customer-facing tax document and becomes what it always
actually was: **a rating record and a collection intent.** It keeps everything that makes the run
safe and none of what makes it statutory.

It keeps the unique `period_key` index — the constraint that makes billing a team twice for one
period impossible rather than unlikely (ADR 0018, invariant I6). This is the load-bearing reason not
to create invoices directly on ERPNext: that guarantee would move to another server, enforced over
HTTP, and an HTTP call whose response is lost is indistinguishable from one that never arrived. A
timed-out POST that actually succeeded is a second invoice for the same month. That is precisely the
failure class ADR 0017 exists to eliminate, and we would be reintroducing it one layer up.

It also keeps the things ERPNext cannot reconstruct. The day- and hour-partitioned line computation
reads `locked_rate` snapshots from the Subscription Change ledger and metered overage from Usage
Rollup; that data exists only in Central. ERPNext can post an invoice. It cannot derive one.

And it keeps the run working when frappe.io does not. A drafting phase that depends on a remote site
is a month that stops when someone else deploys.

### 2. The issue call is durable intent, not a sync (this buys *authenticity*)

Issuing is an irreversible external act — a submitted Sales Invoice with a consumed series number is
not undoable, only reversible by credit note. It therefore obeys ADR 0017 exactly as a card charge
does: commit the intent, make the call, record the outcome. It is not modelled on
`erpnext_sync.py`'s fire-and-retry, which is safe only because it runs *after* settlement and can be
abandoned.

`erpnext_sync.py`'s `_handle_failure` gives up after `MAX_ATTEMPTS` and alerts ops. Issue may not:
an invoice that failed to issue is a customer who was not billed. An unresolved issue intent is a
question the system must answer, and reconciliation answers it by asking ERPNext whether a Sales
Invoice exists for the key — the same shape as `payments/reconciliation.py` asking the gateway about
an `Initiated` attempt.

### 3. `period_key` is the remote idempotency key (this buys *reproducibility*)

The key we send is `period_key` — already `(team, period_start, period_end)`, already unique, already
derived from the business fact rather than from a docname. ERPNext carries it on a custom field with
its own unique index, so a replayed POST returns the existing Sales Invoice instead of minting a
second one. The uniqueness constraint exists on **both** sides, keyed on the same fact. Neither side
trusts the other's retry logic.

This is why `period_key` and not the Central invoice name: a cancel-and-reissue replaces the invoice
name but must not look like a new billable period.

### 4. Wallet money moves into ERPNext as an advance

ERPNext can only settle against an advance it can see. So a captured top-up writes **both**: a
`Credit Ledger Entry` in Central and an advance Payment Entry in ERPNext, pushed at capture time.
The push is idempotent on `gateway_payment_id`, which `revenue/credits.py` already treats as the
uniqueness key for exactly this reason — the confirm callback and the webhook race to credit the same
payment, and exactly one wins.

**ERPNext becomes the ledger of record for advances; Central's Credit Wallet becomes a read model** —
what the customer sees in the dashboard, and what the trust-tier caps are evaluated against. Its
`CHECK (balance >= 0)` and per-wallet `FOR UPDATE` anchor stay exactly as they are, because a read
model that can go negative is still a bug.

Two ledgers for one pot of money means a new invariant, in the ADR 0018 sense: **Central's wallet
balance equals ERPNext's advance balance for that customer**, audited on a schedule, violations
surfaced rather than silently tolerated. This is the real cost of the decision and it should be paid
deliberately.

The credits *waterfall* moves with the ledger. Central stops deciding how much credit to apply;
it sends the lines, and ERPNext returns `outstanding_amount` with the advance already applied.
`open_and_collect`'s leg 1 becomes a read of that figure rather than a computation of it.

### 5. Corrections become credit notes once issued

`cancel_invoice` may cancel a Draft freely — nothing statutory has happened. Once the Sales Invoice
is submitted, cancellation is a credit note in ERPNext, and `reissue_invoice` becomes
credit-note-then-reissue. The existing rule that issued line items are never mutated is unchanged;
what changes is that the reversal now has to exist in someone else's books too.

## Considered Options

- **Keep the current sync-after-`Paid`.** Rejected: it charges the customer before the books have
  computed tax or applied advances, and leaves two numbering authorities for one sale. It is the
  right design only while Cloud Billing is the system of record for tax, which is the premise being
  abandoned.

- **Create invoices directly on ERPNext, no local draft.** Rejected on four counts: the
  double-billing invariant would move off-box and become HTTP-dependent; the run would stop when the
  remote site does; there would be no local durable intent to charge against, reconcile, or report
  `billing_run_status` from; and ERPNext cannot compute the lines anyway, since the locked-rate
  segments live in Central.

- **Central mints the four statutory series itself, ERPNext mirrors.** Rejected: it keeps a GST engine
  and a numbering authority in Central, which is the duplication this decision exists to remove. It
  also concentrates all four series on one `tabSeries` row per month in Central's database — measured
  at ~6ms of held lock per insert, a hard ceiling of ~169 invoices/sec however many workers are added.
  Four series in ERPNext is four lock rows.

- **Treat wallet credit as a discount line rather than an advance.** Rejected: it makes the accounting
  integration trivial but changes what a credit *is*. Money held on account that can be refunded is
  not a discount, and refund and expiry semantics become unstateable.

- **Central applies credit itself and tells ERPNext the net.** Rejected: it is the smallest change and
  keeps the wallet invariants purely local, but it leaves settlement logic in two places — which is
  the drift this decision is about.

## Consequences

- **The run becomes three phases.** Draft, issue, collect. Issue is its own fan-out phase with its
  own page jobs, retries and reconciliation, so a remote outage delays issuing without touching
  rating or the invoices already issued. The billing queue's worker count now caps load on ERPNext as
  well as on the gateway — one dial, three consumers.

- **`revenue/tax.py` is demoted to estimates.** It keeps serving the forecast and cost-explorer APIs,
  clearly labelled as estimates, and stops putting numbers on the invoice. Any divergence between its
  estimate and ERPNext's computation is a UI discrepancy, not a billing error.

- **Central's invoice number becomes internal.** `INV-YYYY-MM-#####` remains as the rating record's
  handle; the customer-facing document, the PDF and every notification carry the ERPNext number.
  Central's `tabSeries` row stops being on the statutory path, and the ~169/sec ceiling it imposes
  stops mattering — the equivalent ceiling now lives in ERPNext, spread over four series.

- **Collection charges a number it did not compute.** `expected_collection` becomes
  `outstanding_amount` as returned by ERPNext. An invoice that has not issued cannot be collected,
  which is a new precondition on `open_and_collect` and a new reason for an invoice to sit unbilled.

- **A new failure mode: issued but unrecorded.** ERPNext submitted the Sales Invoice; Central lost the
  response. Reconciliation resolves it by querying ERPNext for the `period_key`, exactly as the
  payment sweeper queries the gateway. Until it does, the invoice is not collectable — correctly.

- **Dunning is unaffected in shape, and its fairness rule extends.** `dunning_starts_on` already
  guarantees that our own delay never starts the customer's escalation clock; an ERPNext outage that
  delays issuing is another delay of ours, and defers it the same way.

- **Trial `cost_report` invoices still never reach ERPNext.** They are a computed subsidy cost, not a
  sale. `sync_invoice`'s existing `not_billable` guard becomes the issue phase's guard.

- **ERPNext capacity becomes the run's real bottleneck.** A million submitted Sales Invoices a month,
  each writing GL entries, is a sizing exercise on that server, and the issue API should accept
  batches so one HTTP round-trip covers many invoices.

- **Refunds follow.** `payments/refunds.py`'s dispute-to-source and overcharge-to-wallet paths both
  need a credit note in ERPNext, and the wallet leg needs the mirrored advance adjusted.

## Supersedes / amends

- Amends [issue #17](../../issues/17-erpnext-async-sync.md) and `revenue/erpnext_sync.py`: the push moves
  from after-`Paid` to before-collection, and stops being abandonable.
- Applies [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md) to a third irreversible
  act: submitting a statutory document on another system.
- Extends [ADR 0018](0018-invariants-are-enforced-not-observed.md) with a cross-system invariant —
  Central's wallet balance equals ERPNext's advance balance — which no database constraint can hold
  and which therefore belongs in the scheduled audit.
- Amends [ADR 0010](0010-price-lock-folded-into-subscription-change.md) not at all: the locked-rate
  ledger is exactly the rating input this decision keeps in Central.
- Reduces the scope of the tax mechanics in [issue #13](../../issues/13-tax-gst-sez-tds-seam.md) from
  authority to estimate.
