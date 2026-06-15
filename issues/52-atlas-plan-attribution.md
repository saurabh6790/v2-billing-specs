# 52 — Atlas: `plan` attribution validated against the Central catalog

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-central-integration.md](../atlas-integration/01-atlas-central-integration.md)

## What to build

The plan choice on the resource. `Virtual Machine` gains a `plan` Data field —
opaque to Atlas (Atlas never imports billing), meaningful to Central. Because
provisioning is Central-initiated ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)),
the plan is validated **on Central** against its own `Plan` / `Catalog Rate`
catalog before Central calls `create_vm` — there is no per-cluster Plan Cache to
push or consult. Central's subscribe surface offers the catalog plans (title +
display rate), derives `size_preset` from the chosen plan's composition, and
passes `plan` + `size_preset` on the create call. Plan-less VMs created directly
in Atlas remain allowed for operators (unbilled, per #51's unattributed rule).

## Acceptance criteria

- [ ] `plan` Data field on VM; mutable only through the resize/plan-change path; carried through to Central on the status callback.
- [ ] Central rejects a subscribe for a plan absent from its catalog or without a resolvable rate (currency + cluster) **before** calling Atlas.
- [ ] Central's subscribe surface lists catalog plans with display rates and pre-fills the size from the plan's `includes_json`.
- [ ] An operator VM created in Atlas with no plan inserts fine and generates no billing activity (Central's callback ignores it).
- [ ] Unit tests for the validation paths with catalog fixtures.

## Blocked by

- #01, #51
