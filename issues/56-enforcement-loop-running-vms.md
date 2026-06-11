# 56 — Enforcement loop: Central directives act on running VMs

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-agent-integration.md](../atlas-integration/01-atlas-agent-integration.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The suspension teeth. An hourly Agent job reconciles each team's Atlas VMs to
`entitlement.enforcement_state(team)`: `stopped` (token `suspend` flag) →
`vm.stop()` every Running/Paused VM (power-off, data preserved); `terminated`
→ `vm.terminate()` every non-Terminated VM, which fires the `cancelled`
billing event through the normal adapter hook. All actions go through the
normal Atlas controller methods so each is one audited Atlas Task.
Enforcement overrides `stop_protection` / `termination_protection` (operator
convenience loses to a deliberate Central directive), clearing the flag and
leaving a comment on the VM. An **expired** token enforces nothing — Central
unreachable never stops customer resources; only a live directive does. The
job is idempotent and converging: it compares desired to actual state and
acts only on the difference.

## Acceptance criteria

- [ ] Suspend token → all the team's Running/Paused VMs stop, each with a Task row; data and VM rows intact.
- [ ] Terminate token → VMs terminate and `cancelled` events close their billing segments.
- [ ] Protection flags are overridden with an audit trail (Task + comment naming enforcement as the actor).
- [ ] Expired token, or no token, leaves running VMs untouched.
- [ ] Re-running after a partial failure acts only on the remaining VMs; a converged team is a no-op.
- [ ] A cleared directive (next token without flags) stops further enforcement; restart of stopped VMs is the customer's action, not the job's.

## Blocked by

- #51, #53

