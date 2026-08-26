# Metering — Atlas usage sources

How quantity-billed consumption on a cluster flows into Central's `Usage Meter`
and onto invoices. The meter model (counter vs gauge, edge aggregation, bounded
rows, replace-on-re-sample) is specced in [metering.md](../metering.md) and
built in `central/billing/revenue/metering.py`; this chapter maps **Atlas's
actual usage sources** onto it. There is no per-cluster meter — **Central
samples Atlas and keeps the aggregates itself**
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).

## The rule

A Central daily job reads Atlas/host state through the Atlas API and keeps only
**running aggregates** — one `Usage Meter` row per `(resource_id, meter_type,
period)`, overwritten as samples arrive. Atlas records nothing for billing; it
just answers reads. The sampling lives in Central's Atlas client
(`central/billing/integrations/atlas.py`) and calls Atlas's read endpoints
([02](./02-central-atlas-api.md)) — no raw sample is stored, only the integral.

## Meters at launch

| Meter | Type | Source (read from Atlas) | Sampling |
| --- | --- | --- | --- |
| Snapshot storage (GB-days) | gauge | `list_snapshots` → sum of `size_bytes` (+ `data_size_bytes`) over `Available` snapshots, per backing VM | Daily Central job: for each team-VM with snapshots, `record_gauge(resource_id=vm.name, value=total_GB, days=1)` |
| Network transfer (GB) | counter | `get_transfer_counters` → per-VM TAP device byte counters on each Server (TAP name derives from the VM UUID, so attribution is mechanical) | Deferred — see below |

- **`resource_id` is the backing VM's UUID** for both meters — same key as the
  fixed-plan price lock, so Central renders one resource's fixed + metered lines
  together.
- **Snapshot is live-priced** ([ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)):
  Central applies the current catalog rate at invoice time; the meter holds
  quantities only. Quantities stay `Float` — only the product with a rate rounds
  to the currency's 2 decimals, once ([ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)'s
  integer minor-units model deprecated; money is float `Currency`, major units).
- **Gauge sampling is day-grained at launch.** A snapshot created and deleted
  between two daily samples contributes zero; one deleted an hour after a sample
  contributes a full day. Acceptable error for storage pricing; tightening means
  sampling more often, not changing the model.

**Deferred — transfer.** Atlas does not yet collect TAP counters off its
Servers. The seam is fixed now: Central's periodic job calls
`get_transfer_counters` (Atlas runs one idempotent host-facts SSH script per
Server, the normal Task pattern, and returns per-TAP byte deltas) and calls
`record_counter(resource_id=vm.name, delta=GB)`. Counter deltas accumulate; a
missed interval loses at most one sample, never double-counts. Until built,
transfer simply does not appear on invoices.

## Period close

- Rollup rows carry `idempotency_key = (resource_id, meter_type, period)`; every
  re-sample updates the row in place — Central **replaces** the period figure, so
  the open period's row doubles as the live forecast.
- On the 1st (launch assumption: UTC calendar months everywhere, matching
  invoicing), Central's daily job closes the prior period's meters
  (`close_period`) before the invoice run reads them.
- A VM's termination does not close its meters early; the period close picks up
  whatever accrued. The `cancelled` event already ends the fixed-plan segment,
  and a terminated VM's snapshots disappear from the next `list_snapshots` read
  (their last sampled day is the final gauge contribution).

## Testing

- Unit (Atlas reads mocked): gauge math (N GB held D days → N×D GB-days),
  counter accumulation, idempotency-key stability across re-samples,
  terminate-mid-period behaviour.
- Integration (Central + stub Atlas API): two daily samples + close, asserting
  replace-not-add on re-sample, and that team-less VMs are never metered.
