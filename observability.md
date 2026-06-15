# Observability

## Purpose

The living observability standard for Frappe Cloud v2 Billing. Like [security.md](security.md), it
serves two audiences from one document:

- **Build by it** — every new money path, gateway call, webhook handler, scheduled job, or ledger
  mutation emits the metrics named here *as part of the change*, not bolted on later. The
  "How to extend safely" rules (§10) are the checklist you follow *before* merging a new seam.
- **Operate and report by it** — §3–§9 are the metric catalogue ops watches to trace errors and
  catch edge cases, and §8 is what management reads. The **Coverage checklist** (§11) is a concrete,
  mostly greppable set of checks that confirms every money-moving seam is instrumented.

This is not generic "add Prometheus" boilerplate. It is keyed to *this system's* surfaces and to the
specific v1 blind spots v2 was built to close. Where a metric is emitted from code, the canonical
seam is named — keep this doc in sync when that seam moves.

> Scope: the **Cloud Billing** module inside Central (no Subscription Agent — [ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)). Framework-level
> telemetry (worker queue depth, Redis, MariaDB, HTTP) is assumed from the platform and only
> re-specified where billing puts unusual load on it (e.g. wallet-row lock contention).

## 1. What v1 couldn't see (the blind-spot baseline)

v2's observability posture is defined by the failures v1 suffered *in the dark* — each was detected
by a customer or an auditor, not by a metric. Every one maps to a standing signal here; coverage's
first job is proving each blind spot is now lit.

| v1 blind spot | Class | v2 signal (canonical seam) | § |
|---------------|-------|----------------------------|---|
| Money drifted from floats; nobody knew until reconciliation | Integrity | `money.rounding_applied`, `invoice.line_sum_mismatch` | §3 |
| Credit double-spend under load — found by a support ticket | Race / integrity | `wallet.lock_wait`, `ledger.balance_drift` | §3, §6 |
| Charged-at-gateway-but-never-webhooked sat invisible for weeks | Settlement gap | `payment_attempt.stuck_pending`, `recon.unresolved` | §5, §7 |
| A dead cron (invoicing) was noticed when bills didn't go out | Silent job death | `scheduler.job_last_success_age` | §7 |
| Mandate cap drifted below trust tier after promotion → silent decline | Time-bomb | `mandate.cap_vs_tier_mismatch`, `mandate.reauth_required` | §5 |
| Gateway latency/error spikes seen only as customer complaints | Dependency health | `gateway.api_error`, `webhook.signature_invalid` | §4 |
| "Are we growing?" answered from a hand-built spreadsheet | No business plane | §8 business metrics, computed from the ledger | §8 |

## 2. The two-plane model

Billing observability splits into two planes with **different sources, stores, and trust levels**.
Conflating them is the central mistake — a runtime counter is not an auditable revenue figure.

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  PLANE A — Runtime telemetry (operational)                           │
  │  source: app seams (charge, webhook, adapter, job, lock)             │
  │  emitter: billing/platform/metrics.py  →  StatsD/Prometheus          │
  │  store: TSDB (ephemeral, ~13mo)   trust: best-effort, may drop        │
  │  audience: devs / ops   question: "is the machine healthy right now?" │
  └─────────────────────────────────────────────────────────────────────┘
  ┌─────────────────────────────────────────────────────────────────────┐
  │  PLANE B — Business metrics (financial)                              │
  │  source: the SOR — Invoice, Credit Ledger Entry, Payment Attempt     │
  │  emitter: scheduled rollup → Metric Snapshot DocType (append-only)    │
  │  store: MariaDB (permanent, auditable)   trust: restatable, exact     │
  │  audience: management / finance   question: "what is true about money?"│
  └─────────────────────────────────────────────────────────────────────┘
