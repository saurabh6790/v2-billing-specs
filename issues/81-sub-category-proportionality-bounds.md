# 81 — Profile proportionality + bounds on `Plan Sub-Category`, validated at provision

**Type:** AFK · **Milestone:** CC · **Spec:** [final-plan-pricing.md §5.2](../final-plan-pricing.md), [plan-writeup.md §6.5](../plan-writeup.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)

## What to build

Promote the optimization **profile** (`Plan Sub-Category`) from a configurator *pre-fill default*
to a **runtime constraint**, so a composed config can only ever be a sane shape.

- `Plan Sub-Category` (for the VM/compute family) gains:
  - `ram_ratio` — RAM = vCPU × ratio (e.g. `2` for General, `4` for Memory Optimised). The existing
    configurator ratio becomes this field.
  - `vcpu_steps` — the allowed vCPU values (e.g. `1, 2, 4, 8`).
  - `disk_min` / `disk_max` — the bounded disk range.
- **Server-side validation** of a composed config against its chosen profile, run at provision (and
  reused by resize, #82): vCPU is one of `vcpu_steps`; RAM equals `vCPU × ram_ratio`; disk is within
  `[disk_min, disk_max]`. An off-ratio or out-of-bounds shape (`3 vCPU · 1 GB`) is **rejected**, not
  silently accepted.
- This is the authoritative gate; any client bounds (#83) are a convenience the server re-checks.

## Acceptance criteria

- [ ] `Plan Sub-Category` carries `ram_ratio`, `vcpu_steps`, `disk_min`, `disk_max`; the configurator's existing ratio reads from `ram_ratio`.
- [ ] A composed config whose RAM ≠ vCPU × ratio is rejected at provision with a clear error.
- [ ] A vCPU not in `vcpu_steps`, or disk outside `[disk_min, disk_max]`, is rejected at provision.
- [ ] A valid in-bounds, on-ratio config provisions successfully (links into #80).
- [ ] The validator is a single reusable check called by both provision and resize (#82).
- [ ] Test: General (1:2) accepts `2 vCPU · 4 GB`, rejects `2 vCPU · 6 GB` and `3 vCPU · 6 GB` (3 ∉ steps); Memory Optimised (1:4) accepts `2 vCPU · 8 GB`.

## Blocked by

- [#80](80-composed-subscription-itemized-invoice.md) (the composed config the bounds validate)
- [#75](75-catalog-taxonomy-masters.md) (the `Plan Sub-Category` master the fields are added to)
