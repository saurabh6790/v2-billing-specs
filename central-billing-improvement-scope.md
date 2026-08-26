# Central billing — benchmark against best-in-class & scope of improvements

Original review: 2026-07-14. **Re-validated 2026-07-21** against
`apps/central/central/billing` on `develop` (code read + live-DB index inspection).
Since the first pass, two of the three "money is safe" workstreams have shipped
(**W1 security** via PR #173, **W2 durable intent** via PR #172); this revision marks
what is now in the tree and re-sequences the rest. Companion docs:
[central-billing-review-notes.md](central-billing-review-notes.md) (module debt sweep),
[central-audit-remediation.md](central-audit-remediation.md) (security findings — done),
ADRs [0016](docs/adr/0016-billing-event-stream-and-single-transition-authority.md) /
[0017](docs/adr/0017-durable-intent-before-irreversible-side-effects.md) /
[0018](docs/adr/0018-invariants-are-enforced-not-observed.md) (reliability decisions).

---

## 1. The bar — what the best billing platforms do

The platforms worth benchmarking against, and what each is best at:

| Platform | Segment | What it does exceptionally well |
|---|---|---|
| **Stripe Billing** | SaaS subscriptions + usage | Gateway-native correctness: idempotency keys on every mutation, webhooks as the single settlement truth, Smart Retries (ML-timed dunning), test clocks for simulating billing time. Revenue Recognition (ASC 606) as a product. |
| **Zuora** | Enterprise revenue lifecycle | Rating engine with full re-rating (amendments retroactively recompute), order-to-revenue audit chain, SOX-friendly controls, revenue recognition, ERP integrations. The audit/compliance gold standard. |
| **Chargebee / Recurly** | Mid-market SaaS | Catalog breadth (plans/add-ons/coupons/entitlements), dunning recovery analytics, churn/MRR analytics out of the box, hosted checkout flows. |
| **Metronome / Orb** | Usage-based (infra/AI companies) | Event ingestion at billions of events/month with exactly-once dedup (idempotency key per event), late-event grace windows, **re-rating/backfill as a first-class op** (replay events against corrected prices), real-time spend APIs for customer dashboards, budgets/alerts. |
| **Lago / Kill Bill** | Open source | Clean plugin/adapter seams (payment providers, taxes), event-sourced invoice construction, append-only ledgers; Kill Bill's per-account audit log records every state transition with who/what/when. |

Distilled, "best in class" means five properties:

1. **Offering** — hybrid pricing (flat + seats + usage + commitments + credits/prepaid),
   entitlements, trials, coupons, multi-currency, tax integration, customer-facing
   spend visibility (live usage, forecasts, budgets/alerts).
2. **Efficiency** — metering ingestion horizontally scalable (dedup at the edge,
   aggregation before rating); invoice generation as fan-out jobs, never a monolithic
   run; rating decoupled from collection.
3. **Correctness** — money moves only under a durably-committed intent with a
   deterministic idempotency key; webhook is the settlement truth; append-only ledgers
   with enforced (not observed) invariants; reconciliation against the gateway as a
   scheduled control; re-rating possible without mutating history (cancel+reissue or
   versioned rating).
4. **Metrics** — *internal*: MRR/ARR/NRR, churn (voluntary vs involuntary), collection
   rate, gateway auth rate, dunning recovery, AR aging, days-to-collect, billing-run
   SLOs, webhook lag. *External (customer)*: current spend, forecast, usage by
   resource, invoice history, budget alerts.
5. **Audits** — SOC 1/SOC 2 posture: immutable audit trail on every money document,
   no unauthorized mutation path, PCI scope pushed to the gateway (tokens only),
   statutory system-of-record export (their ERP or ours), and controls that are
   *mechanical* (CI/DB-enforced), not prose.

## 2. Where central/billing stands (re-validated 2026-07-21)

### Genuinely strong (at or above the bar)

- **Domain model.** `Subscription` (intent) + append-only `Subscription Change`
  carrying `locked_rate` is a versioned rating ledger — the same shape Metronome/Orb
  use for grandfathering. Day/hour partitioned line computation (`revenue/invoicing/lines.py`)
  closes sub-day gaming and is well-reasoned.
- **Ledger discipline.** `Credit Ledger Entry` (append-only) + `Credit Wallet`
  per-(team,currency) PK lock anchor, with a DB `CHECK (balance >= 0)` re-asserted on
  every migrate (`platform/constraints.py`, ADR 0018). The deadlock analysis in
  `revenue/credits.py` is better than most commercial systems document.
- **Settlement truth.** Signature-first webhooks, unique `gateway_event_id` dedupe,
  `apply_webhook` as the *only* path to `Paid`, idempotent under a row lock. Correct.
- **Idempotent drafting.** Unique `period_key` on `tabInvoice` backs the one-invoice-
  per-(team, period) invariant at the DB rung, and consolidated per-team invoices cap
  invoice volume at team count.
- **✅ Durable intent (NEW — PR #172, ADR 0017).** `pay_invoice` now splits into
  *claim* (save + `frappe.db.commit()` the `Initiated` Payment Attempt under the
  invoice `FOR UPDATE`) and *charge* (call the gateway, then record the outcome). The
  idempotency key is `hash(invoice, retry_number)` (`payment_attempt.idempotency_key`),
  derived from business facts, not the random docname. A crash after the charge leaves
  a durable `Initiated` row and the *same* key recomputes on retry, so the gateway
  replays instead of double-charging. The claim commit releases the invoice lock before
  the HTTP call, so capture webhooks never queue behind it. **This closes the old G1.**
- **✅ Reconciliation as a scheduled control (NEW).** `payments/reconciliation.py:
  run_reconciliation` is on the daily scheduler and sweeps `("Initiated", "Authorised")`
  attempts past a staleness cutoff plus `Captured`-but-unsettled attempts, asking the
  gateway for the real status — the sweep that makes durable-intent's committed rows
  actionable.
- **✅ Security layering (NEW — PR #173).** The ten whitelist-boundary findings are
  remediated: credit minting, payment-method IDOR, forced charges, plan authoring,
  ERPNext-sync-over-HTTP are all de-whitelisted behind `billing/api/**`; the pilot API
  restores the session user after acting as operator; `tests/test_whitelist_boundary.py`
  is a CI gate that fails if any `@frappe.whitelist` appears outside the API layer.
  **This closes the old G6.**
- **✅ Enforced invariants on the scheduler (NEW).** ADR-0018's
  `platform.invariants.run_invariant_audit` (the money checks no DB constraint can
  hold) runs daily — the C1/C2 control the first pass wanted scheduled.
- **Pluggability.** The `GatewayAdapter` seam (Stripe/Razorpay/PayPal), polymorphic
  catalog (ADR 0007), metered plans as single-resource Plans (ADR 0008), and dual
  reporting modes (ADR 0015) mean new gateways, product families, and meters slot in
  without schema surgery.
- **Offering.** Hybrid pricing, commitments with clawback, credits waterfall, trust
  tiers, trials-as-cost-reports, GST/SEZ/TDS, multi-currency, customer forecast API,
  15 internal desk reports + number cards. Feature surface is competitive with
  mid-market platforms.

### Below the bar — the gaps that remain open

The scale and audit tiers are still open. Verified against current `develop`:

**G2. The monthly run cannot do 10M ops — STILL OPEN.** `run_monthly_billing`
(`revenue/invoicing/lifecycle.py:112`) calls `generate_draft_invoices()` then
`open_drafts(period_end)` **inline, sequentially, in one scheduler job** — `open_drafts`
takes an `enqueue` flag but `run_monthly_billing` calls it with the default `False`, so
the fan-out path exists but is unused. One process drafts every team, then opens and
collects every invoice *including synchronous gateway HTTP calls* in the same tick, and
both phases run on the same day (no 28th-draft / 1st-collect split). At ~2s per
collected invoice, 50k teams ≈ 28h in a single job. Durable intent (W2) now bounds the
blast radius of a crash to one attempt, but the run itself is still monolithic.

**G3. Missing indexes on every hot money table — STILL OPEN** (verified: no
`search_index` on the `Invoice`, `Payment Attempt`, `Usage Rollup`, or `Subscription`
doctype fields):

| Table | Has | Missing (per query shape) |
|---|---|---|
| `tabInvoice` | PK, creation, `period_key` (unique) | `(team)`, `(status, period_end)` — open_drafts, dunning, admin lists |
| `tabPayment Attempt` | PK, creation, `idempotency_key` | `(gateway_transaction_id)` — **every webhook settlement and the reconciliation sweep is a full scan**; `(invoice, status)` — in-flight check on every charge |
| `tabUsage Rollup` | PK, creation, `idempotency_key` | `(team, cluster, period_start)` — per-team scan of the whole table at invoice time |
| `tabSubscription` | PK, creation | `(team)` — read on every provision/price/draft |
| `tabWebhook Event` | PK, creation, `gateway_event_id` | `(status, creation)` for pruning (minor) |

`tabCredit Ledger Entry` still carries the **redundant duplicate index** on
`gateway_payment_id` — it is declared both `unique` *and* `search_index`; drop the
non-unique one. Reconciliation's dependence on `gateway_transaction_id` (unindexed)
makes G3 a correctness-of-latency issue now, not just throughput.

**G4. N+1 query shapes on the rating path — STILL OPEN.** `compute_line_items`
(`revenue/invoicing/lines.py:39`) filters subscriptions with a per-subscription
`frappe.db.get_value("Asset", s.asset_id, "cluster")` and then a per-subscription
`frappe.get_all` of changes; `metered_line_items` resolves `_metered_plan_for()` per
rollup row; `generate_draft_invoices` loads all subscriptions into memory to pick
primaries; `team_run_rate` N+1 (review-notes §2). Fine at 200 teams, hostile at 50k.

**G5. Audit trail below audit-grade — STILL OPEN.** `track_changes` is unset (0) on
Invoice, Payment Attempt, and Webhook Event; Invoice is not submittable and every
transition is `doc.save(ignore_permissions=True)` — there is no single guarded
transition authority (ADR 0016 designed this; not built). A Desk user with write
permission could edit a Paid invoice's amount and nothing would record it. The
cancel+reissue policy is right, but nothing *enforces* line-item immutability after
Draft. Retention split (gateway logs pruned at 90 days by `cleanup_payment_logs`;
Invoice/ledger forever; ERPNext as statutory SOR) is the actual behaviour but is not
written up in an ADR.

**G7. Float money — STILL OPEN.** Amounts are Python floats rounded with `flt(x, 2)` at
each step (MariaDB stores Currency as DECIMAL, but arithmetic happens in float).
Line-item sums, day-weighted divisions (`days * rate / day_units`), commitment/tax
stacking all accumulate representation error, masked today by 2dp rounding. `subtotal ≠
Σ(items)` off-by-a-paisa is how this class surfaces. No `money.py` module exists.

**G8. Operational metrics & SLOs — PARTIALLY CLOSED, MOSTLY OPEN.** The two *controls*
the first pass asked for are now scheduled (invariant audit daily, reconciliation
daily). Still missing: any billing-run telemetry — nothing emits drafted/opened/
collected/failed counts, webhook processing lag, gateway auth rate, or dunning recovery;
no `Billing Run` summary doctype; no operator alert on non-zero `Failed` webhooks > 1h
old or stale `Initiated` attempts. A silent half-failed run is still discovered by
customers, not by a page.

**G9. No re-rating/backfill story — STILL OPEN.** Cancel+reissue handles single-invoice
corrections, but "we mispriced SSD in June for 400 teams" has no bulk replay; Usage
Rollup terms are locked at ingest with no audited override path.

**G10. Dependability hygiene — MUST RE-VERIFY.** The suite (65 files, ~300 tests) was
red on develop during the reliability work; #172/#173 added tests and merged green PRs,
so its current colour must be re-confirmed on the test site before it can be a merge
gate. There is still no load test; nothing has executed a 10k-team run.

## 3. Verdicts against the questions asked

| Question | Verdict (2026-07-21) |
|---|---|
| Doctype design correct? | **Yes.** Intent + append-only change ledger + consolidated invoice + attempt/webhook/ledger is the right shape; remaining gaps are execution (G2, G4, G5), not entity design. |
| Maintainable? | **Yes.** Small files, layered packages, exceptional docstrings, ADR trail. Debt is enumerated and localized. |
| Pluggable for new requirements? | **Yes** — proven: adapter seam, polymorphic catalog, metered plans, reporting/settlement modes all added without schema surgery. |
| Dependable? | **Money-safety core: now yes.** Durable intent (G1), gateway reconciliation, security (G6), and scheduled invariant audit have all shipped. **Audit-grade (G5) and green-suite proof (G10) remain open.** |
| 10M billing ops/month? | **Metering ingest: yes** after G3. **Invoice+collection run: not yet** — G2 + G3 + G4 make it a job-orchestration rewrite (not a schema rewrite). The same doctypes handle it with fan-out, commit boundaries, and indexes. |

## 4. Scope of improvements — remaining workstreams, ranked

W1 (security) and W2 (durable intent) are **done**. The remaining work, ordered by
(risk × effort⁻¹): W3 + the N+1/index scale tier first (cheap, unblocks throughput),
then the fan-out run, then audit-grade.

### ✅ W1 — Security remediation — DONE (PR #173)
De-whitelisted domain primitives; `@frappe.whitelist` only under `billing/api/**`;
CI gate `tests/test_whitelist_boundary.py`. See central-audit-remediation.md.

### ✅ W2 — Durable intent before external calls — DONE (PR #172, ADR 0017)
`pay_invoice` claims+commits the `Initiated` attempt before charging; deterministic
`idempotency_key = hash(invoice, retry_number)`; invoice lock released at the claim
commit; `run_reconciliation` sweeps `Initiated`/`Authorised`/`Captured-unsettled` on
the daily scheduler. **Remaining follow-ups folded into later workstreams:** apply the
same claim-then-act pattern to `create_invoice_payment_order`, top-up orders, and the
cluster-manager provision call in `catalog/subscriptions.py` (still hand-rolled
rollback/commit); and index `gateway_transaction_id` so the reconciliation sweep is not
a full scan (→ W3).

### W3 — Indexes + duplicate-index cleanup (small, hours) — DO FIRST
Add via DocType `search_index` (or `frappe.db.add_index` in a patch under
`central/patches/v0_0/`): `Payment Attempt(gateway_transaction_id)`,
`Payment Attempt(invoice, status)`, `Invoice(team)`, `Invoice(status, period_end)`,
`Usage Rollup(team, cluster, period_start)`, `Subscription(team)`. **Drop** the
redundant non-unique `gateway_payment_id` index on Credit Ledger Entry (keep the
unique one). Verify with `EXPLAIN` on the webhook-settlement, reconciliation-sweep, and
`open_drafts` queries. Highest value-per-hour on the board.

### W4 — Billing run as fan-out (medium) — the 10M/month enabler
- `run_monthly_billing` becomes an orchestrator that **enqueues** per-team draft jobs
  (flip `open_drafts(..., enqueue=True)` and add the same for drafting) on a dedicated
  queue; a follow-up tick enqueues `open_and_collect` per invoice once drafting settles.
  Each job = one team = one transaction = one commit.
- Restore the two-phase day split (28th draft / 1st collect) — today both run in the
  same monthly tick.
- Batch the orchestrator's team scan (`limit_start=` pages or a grouped query) instead
  of loading every subscription.
- Add a completion tracker (drafted/opened/failed per period) so a partial run is
  visible and resumable — the idempotency already in place makes resume free. This is
  the seed of the `Billing Run` doctype in W8.
- Throughput target: 50k teams / 20 workers / ~2s ≈ 1.4h; document the worker math in
  the ops runbook.

### W5 — Kill the N+1s on the rating path (small-medium)
- `compute_line_items`: fetch the team's subscriptions + asset clusters in one joined
  query; fetch all changes for the period's subscriptions in one query, group in Python.
- `metered_line_items`: resolve `_metered_plan_for` / settlement / reporting modes once
  per `resource_type` (cache per request), not per rollup; filter rollups by period in
  SQL, not Python.
- Fold in review-notes §2 (`team_run_rate`) and finish ADR 0010 (review-notes §1) so
  "what is this team running" has one batched source.

### W6 — Money arithmetic policy (medium, isolated)
Add a `money.py` doing `Decimal` arithmetic with one rounding policy (round-half-even,
at line level only), used by lines/tax/commitments/settlement — the cheaper of the two
options (vs reviving integer minor units, ADR 0003). Assert `subtotal == Σ items` in
`Invoice.validate` as an ADR-0018 rung-2 invariant. Write it up as an ADR superseding
0003.

### W7 — Transition authority + audit trail (ADR 0016, medium-large)
- One `transition(doc, to_status, actor, reason)` seam for Invoice / Payment Attempt /
  Subscription standing; all writers go through it; it appends to the derived Billing
  Event stream (ADR 0016) and rejects illegal edges (e.g. `Paid → Draft`).
- `track_changes: 1` on Invoice, Payment Attempt, Refund, Credit Ledger Entry.
- Invoice controller: forbid field mutation once status ≠ Draft except via the
  transition seam (rung-2 enforcement); keeps cancel+reissue honest.
- Write the retention split (gateway logs 90 days, Invoice/ledger forever, ERPNext as
  statutory SOR) into an ADR — the behaviour exists; the decision record does not.

### W8 — Operational metrics & controls (medium) — build on the two live controls
- Emit per-run counters (drafted, opened, collected, failed, skipped) + durations to
  `frappe.logger("billing")` in a parseable shape; promote W4's completion tracker to a
  `Billing Run` summary doctype/report per period.
- Alert (email/Team Notification to operators) on invariant-audit violations, non-zero
  `Failed` webhook events older than 1h, and stale `Initiated` attempts past the
  reconciliation window. (The sweeps run; they don't yet page anyone.)
- Internal dashboards on top of existing reports: gateway auth rate over time, dunning
  recovery %, webhook lag, involuntary churn. (Customer-facing metrics — forecast, cost
  explorer, per-resource usage — are already competitive.)

### W9 — Re-rating / bulk backfill (large, later)
Operator flow: given (resource_type, period, corrected rate), reissue affected invoices
via the cancel+reissue path in bulk, with a dry-run diff report and an audit record. Add
a terms-override path for Usage Rollup (new row version, never mutate) so locked terms
stay auditable.

### W10 — Green suite + synthetic scale test (continuous)
- Re-confirm the suite's colour on the test site; make develop green and keep it a merge
  gate.
- A seeded 10k-team synthetic billing run (extend the demo/seed machinery) run per
  release: asserts wall-clock budget, zero invariant violations, resumability after a
  mid-run kill. The only honest answer to "can it handle 10M/month" — measure.

## 5. Sequencing (revised)

```
Now:         W3 (indexes)  +  W10a (re-confirm suite green)   ── cheap, immediate, unblocks throughput
Next:        W5 (N+1s)  +  W4 (fan-out run)                   ── the 10M/month enabler
Then:        W7 (transition authority + audit)                ── audit-grade
Later:       W6 (money policy), W8 (metrics/alerts), W9, W10b (scale test)

Done:        W1 (security, #173),  W2 (durable intent, #172)
```

The money-safety tier (W1 + W2) has landed: money now moves only under a durably
committed intent with a deterministic key, and a scheduled reconciliation + invariant
audit watch it. The schema itself still needs almost nothing — indexes, `track_changes`,
one `subtotal == Σ` constraint. The remaining investment is **execution at scale**:
fan-out orchestration, killing the rating-path N+1s, one transition authority, and
turning the two live controls into ones that page a human. That is the gap between a
correct, money-safe design and a dependable platform that is demonstrably the best on
the Frappe stack.
