# 51 — Atlas: `team` attribution on Virtual Machine + Snapshot

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-agent-integration.md](../atlas-integration/01-atlas-agent-integration.md), [central/spec/IAM.md](../../central/spec/IAM.md), [central/spec/EXECUTION_PLAN.md §2](../../central/spec/EXECUTION_PLAN.md)

## What to build

The Team boundary on Atlas resources — the join key for both IAM and
billing. `Virtual Machine` and `Virtual Machine Snapshot` carry an immutable,
indexed `team` Data field holding the Central Team identifier. Creating a VM
requires an explicit Team and `vm:create` for that Team; snapshots and
derived resources (clone, rebuild) inherit their VM's Team and cannot cross
Team boundaries. Resources without a `team` (legacy, proxy, golden-image
build VMs) stay operator-only and are invisible to billing.

## Acceptance criteria

- [ ] `team` field on VM and Snapshot: Data, immutable after insert, indexed; never inferred from the Frappe document owner.
- [ ] VM creation without a Team, or for a Team the session lacks `vm:create` in, is rejected.
- [ ] Snapshot/clone/rebuild inherit the source VM's Team; cross-Team derivation is rejected.
- [ ] Unattributed resources remain creatable and operable by operators (`System Manager`) only.
- [ ] Tests cover allowed, denied, cross-Team, and legacy-resource cases.

## Blocked by

None - can start immediately

