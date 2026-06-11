# 52 — Atlas: `plan` attribution validated against the Plan Cache

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/01-atlas-agent-integration.md](../atlas-integration/01-atlas-agent-integration.md)

## What to build

The plan choice on the resource. `Virtual Machine` gains a `plan` Data field
— opaque to Atlas (Atlas never imports billing), meaningful to the Agent. The
Agent's adapter (`press_billing_agent/integrations/atlas.py`, created here as
a skeleton) registers a `before_insert` doc_event on `Virtual Machine` that
validates a supplied plan exists in the local `Plan Cache` and has a rate for
the team's currency in this cluster. The VM creation surface offers the
cached plans (title + display rate) and derives `size_preset` from the chosen
plan's composition. Plan-less VMs remain allowed for operators (unbilled,
per #51's unattributed rule).

## Acceptance criteria

- [ ] `plan` Data field on VM; mutable only through the resize/plan-change path.
- [ ] Agent `before_insert` hook rejects a plan absent from the Plan Cache or without a resolvable rate (currency + cluster); hook is inert when Atlas is not installed.
- [ ] VM creation surface lists Plan Cache plans with display rates and pre-fills the size from the plan's `includes_json`.
- [ ] An operator VM with no plan inserts fine and generates no billing activity.
- [ ] Unit tests for the validation paths with Plan Cache fixtures.

## Blocked by

- #01, #51

