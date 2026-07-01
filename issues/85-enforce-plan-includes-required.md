# 85 — Enforce `Plan.includes ≥ 1` (a Plan always declares what it bills)

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md](../catalog-pricing-decisions.md) · **ADR:** [0008](../docs/adr/0008-add-on-as-metered-single-resource-plan.md)

## What to build

Make a `Plan` structurally unable to exist without declaring what it bills. `is_metered_single_resource()`
keys off `len(includes) == 1`, and an empty `includes` is a price with no subject — a Plan that can be
priced but bills nothing. Require at least one `Plan Includes` row, so the composition always binds
either the metered resource + allowance or the bundle composition.

## Acceptance criteria

- [ ] The `includes` Table field on `Plan` is required (`reqd`), enforced server-side (not just UI).
- [ ] Saving a `Plan` with zero `includes` rows fails with a clear, translated validate message
      explaining that a Plan must declare at least one included resource.
- [ ] Existing seeds/fixtures and the Plan Configurator still produce valid Plans (each writes ≥1 include).
- [ ] A test asserts an empty-`includes` Plan is rejected and a one-row Plan is accepted.

## Blocked by

None - can start immediately.
