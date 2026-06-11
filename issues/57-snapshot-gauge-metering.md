# 57 — Snapshot gauge metering: daily sampling → rollup → Central

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/03-metering.md](../atlas-integration/03-metering.md), [metering.md](../metering.md)

## What to build

The first real metered source. A daily Agent job samples, per team-attributed
VM, the total bytes of its `Available` snapshots (`size_bytes` +
`data_size_bytes`) and records a gauge interval
(`record_gauge(resource_id=vm UUID, value=total GB, days=1)`) — one bounded
`Usage Meter` row per (VM, gauge, period), running GB-days integral, Central
never sees a raw sample. On the 1st the prior period's meters close
(`close_period`) and push so Central's rollups carry the final figures before
the invoice run. Snapshot is live-priced (ADR 0002): the Agent ships
quantities only; Central applies the current catalog rate at invoice time.
Termination needs no early close — deleted snapshot rows simply stop
contributing from the next sample.

## Acceptance criteria

- [ ] N GB of Available snapshots held D sampled days yields an N×D GB-day quantity for the period.
- [ ] One meter row per (VM, gauge, period); re-samples update the row and mark it unsynced; re-push **replaces** on Central, never adds.
- [ ] Snapshots of team-less VMs are not metered.
- [ ] Period close on the 1st flips status to closed, final figure reaches Central's rollup store.
- [ ] Mid-period snapshot deletion and VM termination both just reduce subsequent samples (test).

## Blocked by

- #12, #50, #51

