# Metering

## Purpose

Capture usage-based consumption (transfer, snapshot) for billing and forecasting **without** recreating v1's 10M-records problem.

## Concepts

- Metered resources are billed by *quantity*, not duration — the plan-change event log alone can't carry them. Hence a second stream: the **Usage Meter**.
- **Two meter types aggregate by opposite math:**
  - **counter** (e.g. transfer GB) — billed on the **sum** of deltas.
  - **gauge** (e.g. snapshot GB) — billed on the **integral over time** (GB-days).
- **Edge aggregation** — the Agent reads the cluster's raw metrics, rolls them up locally, and ships only the aggregate. Central never stores raw samples. This is what keeps v2 off v1's 10M path.

## Data Model

**Usage Meter** (Agent DocType)

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Same key as the price-lock on Central |
| meter_type | Select | counter / gauge |
| period_start / period_end | Datetime | |
| quantity | Float | Summed deltas (counter) or GB-days (gauge) |
| unit | Data | GB, etc. |
| last_sampled_at | Datetime | |
| idempotency_key | Data | `(resource_id, meter_type, period)` — a re-push **replaces**, never adds |
| synced_to_central | Check | |

## Rollup & forecast

- One **rollup row per `(resource_id, meter_type, billing_period)`** at close → Central receives ~one metered line per resource per meter per month, not per-day-per-resource.
- One **running-total row per `(resource_id, meter_type, current_period)`**, overwritten daily, gives the live forecast ([invoicing.md](invoicing.md) §forecast); it collapses to the final figure at close. Bounded row count.
- Idempotent: a re-push after an Agent outage replaces the period figure (recompute), never double-counts.

## Billing

Metered bill = `max(0, quantity − locked_allowance) × locked_rate`. Rate and allowance are **locked at provision** in the same price-lock row as fixed prices (see [plans-and-pricing.md](plans-and-pricing.md)), so metered pricing is grandfathered identically.

## Invariant

> Plan Subscription Log **+** Usage Meter rollups are the data Central needs to bill. The event log alone suffices only for *fixed* resources; *metered* resources additionally require the rollups.

## Notes

- Future meters (API call count, request volume) are additive — the counter/gauge model and the pipeline already exist. See [roadmap.md](roadmap.md).
