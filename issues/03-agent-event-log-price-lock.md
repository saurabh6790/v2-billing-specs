# 03 — Central event log + price-lock

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is no Agent and no push/sync. Central records the event log **itself**, in the same step it provisions via the cluster manager. (Title was "Agent event log + push + Central price-lock".)
>
> **Updated 2026-06-30 ([ADR 0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)).** The event log and the standalone `Price Lock` doctype are **folded into the append-only `Subscription Change` ledger** ([#04](04-subscription-intent-two-axis-state.md)). Each change row is the event *and* the rate snapshot for the segment it opens (`locked_rate` + `currency` + `effective_at`); `Created`/`Plan Changed` re-resolve and stamp a fresh rate, stop/start and other non-pricing transitions carry none, `Cancelled` closes the segment. No separate price-lock doctype to write or join, and (one component resolving-and-stamping) no discrepancy to log. This issue now also covers migrating existing `Price Lock` rows into the ledger (matched via `resource_id` → `asset_id`) and dropping `Price Lock` + `revenue/pricelock.py`.

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [provisioning-and-entitlements.md](../provisioning-and-entitlements.md), [plans-and-pricing.md](../plans-and-pricing.md), [subscriptions.md](../subscriptions.md)

## What to build

The source-of-truth spine, in Central, as the **`Subscription Change` ledger**. When Central provisions (or resizes/cancels) a resource via the cluster manager, it writes an immutable change row in the same transaction. A `Created`/`Plan Changed` row carries the **rate resolved and shown at that moment** as `locked_rate` (+ `currency`) and `effective_at` — opening a segment billing reads forever. Stop/start and other non-pricing transitions carry no rate; `Cancelled` closes the open segment. Because the component that shows the rate is the one that stamps it, `rate shown = rate locked` is guaranteed without a cross-app sync. The physical `resource_id` is reachable via the Subscription's `asset_id`.

## Acceptance criteria

- [ ] `Subscription Change` is immutable + append-only (controller forbids re-save), carrying `change_type`, `locked_rate`, `currency`, `effective_at`.
- [ ] A row is written transactionally with the provision/change/cancel call to the cluster manager (no push, no ack, no Sync Log).
- [ ] `Created`/`Plan Changed` stamp a freshly-resolved `locked_rate`; a destroy+reprovision is a new `Created` row → a new lock.
- [ ] Stop/start (`Paused`/`Resumed`) and other non-pricing transitions carry no rate; `Cancelled` closes the segment.
- [ ] Locked price is read by billing per segment; live plan price changes do not alter existing rows.
- [ ] Existing `Price Lock` rows are migrated into the ledger (via `resource_id` → `asset_id`); `Price Lock` + `revenue/pricelock.py` are removed.

## Blocked by

- #01
