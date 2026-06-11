# 58 — Transfer counter metering from TAP device byte counters

**Type:** AFK · **Milestone:** post · **Spec:** [atlas-integration/03-metering.md](../atlas-integration/03-metering.md), [metering.md](../metering.md)

## What to build

Network transfer as a counter meter. A periodic Agent job collects per-VM
byte deltas from each Server's TAP device counters (the TAP name derives from
the VM UUID, so attribution is mechanical) via an Atlas host-facts read — one
idempotent SSH script per Server in the normal Atlas Task pattern — and
accumulates them with `record_counter(resource_id=vm UUID, delta=GB)`.
Counter billing is the sum of deltas; a restart between samples loses at most
one interval, never double-counts. Until this lands transfer simply does not
appear on invoices (the launch posture).

## Acceptance criteria

- [ ] Per-VM byte deltas collected per sampling interval, handling counter resets (host reboot, VM stop/start) without negative or double-counted deltas.
- [ ] Deltas accumulate into one counter row per (VM, period); rollups reach Central replace-not-add.
- [ ] Team-less VMs (incl. proxy VMs) excluded.
- [ ] Collection failure on one Server doesn't block others; the gap is visible in the Sync/Task logs.

## Blocked by

- #57

