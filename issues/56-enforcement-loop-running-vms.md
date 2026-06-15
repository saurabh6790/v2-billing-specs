# 56 — Enforcement: Central calls Atlas to stop/terminate delinquent VMs

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-central-integration.md](../atlas-integration/01-atlas-central-integration.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The suspension teeth, driven by Central's own dunning
([#14](14-retry-dunning-suspension.md)) — not a pushed token or a per-cluster
job ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
When dunning decides `suspend` for a team, Central's Atlas client calls
`stop_vm` on every Running/Paused VM of the team (power-off, data preserved);
when it decides `terminate`, Central calls `terminate_vm` on every non-Terminated
VM, which yields a `cancelled` event closing its billing segment. Every call goes
through the normal Atlas operation, so each is one audited Atlas Task. Enforcement
overrides `stop_protection` / `termination_protection` (operator convenience
loses to a deliberate Central directive), clearing the flag and leaving a comment
on the VM. Central reconciles desired vs the state it reads from Atlas and acts
only on the difference. **Central-unreachable enforces nothing** — Atlas acts only
on an explicit Central call, so an outage can never stop a running resource.

## Acceptance criteria

- [ ] Suspend decision → all the team's Running/Paused VMs are stopped via Atlas calls, each with a Task id; data and VM rows intact.
- [ ] Terminate decision → VMs terminate and `cancelled` events close their billing segments.
- [ ] Protection flags are overridden with an audit trail (Task + comment naming enforcement as the actor).
- [ ] Re-running after a partial failure acts only on the remaining VMs; a converged team is a no-op.
- [ ] Recovery (dunning clears) stops further enforcement; restarting stopped VMs is the customer's action, not Central's.
- [ ] A Central/cluster outage issues no stop/terminate calls (nothing on the cluster can decide to suspend).

## Blocked by

- #51, #53
