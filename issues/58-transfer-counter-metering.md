# 58 — Transfer counter metering from TAP device byte counters

**Type:** AFK · **Milestone:** post · **Spec:** [atlas-integration/03-metering.md](../atlas-integration/03-metering.md), [metering.md](../metering.md)

## What to build

Network transfer as a counter meter. A periodic **Central** job calls Atlas
`get_transfer_counters` (Atlas runs one idempotent host-facts SSH script per
Server in the normal Task pattern and returns per-VM byte deltas — the TAP name
derives from the VM UUID, so attribution is mechanical) and accumulates them with
`record_counter(resource_id=vm UUID, delta=GB)` into Central's meters
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
Counter billing is the sum of deltas; a missed interval loses at most one sample,
never double-counts. Until this lands transfer simply does not appear on invoices
(the launch posture).

## Acceptance criteria

- [ ] Per-VM byte deltas collected per interval, handling counter resets (host reboot, VM stop/start) without negative or double-counted deltas.
- [ ] Deltas accumulate into one counter row per (VM, period); the period figure replaces-not-adds on re-sample.
- [ ] Team-less VMs (incl. proxy VMs) excluded.
- [ ] A read failure on one Server doesn't block others; the gap is visible in admin observability / Task logs.

## Blocked by

- #57
