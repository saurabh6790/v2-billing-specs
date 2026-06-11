# 53 — Atlas adapter: `subscribed`/`cancelled` lifecycle events end-to-end

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-agent-integration.md](../atlas-integration/01-atlas-agent-integration.md)

## What to build

The tracer bullet for "Atlas resource → Central price lock". The Agent's
adapter observes Virtual Machine lifecycle via doc_events (in-process — both
apps on the cluster-manager site) and appends to the event log:

- First successful provision (`Pending → Running`) → `subscribed`, with
  `resource_id` = the VM's UUID, `shown_rate` resolved from the Plan Cache
  for (plan, currency, cluster) at that moment, `effective_from` = provision
  success time. A VM that never provisions never bills.
- `terminate()` → `cancelled`, closing the open segment.
- Stop/start/pause/resume generate no events (stopped VMs bill at full plan
  rate — the spec's launch decision; only terminate ends billing).

Events push to Central on-demand (existing spine), where they become price
locks keyed by the VM UUID. Hooks are idempotent: `subscribed` only when no
open segment exists for the resource, `cancelled` only when one does — a
re-fired doc event or provision retry never double-opens or double-closes.
The Agent's demo `provisioning.subscribe` (simulated `srv-<team>-N` ids) is
demoted to demo-only.

## Acceptance criteria

- [ ] Provisioning a team+plan VM yields one `subscribed` log row (VM UUID, shown rate, currency, cluster) and, on push, a Central price lock for that `resource_id`.
- [ ] Terminating the VM yields one `cancelled` row closing the segment; billing-relevant duration = provision success → terminate.
- [ ] Provision retry after failure, and duplicate doc-event firing, produce no duplicate events.
- [ ] Stop/start/pause/resume produce no events.
- [ ] Team-less or plan-less VMs are skipped entirely.
- [ ] Push failure leaves recording intact (row unsynced, picked up by catch-up).

## Blocked by

- #50, #51, #52

