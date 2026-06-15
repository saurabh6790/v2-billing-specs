# 53 — Central records `subscribed`/`cancelled` from Atlas lifecycle

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-central-integration.md](../atlas-integration/01-atlas-central-integration.md)

## What to build

The tracer bullet for "Atlas resource → Central price lock". Central's Atlas
client maps Virtual Machine lifecycle (learned from the status callback, repaired
by the reconciliation read) onto the event log it owns
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)):

- First successful provision (`Pending → Running` callback) → `subscribed`, with
  `resource_id` = the VM's UUID, `shown_rate` resolved from the **Central
  catalog** for (plan, currency, cluster) at that moment, `effective_from` =
  provision-success time. A VM that never provisions never bills.
- `terminate()` (Central-initiated, confirmed by callback/read) → `cancelled`,
  closing the open segment.
- Stop/start/pause/resume record nothing (stopped VMs bill at full plan rate —
  the launch decision; only terminate ends billing).

Recording writes the event row **and** the price lock in the same Central
component, so shown rate ≡ locked rate (grandfathered), keyed by the VM UUID.
Recording is idempotent: `subscribed` only when no open segment exists for the
resource, `cancelled` only when one does — a re-posted callback or a provision
retry never double-opens or double-closes. The retired Agent's simulated
`srv-<team>-N` provisioning is gone.

## Acceptance criteria

- [ ] Provisioning a team+plan VM (create → `Running` callback) yields one `subscribed` log row (VM UUID, shown rate, currency, cluster) and a Central price lock for that `resource_id`.
- [ ] Terminating the VM yields one `cancelled` row closing the segment; billable duration = provision-success → terminate.
- [ ] Provision retry after failure, and a duplicate status callback, produce no duplicate events.
- [ ] Stop/start/pause/resume produce no events.
- [ ] Team-less or plan-less VMs are skipped entirely.
- [ ] A missed callback is recovered by the reconciliation read with no duplication.

## Blocked by

- #50, #51, #52
