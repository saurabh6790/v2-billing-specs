# 87 — ADR 0011: the Plan Configurator authors the component rate card + all currencies inline

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md](../catalog-pricing-decisions.md), [final-plan-pricing.md §4/§11](../final-plan-pricing.md) · **ADR:** [0011](../docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md)

## What to build

Make the Plan Configurator the **single authoring authority** for every price. Today presets/add-ons
are priced through the Configurator while the **component rate card** (per-unit `Resource Type` rates)
is set through a separate seed + `update_component_rate` endpoint — two authoring surfaces for one
catalog, which already caused a real incident (an incomplete USD card → a `$0` design-your-own
estimate).

Fold component-rate-card authoring into the Configurator, beside its preset and simple-plan builders,
and make the pricing step capture **every shipped currency inline** (so authoring a plan never bounces
to `Catalog Rate`). `update_component_rate` becomes the Configurator's internal write; the seed is
demoted to fresh-install defaults only.

## Acceptance criteria

- [ ] The Configurator has a component-rate-card step that sets the per-unit rate for each
      `Resource Type` × currency × cluster, writing ordinary `Catalog Rate` rows (`priced_doctype =
      Resource Type`).
- [ ] The Configurator's pricing step captures all shipped currencies in one place for presets,
      metered/simple plans, and the component card.
- [ ] `update_component_rate` is invoked only from the Configurator's internal write path; there is no
      parallel public authoring endpoint. The seed runs only on fresh install / migration.
- [ ] The Configurator surfaces an **incomplete component card** for a currency/region before that
      region can offer composed configs (the cause of the `$0` estimate is fixed, not just the symptom).
- [ ] The Configurator warns when a preset's flat rate sits below its component sum (intended discount)
      or above it (likely mispricing).
- [ ] Tests cover: authoring a component card via the Configurator, all-currency capture, and the
      incomplete-card warning.

## Blocked by

None - can start immediately.
