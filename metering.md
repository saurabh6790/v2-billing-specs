# Metering

## Purpose

Capture usage-based consumption (transfer, snapshot) for billing and forecasting **without** recreating v1's 10M-records problem.

## Concepts

- Metered resources are billed by *quantity*, not duration — the plan-change event log alone can't carry them. Hence a second stream: the **Usage Meter**.
- **Two meter types aggregate by opposite math:**
  - **counter** (e.g. transfer GB) — billed on the **sum** of deltas.
  - **gauge** (e.g. snapshot GB) — billed on the **integral over time** (GB-days).
- **Edge aggregation** — the cluster manager rolls the cluster's raw metrics up at the edge and exposes only the aggregate, which Central records. Central never stores raw samples. This is what keeps v2 off v1's 10M path.

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is no Agent: the **Usage Meter** is a **Central** DocType, written from the cluster manager's aggregated figures (no push/sync, no `synced_to_central`).

## Data Model

**Usage Meter** (Central DocType — written from cluster-manager rollups)

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Same key as the price-lock on Central |
| meter_type | Select | counter / gauge |
| period_start / period_end | Datetime | |
| quantity | Float | Summed deltas (counter) or GB-days (gauge). A physical **measure**, not money — stays `Float` ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)); only its product with a rate rounds to minor units |
| unit | Data | GB, etc. |
| last_sampled_at | Datetime | |
| idempotency_key | Data | `(resource_id, meter_type, period)` — a re-record **replaces**, never adds |

## Rollup & forecast

- One **rollup row per `(resource_id, meter_type, billing_period)`** at close → Central receives ~one metered line per resource per meter per month, not per-day-per-resource.
- One **running-total row per `(resource_id, meter_type, current_period)`**, overwritten daily, gives the live forecast ([invoicing.md](invoicing.md) §forecast); it collapses to the final figure at close. Bounded row count.
- Idempotent: re-recording a period (recompute, or after a metering gap) replaces the figure, never double-counts.

## Billing

Metered bill = `round_half_up(max(0, quantity − locked_allowance) × locked_rate / 10⁶)` minor units — `quantity` is the `Float` measure, `locked_rate` is in **rate units** (minor × 10⁶), and the product rounds to the minor unit **once** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)). The sub-minor rate scale is what lets a live snapshot rate of ₹0.30/GB-month bill correctly. Rate and allowance are **locked at provision** in the same price-lock row as fixed prices (see [plans-and-pricing.md](plans-and-pricing.md)), so grandfathered metered pricing is grandfathered identically; live-priced add-ons (snapshot) read the current rate instead (see [ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md)).

## Invariant

> Plan Subscription Log **+** Usage Meter rollups are the data Central needs to bill. The event log alone suffices only for *fixed* resources; *metered* resources additionally require the rollups.

## Notes

- Future meters (API call count, request volume) are additive — the counter/gauge model and the pipeline already exist. See [roadmap.md](roadmap.md).
