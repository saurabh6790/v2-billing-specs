# 03 — Central event log + price-lock

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is no Agent and no push/sync. Central records the event log **itself**, in the same step it provisions via the cluster manager. (Title was "Agent event log + push + Central price-lock".)

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [provisioning-and-entitlements.md](../provisioning-and-entitlements.md), [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

The source-of-truth spine, in Central. When Central provisions (or changes/cancels) a resource via the cluster manager, it writes an immutable **event-log** row per change — each carrying a stable `resource_id` and the `shown_rate` (+ `currency`) resolved and displayed at provision time. On a new `(resource_id)` segment, Central writes an **append-only price-lock row keyed by `resource_id`**, capturing the locked rate (= `shown_rate`) and currency, and logging a discrepancy if it differs from Central's currently-resolved rate. Because the component that shows the rate is the one that locks it, `rate shown = rate locked` is guaranteed without a cross-app sync.

## Acceptance criteria

- [ ] Event log (Central): immutable, append-only, with `resource_id`, `shown_rate`, `currency`, `event_type` (subscribed/changed/cancelled), `effective_from`/`to`.
- [ ] A row is written transactionally with the provision/change/cancel call to the cluster manager (no push, no ack, no Sync Log).
- [ ] Central writes an append-only price-lock keyed by `resource_id` = `shown_rate`; a destroy+reprovision yields a new lock.
- [ ] A `shown_rate` ≠ Central's current price is locked anyway and logged as a discrepancy.
- [ ] Locked price is read by billing; live plan price changes do not alter existing locks.

## Blocked by

- #01
