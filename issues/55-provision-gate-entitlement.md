# 55 — Provision gate: trust-tier cap checked synchronously at subscribe

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-central-integration.md](../atlas-integration/01-atlas-central-integration.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The cap check, now **synchronous on Central before it calls Atlas** — no token,
no offline check, no cluster round-trip ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
When a user subscribes to a plan, Central gates the create. Deny when: the
session lacks `vm:create` for the team (IAM), the plan is absent from the catalog
or has no rate for the team's currency + cluster, the resource type isn't allowed
for the tier, or the projected run-rate / resource count exceeds the team's
trust-tier slice for the cluster. Projected run-rate = sum of `shown_rate` over
the team's open segments in this cluster (Central already holds them) plus the
new plan's rate, compared directly against the cap — both are float `Currency` in
major units, so there is no unit conversion (ADR 0003 minor-units model deprecated).
The trust-tier cap is evaluated **live from billing history**,
not read from a cached signed token. IAM runs first ("may this user act for this
team"); the gate answers "may this team consume more". Only if the gate passes
does Central call `create_vm`.

## Acceptance criteria

- [ ] Entitled team within cap: Central proceeds to call Atlas `create_vm`.
- [ ] Each deny path throws with a distinct, actionable message: IAM denied / unknown plan / no rate / resource type not allowed / spend cap / count cap.
- [ ] Test: a plan rate compares correctly against the trust-tier cap (both float `Currency`, major units — no unit conversion).
- [ ] Current spend counts only open segments in this cluster (terminated VMs free headroom).
- [ ] A trust-tier promotion takes effect on the next subscribe with no token re-issue/refresh step.
- [ ] No Atlas call is made when the gate denies.

## Blocked by

- #07, #51, #52
