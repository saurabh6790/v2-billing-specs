# 03 — Agent event log + push + Central price-lock

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [subscription-agent.md](../subscription-agent.md), [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

The source-of-truth spine. The Agent records an immutable `Plan Subscription Log` row per plan change, each carrying a stable `resource_id` and the `shown_price` displayed at provision time, and pushes it to Central (`receive_usage_events`). On receiving a new `(resource_id)` segment, Central writes an **append-only price-lock row keyed by `resource_id`**, capturing the locked price (= `shown_price`) and logging a discrepancy if it differs from Central's current price. Push is on-demand-primary with a daily catch-up; events are marked synced only on Central ack.

## Acceptance criteria

- [ ] `Plan Subscription Log` (Agent): immutable, append-only, with `resource_id`, `shown_price`, event_type, effective_from/to.
- [ ] Push to Central is idempotent; events marked `synced_to_central` only after ack; unsynced retried daily.
- [ ] Central writes an append-only price-lock keyed by `resource_id` = `shown_price`; a destroy+reprovision yields a new lock.
- [ ] A `shown_price` ≠ Central's current price is locked anyway and logged as a discrepancy.
- [ ] Locked price is read by billing; live plan price changes do not alter existing locks.

## Blocked by

- #01
