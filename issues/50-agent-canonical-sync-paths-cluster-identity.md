# 50 — Agent sync paths → canonical Central endpoints + cluster identity

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/02-agent-central-sync.md](../atlas-integration/02-agent-central-sync.md)

## What to build

Re-point the Agent's push spine at the canonical post-merge Central module
paths and give the Agent a single cluster identity. The Agent currently posts
usage events and meter rollups to stale `press_billing.sync.*` paths; since
billing merged into Central as a module (ADR 0004) the live receivers are
`central.billing.platform.sync.receive_usage_events` and
`…receive_meter_rollups`. The Agent reads one `cluster` value from site
config and stamps it on every event it records, so Atlas-originated events
and Central's `Entitlement Token.cluster_slices` / `Catalog Rate.cluster`
agree on the cluster name.

## Acceptance criteria

- [ ] `push_unsynced_events` and `push_unsynced_meters` post to the canonical `central.billing.platform.sync.*` method paths.
- [ ] A recorded event → push → ack round-trip marks exactly the acknowledged rows `synced_to_central` (integration test against a stub Central).
- [ ] The Agent exposes one `cluster` identity from site config; events recorded without an explicit cluster are stamped with it.
- [ ] A missing `cluster` config fails loud at event-recording time, not silently shipping cluster-less events.
- [ ] Daily catch-up re-pushes unacknowledged rows unchanged (idempotent on `event_id` / `idempotency_key`).

## Blocked by

- #03

