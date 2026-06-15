# 54 — `changed` event on resize / plan change

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-central-integration.md](../atlas-integration/01-atlas-central-integration.md), [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

Plan changes re-lock. A plan change is Central-initiated: Central calls Atlas
`resize_vm` (Stopped-only) with the new plan/size, and on confirmation records a
`changed` event — the open segment closes at the change time and a new segment
opens at the **new plan's current catalog rate** — grandfathering protects only
the unchanged plan. Central writes the new lock for the same `resource_id`
(append-only lock history). Invoicing prorates the two segments within the month
from their `effective_from`/`effective_to`.

## Acceptance criteria

- [ ] A plan change on a subscribed VM closes the open segment and opens a new one with the new plan + newly resolved `shown_rate`.
- [ ] Central's lock history for the `resource_id` shows both locks; the old lock is unaltered.
- [ ] Changing to the same plan is a no-op (no event).
- [ ] A plan change on a never-provisioned or terminated VM records nothing.
- [ ] The new plan is validated against the Central catalog exactly like at creation, before the Atlas resize call.

## Blocked by

- #53