```

**Why two planes, not one:**

- **Plane A is allowed to lie a little.** A dropped StatsD packet costs nothing; we trade exactness
  for zero latency on the hot path. Emission is **fire-and-forget** and must never throw into a
  money path (§10). You never reconstruct revenue from Plane A.
- **Plane B must never lie.** Every figure is **derived from the ledger** (the system of record),
  stored append-only, and **restatable** — recompute the same period later and you get the same
  number, or you can prove why it changed. A management metric is a *query over the SOR frozen into
  a row*, never a runtime counter scraped from an app process.

The rule of thumb: **if it would appear in a board deck or an audit, it is Plane B.** Everything
else — rates, latencies, error counts, queue depths — is Plane A.

## 3. Plane B data model — `Metric Snapshot`

The auditable plane needs exactly one new DocType. It is append-only and immutable after write,
like [Credit Ledger Entry](credits.md).

**Metric Snapshot** (Central DocType, append-only)

| Field | Type | Notes |
|-------|------|-------|
| `metric_key` | Data | Stable slug, e.g. `mrr`, `net_new_mrr`, `dunning_recovery_rate`. The contract — never renamed; deprecate and add. |
| `grain` | Select | `day` / `month` — the period the value covers. |
| `period_start` / `period_end` | Date | Half-open `[start, end)`. |
| `dimension` | Data | Bounded slice key, e.g. `region=IN`, `currency=INR`, `plan=bundle-2vcpu`, or `all`. One row per (metric, period, dimension). |
| `value_minor` | Long Int | Money metrics only — **minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)). Null for ratios/counts. |
| `value_num` | Float | Non-money values (rates, counts, ratios as 0–1). Null for money. |
| `currency` | Link | Set when `value_minor` is set; null otherwise. A money metric is **never** summed across currencies — report per currency, convert at presentation only. |
| `source_query_hash` | Data | Hash of the SQL/qb that produced the value — lets a later run prove it used the same definition. |
| `computed_at` | Datetime | When this snapshot was taken. |
| `is_restatement` | Check | True when this row supersedes an earlier snapshot for the same (key, period, dimension); the prior row is kept (append-only), never updated. |

**Invariants**

- A money snapshot carries `value_minor` + `currency` and a null `value_num`; a non-money snapshot
  is the inverse. Enforced in `validate`.
- `(metric_key, grain, period_start, dimension, computed_at)` is unique — re-running the rollup
  writes a **new** row (`is_restatement=1`) rather than mutating; the dashboard reads the latest
  `computed_at` per key/period/dimension.
- No `value_minor` is ever produced by float arithmetic — money metrics are summed from integer
  ledger/invoice columns.

**How rows are created** — a scheduled job, `metrics.rollup_business_metrics`:

- **Daily** at period close-adjacent time, writes `grain=day` snapshots for the prior day.
- **Monthly** writes `grain=month` for the closed month and **re-snapshots the trailing 3 months**
  as restatements (late refunds, dunning recoveries, and disputes change history; the restatement
  trail makes that visible instead of silently mutating last month's MRR).
- Each metric's definition is one function in `billing/reports/metrics/` returning
  `(value, dimension)` rows from a QueryBuilder query over the SOR. The function *is* the
  definition; `source_query_hash` is taken from its compiled SQL.

## 4. Plane A — gateway & webhook spine

Source seams: the GatewayAdapter port (`billing/gateways/`), the webhook entrypoint
([payments.md](payments.md), [security.md](security.md) §3). Emit via `billing/platform/metrics.py`.

| Metric | Type | Labels | Source seam | Catches / why |
|--------|------|--------|-------------|----------------|
| `webhook.received` | counter | `gateway, event_type` | webhook entry, post-signature | Baseline; a sudden drop = gateway not reaching us (the #1 silent settlement outage). |
| `webhook.signature_invalid` | counter | `gateway` | signature check (§3, *before* DB) | Spoofing **or** a rotated signing secret nobody updated. Pairs with the security audit. |
| `webhook.duplicate_dropped` | counter | `gateway` | idempotency dedupe (#22) | Dedupe working. A flat **zero** is suspicious — gateways always retry. |
| `webhook.out_of_order` | counter | `gateway` | state machine guard | `paid` before `created` — the classic edge case that corrupts attempt state. |
| `webhook.unhandled_event_type` | counter | `gateway, event_type` | handler dispatch default | Gateway shipped a new event we silently ignore. |
| `webhook.processing_latency` | timer | `gateway, event_type` | handler wrap | Slow handlers → gateway retry storms → flood. |
| `gateway.api_latency` | timer | `gateway, op` | adapter call wrap | Dependency health; tail latency drives our timeouts. |
| `gateway.api_error` | counter | `gateway, op, code` | adapter except path | Split 4xx (our request bug) from 5xx (their outage) by `code`. |
| `gateway.adapter_contract_violation` | counter | `gateway, op` | adapter return validation | Adapter returned a shape the seam doesn't expect — guards the port abstraction so a new adapter (#25 PayPal) can't quietly break the contract. |

**How it improves performance:** `gateway.api_latency` p95/p99 and `webhook.processing_latency` are
the inputs to setting adapter timeouts and to deciding gateway routing (#24) — you route away from a
gateway whose tail is dragging the charge loop. `webhook.received` rate vs `payment_attempt.created`
rate exposes a backlog before workers saturate.

## 5. Plane A — payments, mandates, dunning

Source seams: `charges.py` / `charges._settle_invoice`, Payment Attempt transitions, the dunning
job, the fallback path (`collection.py`, #28), mandate lifecycle (#05/#08).

| Metric | Type | Labels | Catches / why |
|--------|------|--------|----------------|
| `payment_attempt.created` | counter | `gateway, method` | Charge volume baseline. |
| `payment_attempt.outcome` | counter | `result` (`succeeded`/`failed`/`pending`/`timeout`) | The core conversion funnel; `failed` rate by method drives routing. |
| `payment_attempt.webhook_wait` | timer | `gateway` | Attempt → terminal webhook latency. Long tail feeds the reconciliation grace window (§7). |
| `payment_attempt.stuck_pending` | gauge | `gateway` | Attempts past the 30-min grace ([#21](issues/21-reconciliation-job.md)) — the charged-but-never-webhooked population *before* recon resolves it. The lit version of v1's worst blind spot. |
| `dunning.retry` | counter | `day` (1/3/7) | Retry cadence actually firing — a zero on day 3 = dead cron. |
| `dunning.escalation` | counter | `from, to` | `overdue→past_due→suspend→terminate` ([dunning](issues/14-retry-dunning-suspension.md)). Suspend rate is also a management churn-risk input. |
| `payment_method.fallback_used` | counter | — | Secondary method engaged (#28); a spike = primary methods degrading. |
| `payment_method.fallback_exhausted` | counter | — | All methods failed — escalate, don't repeat. Feeds involuntary-churn risk. |
| `payment_method.dedup_card_collision` | counter | — | Same card added twice (#28 dedup) — guard working. |
| `mandate.cap_vs_tier_mismatch` | gauge | `gateway` | UPI Autopay `effective_cap` < trust-tier cap after promotion without re-auth (#08) — the silent-decline time bomb. |
| `mandate.reauth_required` | gauge | — | Promoted customers awaiting re-auth — charges *will* fail until cleared. |
| `mandate.expiring_soon` | gauge | `days_bucket` (7/30) | Proactive — mandates expiring drive churn-by-neglect. |

**How it helps dev vs management:** devs read `payment_attempt.outcome{result=failed}` and
`gateway.api_error` together to localise a failure to *us* vs *the gateway*; management reads the
same funnel as **collection success rate** (§8) and **involuntary churn**.

## 6. Plane A — credits, wallet, metering, money integrity

Source seams: Credit Ledger Entry + Credit Wallet anchor (`credits.py`, #06/#11), the money module
(#34, [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)), invoice assembly (#09), Usage
Meter rollup (#12).

**Money integrity — the non-negotiable sub-tier.** These should be *structurally impossible* to
trip; any non-zero value pages **and** surfaces on a board management can see, because trust in the
number *is* the product.

| Metric | Type | Catches / why |
|--------|------|----------------|
| `money.rounding_applied` | counter | Rounding happening more than once per invoice (ADR 0003: round **once**). A rate > 1 per line = double-rounding bug. |
| `money.minor_unit_factor_miss` | counter | A currency hit the ISO-4217 factor table with no entry → silent mis-scaling. Must be 0. |
| `invoice.line_sum_mismatch` | counter | Σ(line items) ≠ invoice total — should be impossible; >0 = assembly math bug. |
| `ledger.balance_drift` | counter | Wallet anchor balance ≠ Σ(append-only ledger entries) — the canary for the wallet/ledger split. |
| `payment.amount_vs_invoice_mismatch` | counter | Amount captured ≠ amount owed — FX/minor-unit boundary bug (#38). |
| `erpnext.push_amount_mismatch` | counter | Amount pushed to Sales Invoice ≠ Paid invoice amount (#39 boundary). |

**Credit & wallet operational**

| Metric | Type | Labels | Catches / why |
|--------|------|--------|----------------|
| `credit.applied_minor` | counter | `source` | Credits-then-card waterfall applying credits first (#11). |
| `credit.waterfall_cap_hit` | counter | — | `min(tier, wallet)` credits-only cap engaging — validates the gate. |
| `wallet.lock_wait` | timer | — | `SELECT … FOR UPDATE` contention on the wallet anchor — the known concurrency gotcha. Rising p95 = throughput cliff approaching. |
| `wallet.lock_timeout` | counter | — | Deadlocks/timeouts under concurrent settlement (the v1 double-spend race, now lit). |
| `credit.settlement_source_gate_block` | counter | — | Settlement attempted from a disallowed source — guard working. |

**Metering** (cluster-manager seam → recorded by Central, [metering.md](metering.md), #12)

| Metric | Type | Labels | Catches / why |
|--------|------|--------|----------------|
| `usage.events_ingested` | counter | `meter` | Edge ingestion baseline. |
| `usage.rollup_lag` | gauge | — | Central rollup falling behind edge → under-billing risk. |
| `usage.late_event` | counter | — | Events after the window closed — the metering edge case (idempotent re-push *replaces*). |
| `usage.counter_decreased` | counter | `meter` | A counter went backwards — reset/clock issue at the edge (counter vs gauge confusion). |
| `usage.allowance_clamp` | counter | — | `max(0, qty − allowance)` clamped to zero — sanity on free-allowance logic. |
| `usage.rollup_vs_edge_drift` | gauge | — | Σ(central rollup) vs Σ(edge counters) — metering reconciliation. |

**How it improves performance:** `wallet.lock_wait` is the single most important throughput signal —
it tells you when serialised wallet access (correct, but a bottleneck) is the limiter on the
invoice run, and whether the #22 1000-subscription target holds. `usage.rollup_lag` bounds how stale
the forecast (§8 / [#18](issues/18-customer-dashboard-forecast.md)) can be.

## 7. Plane A — invoicing, tax, refunds, sync, jobs

| Metric | Type | Labels | Source / why |
|--------|------|--------|--------------|
| `invoice.generated` | counter | `type` (`postpaid`/`cost_report`/`prepaid`) | Generation volume; `cost_report` is the trial path (#16, compute-don't-charge). |
| `invoice.price_lock_segments` | histogram | — | Two-phase generation from price-lock segments (#03/#09) — abnormal counts = grandfathering bug. |
| `tax.gst_applied` / `tax.sez_zero` / `tax.tds_withheld` | counter | `region` | Each of the three tax mechanics (#13) firing where expected. |
| `tax.profile_missing` | counter | — | Invoice generated with no Tax Profile resolved — compliance gap. |
| `refund.issued` | counter | `kind` (`dispute_source`/`overcharge_wallet`) | The two refund shapes (#15). |
| `refund.invoice_invariant_break` | counter | — | Invoice left `Paid` on full dispute as designed — alerts if not. |
| `erpnext.sync_attempt` | counter | `result` | One-way Paid→Sales Invoice push (#17). |
| `erpnext.sync_backlog` | gauge | — | Failed pushes awaiting backoff retry — must stay bounded (sync never rolls back the invoice). |
| `erpnext.sync_retry_exhausted` | counter | — | Permanently failed pushes needing HITL. |
| `recon.discrepancy_found` | counter | `kind` | Charged-but-never-webhooked drift detected (#21). |
| `recon.unresolved` | gauge | — | Discrepancies awaiting `resolved_by` HITL decision — must trend to 0. |
| `scheduler.job_last_success_age` | gauge | `job` | **Every** scheduled job (invoicing, dunning, rollup, recon, sync, metrics). Silent cron death is the #1 billing outage class; alert when age > 2× the job's interval. |
| `notification.send` | counter | `channel, result` | Cloud Billing as sole sender (#20) — a failed send means a customer is blindsided by suspension. |
| `authz.guard_denied` | counter | `role, endpoint` | Permission-guard denials (`billing/platform/security.py`, #22) — a spike = a principal with no billing capability probing customer/admin endpoints. |

## 8. Plane B — management & finance metrics

All computed from the SOR by `metrics.rollup_business_metrics` (§3), stored as `Metric Snapshot`
rows, surfaced on the [admin dashboard](issues/19-admin-dashboard.md). Money metrics are **per
currency**; presentation may convert, the stored figure never does.

**Revenue & growth**

| `metric_key` | Definition (over the SOR) | Why management cares |
|--------------|---------------------------|----------------------|
| `mrr` / `arr` | Σ active recurring invoice value, normalised to month | The headline. |
| `net_new_mrr` | Decomposed into `new` / `expansion` / `contraction` / `churned` dimensions | *Where* growth comes from, not just whether. |
| `committed_revenue` | Σ active Commitment spend-floors (#30, [ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md)) | Contracted floor vs realised. |
| `clawback_exposure` | Σ unmet commitments at risk of clawback (#31) | Downside risk on commitments. |
| `gmv_billed` | Σ invoice totals in period, by `region`/`currency` | Top-line throughput. |
| `revenue_realized_vs_forecast` | Realised vs forecast (#18) | Forecast accuracy. |

**Retention & risk**

| `metric_key` | Definition | Why |
|--------------|------------|-----|
| `gross_revenue_churn` / `net_revenue_churn` | Lost (and net-of-expansion) recurring revenue / opening MRR | Core SaaS health. |
| `trial_conversion_rate` | `convert_to_paid` count / trials started (#16) | Funnel efficiency. |
| `involuntary_churn` | Terminations reached via dunning (#14) vs voluntary | Usually *recoverable* money — worth isolating. |
| `dunning_recovery_rate` | past_due invoices eventually `Paid` / entered past_due | How much the retry ladder saves. |

**Cash, collections & cost**

| `metric_key` | Definition | Why |
|--------------|------------|-----|
| `dso` | Days sales outstanding | Cash-conversion speed. |
| `ar_aging` | Open invoice value bucketed `current`/`30`/`60`/`90+` | Collections priority. |
| `collection_success_rate` | Paid attempts / attempts, by `gateway` & `method` | Routing decisions (#24); card vs UPI economics. |
| `credit_liability` | Σ wallet balances (#06) | A real balance-sheet number (deferred revenue). |
| `refund_rate` / `chargeback_rate` | by `gateway` | Chargeback ratio gates gateway-account health. |
| `gateway_fees_pct` | gateway fees / gmv, by `gateway` | Drives gateway routing & decommission (#24). |
| `trial_subsidy_total` | Σ `subsidy_total` on cost_report invoices (#16) | What the free tier costs. |
| `tax_collected` | by jurisdiction (GST/SEZ/TDS) | Finance/statutory. |

**Usage economics**

| `metric_key` | Definition | Why |
|--------------|------------|-----|
| `overage_revenue_mix` | Metered overage / total revenue (#12) | Pricing-model health. |
| `allowance_utilization` | qty / locked allowance, distribution | Expansion signal (who's about to need a bigger bundle). |

## 9. Alerting & retention

- **Page (money integrity, §6):** any non-zero `invoice.line_sum_mismatch`, `ledger.balance_drift`,
  `money.minor_unit_factor_miss`, `payment.amount_vs_invoice_mismatch`, `erpnext.push_amount_mismatch`.
  These are "stop the line" — wrong money beats slow money.
- **Page (liveness):** `scheduler.job_last_success_age{job}` > 2× interval for any money job;
  `webhook.received` rate drops to 0 for > 15 min during business hours.
- **Ticket (degradation):** `gateway.api_error` rate, `recon.unresolved` > 0 after 24h (matches the
  #21 alert threshold), `erpnext.sync_backlog` rising, `mandate.cap_vs_tier_mismatch` > 0.
- **Retention:** Plane A TSDB ~13 months (year-over-year comparison). Plane B `Metric Snapshot`
  **permanent** — it is financial record. The 3-month rolling restatement (§3) reconciles late
  events without losing the original figure.
- **Labels are bounded:** never label a metric with `customer_id`, `invoice_id`, `team`, or a raw
  amount — cardinality bomb and PII leak. Per-entity detail lives in logs/traces keyed by id, not in
  metric labels. (Plane B uses `dimension` for *bounded* slices only: region, currency, plan.)

## 10. How to extend safely

Follow this when adding a money path, gateway, job, or ledger mutation — *before* writing the code.

1. **Emit through the seam, never inline.** All Plane A emission goes through
   `billing/platform/metrics.py` (mirrors how authz goes through `security.py`). The seam wraps the
   client so a metrics backend swap touches one file.
2. **Emission is fire-and-forget and must never throw into a money path.** The seam swallows and
   logs its own errors. A metrics outage must not roll back a charge. (Plane B is the opposite — its
   rollup *may* fail loudly, because it runs off the hot path in a job.)
3. **New gateway adapter** → it must emit `gateway.api_latency`, `gateway.api_error`, and
   `gateway.adapter_contract_violation` with its `gateway` label, or it fails the contract suite
   (#25 pattern). Webhook handlers emit the §4 set.
4. **New scheduled job** → register it with `scheduler.job_last_success_age` on success, or it is
   invisible when it dies. No silent crons.
5. **New money figure for a human** → it is **Plane B**: add a definition function in
   `billing/reports/metrics/` reading the SOR via QueryBuilder, returning integer `value_minor` for
   money, and let the rollup snapshot it. Do **not** add a runtime counter and sum it for a report.
6. **Money metrics carry currency and stay integer.** No averaging amounts in the emitter; emit
   `sum` + `count` and divide at query time. Never cross-currency sum.
7. **New invariant that "can't happen"** → give it a counter (like §6) so "can't happen" becomes
   "is provably 0", not "is unobserved".

## 11. Coverage checklist

A reproducible, mostly-greppable audit that every money-moving seam is instrumented. Each check
names the seam it verifies.

- [ ] Every `GatewayAdapter` subclass emits the §4 gateway triplet — `grep` adapters for the
      `metrics.` calls; the contract suite asserts it.
- [ ] The webhook entrypoint emits `webhook.signature_invalid` **at the signature check**, before
      any DB access (cross-check [security.md](security.md) §3 — same seam, same ordering).
- [ ] Every function registered as a scheduler job emits `scheduler.job_last_success_age` —
      enumerate `scheduler_events` / `@frappe.whitelist` cron entries and diff against emitters.
- [ ] `charges._settle_invoice` (and the reconciliation resolve path, #21) emit
      `payment_attempt.outcome`; both webhook- and reconciliation-resolved settlements are counted.
- [ ] Every money invariant in §6 has a counter and a page rule in §9; none is merely asserted in
      code with no metric.
- [ ] Every §8 `metric_key` has a definition function in `billing/reports/metrics/` and a
      `Metric Snapshot` row from the latest rollup — no orphan keys, no dashboard figure without a
      snapshot behind it.
- [ ] No metric is labelled with `customer_id` / `invoice_id` / `team` / raw amount (`grep` the
      `metrics.` call sites).
- [ ] No `value_minor` in `Metric Snapshot` was produced by float arithmetic (definition functions
      sum integer columns only; cross-check against [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)).

## Status

Draft. New domain doc; not yet derived into issues. Open items: choice of Plane A backend
(StatsD/Prometheus vs Frappe's built-in monitor) — affects only `billing/platform/metrics.py`, not
this catalogue; exact alert thresholds per §9 to be tuned against the #22 load run.
