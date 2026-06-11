# 55 — Provision gate: entitlement enforcement at VM creation

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-agent-integration.md](../atlas-integration/01-atlas-agent-integration.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The offline cap check. The adapter's `before_insert` on Virtual Machine gates
team-attributed creations against the cached Entitlement Token — no Central
call. Deny when: no token for the team ("set up billing on Central"), token
expired or `suspend`-flagged, plan or resource type outside the token's
whitelist, or projected run-rate / resource count exceeding this cluster's
slice. Projected run-rate = sum of `shown_rate` over the team's open segments
in this cluster plus the new plan's rate, converted from rate units
(minor × 10⁶) to the token's minor-unit `max_spend` before comparison — the
adapter owns the unit conversion, `entitlement.can_provision` stays
unit-agnostic. The gate runs after IAM's `vm:create` check: IAM answers "may
this user act for this team", the gate answers "may this team consume more".
Expired token + Central unreachable denies **new** provisions only — running
resources are never touched here.

## Acceptance criteria

- [ ] Entitled team within cap: insert proceeds.
- [ ] Each deny path throws with a distinct, actionable message: no token / expired / suspended / plan not allowed / resource type not allowed / spend cap / count cap.
- [ ] Unit conversion proven by test: a 10⁶-scaled rate compares correctly against a minor-unit `max_spend`.
- [ ] Current spend counts only open segments in this cluster (terminated VMs free headroom).
- [ ] Operator (team-less) VMs bypass the gate.

## Blocked by

- #07, #51, #52

