# 57 — Snapshot gauge metering: Central samples Atlas daily → rollup

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/03-metering.md](../atlas-integration/03-metering.md), [metering.md](../metering.md)

## What to build

The first real metered source. A daily **Central** job reads Atlas
(`list_snapshots`) and, per team-attributed VM, sums the bytes of its
`Available` snapshots (`size_bytes` + `data_size_bytes`) and records a gauge
interval (`record_gauge(resource_id=vm UUID, value=total GB, days=1)`) — one
bounded `Usage Meter` row per (VM, gauge, period), running GB-days integral,
kept in Central; no raw sample is stored
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
On the 1st the prior period's meters close (`close_period`) before the invoice
run reads them. Snapshot is live-priced (ADR 0002): the meter holds quantities;
Central applies the current catalog rate at invoice time. Termination needs no
early close — a terminated VM's snapshots drop out of the next read.

## Acceptance criteria

- [ ] N GB of Available snapshots held D sampled days yields an N×D GB-day quantity for the period.
- [ ] One meter row per (VM, gauge, period); re-samples update the row in place; the period figure **replaces**, never adds.
- [ ] Snapshots of team-less VMs are not metered.
- [ ] Period close on the 1st flips status to closed; the final figure is available to the invoice run.
- [ ] Mid-period snapshot deletion and VM termination both just reduce subsequent samples (test).

## Blocked by

- #12, #50, #51
