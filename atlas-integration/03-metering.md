# Metering — Atlas usage sources

How quantity-billed consumption on a cluster flows into the Agent's
`Usage Meter` and on to Central. The meter model (counter vs gauge, edge
aggregation, bounded rows, replace-on-re-push) is specced in
[metering.md](../metering.md) and the Agent half is built
(`press_billing_agent/metering.py`); this chapter maps **Atlas's actual
usage sources** onto it.

## The rule

The Agent samples Atlas/host state and keeps only **running aggregates** —
one `Usage Meter` row per `(resource_id, meter_type, period)`, overwritten as
samples arrive. Central never sees a raw sample. Atlas itself records
nothing for billing; sampling jobs live in the Agent's adapter
(`press_billing_agent/integrations/atlas.py`) and read Atlas documents and
host facts read-only.

## Meters at launch

| Meter | Type | Source | Sampling |
| --- | --- | --- | --- |
| Snapshot storage (GB-days) | gauge | Sum of `Virtual Machine Snapshot.size_bytes` (+ `data_size_bytes`) over `Available` snapshots, per backing VM | Daily Agent job: for each VM with snapshots, `record_gauge(resource_id=vm.name, value=total_GB, days=1)` |
| Network transfer (GB) | counter | Per-VM TAP device byte counters on each Server (the TAP name is derived from the VM UUID, so attribution is mechanical) | Deferred — see below |

- **`resource_id` is the backing VM's UUID** for both meters — same key as
  the fixed-plan price lock, so Central can render one resource's fixed +
  metered lines together.
- **Snapshot is live-priced** ([ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)):
  Central applies the current catalog rate at invoice time; the Agent ships
  quantities only. Quantities stay `Float` — only the product with a rate
  rounds to minor units, once
  ([ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)).
- **Gauge sampling is day-grained at launch.** A snapshot created and deleted
  between two daily samples contributes zero; a snapshot deleted an hour
  after a sample contributes a full day. Acceptable error for storage
  pricing; tightening means sampling more often, not changing the model.

**Deferred — transfer.** Atlas does not yet collect TAP counters off its
Servers. The seam is fixed now: a periodic Agent job obtains per-TAP byte
deltas (via an Atlas host-facts read — one SSH script per Server, the normal
Atlas Task pattern) and calls `record_counter(resource_id=vm.name,
delta=GB)`. Counter deltas accumulate; an Agent restart between samples loses
at most one interval, never double-counts. Until built, transfer simply does
not appear on invoices.

## Period close → Central

- Rollup rows carry `idempotency_key = (resource_id, meter_type, period)`;
  every local update marks the row unsynced and the (idempotent) push
  re-ships it — Central **replaces** the period figure, so the open period's
  row doubles as the live forecast on Central.
- On the 1st (cluster-local time decision pending — launch assumption: UTC
  calendar months everywhere, matching invoicing), the Agent's daily job
  closes the prior period's meters (`close_period`) and the push ships the
  final figures before Central's invoice run.
- A VM's termination does not close its meters early; the period close picks
  up whatever accrued. The `cancelled` event already ends the fixed-plan
  segment, and snapshot rows are deleted on terminate (their last sampled
  day is the final gauge contribution).

## Testing

- Unit: gauge math (N GB held D days → N×D GB-days), counter accumulation,
  idempotency-key stability across re-samples, terminate-mid-period
  behaviour — with Atlas reads mocked.
- Integration: two daily samples + close + push against a stub Central
  asserting replace-not-add on re-push.
