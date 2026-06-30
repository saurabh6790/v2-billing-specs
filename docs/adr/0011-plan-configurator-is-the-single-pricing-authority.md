# The Plan Configurator is the single pricing authority

Date: 2026-06-30

We now price two kinds of thing on one rate spine. A **`Plan`** is a named offering —
a bundle (flat rate), a metered single-resource plan, or an add-on
([ADR 0008](0008-add-on-as-metered-single-resource-plan.md)); a **`Resource Type`** is
a composable primitive (`Compute`, `Memory`, `Disk`) priced per unit so a design-your-own
config can be summed from its parts ([ADR 0009](0009-composable-resource-pricing-design-your-own-config.md)).
Both ride the *same* `Catalog Rate` table, the *same* Dynamic Link, and the *same*
regional-over-global resolution. At the storage-and-resolution layer this is already a
single source of truth — one table answers "what does X cost here?" for everything.

The fragility is one layer up, in **authoring**. Preset and add-on rates are set through
the **Plan Configurator** (`build_ladder` → `generate_plans` → `apply_pricing`,
[final-plan-pricing.md §4/§11](../../final-plan-pricing.md)). The component rate card is
set through a *different* path — an idempotent seed plus an `update_component_rate` admin
endpoint ([issue #79](../../issues/79-per-resource-rate-card.md)). Two authoring surfaces
for one catalog means a region can have presets priced but its component card half-filled,
and nothing flags it: the design-your-own estimate silently resolves to **zero** in a
currency whose components were never priced. That is the chaos to remove — and it is an
*authoring* problem, not a storage one.

[ADR 0008](0008-add-on-as-metered-single-resource-plan.md) folded add-ons into `Plan` so
there was *one offering model* and one place to configure it. We extend that same
discipline to authoring: **one tool prices the whole catalog.**

## Decision

**The Plan Configurator is the single authority for pricing every offering and every
primitive. The rate spine keeps two honest, bounded targets; the Configurator is the one
product surface that writes to either.**

- **One authoring tool.** The Plan Configurator authors, in one place: curated **presets**
  (bundle flat rates), **metered single-resource plans** and **add-ons**, and the
  **component rate card** (per-unit `Resource Type` rates). Every price a customer can be
  charged is set here. The seed remains for *fresh installs only* (shipped defaults), and a
  programmatic setter remains for *migrations and tests* — but the product path to set or
  change any price is the Configurator, not an ad-hoc endpoint.

- **Two honest price targets, one spine.** `Catalog Rate` keeps pricing two clearly-bounded
  kinds: `priced_doctype = Plan` (named offerings) and `priced_doctype = Resource Type`
  (composable primitives). This is one table and one resolver pricing two things that are
  genuinely different — not two systems. A primitive is **not** an offering; we do not
  manufacture price-only "plans" to force a single target (see *Considered and rejected*).

- **The pricing rule is the boundary.** A `Plan`'s rate **is** its price — flat, possibly a
  deliberate bundle discount, never decomposed ([final-plan-pricing.md §3](../../final-plan-pricing.md)).
  A composed config's price **is** `Σ(primitive rate × quantity)`
  ([ADR 0009](0009-composable-resource-pricing-design-your-own-config.md)). "The rate is the
  price" vs "the price is the sum" is exactly the line between the two targets — keeping them
  distinct is what keeps that rule legible.

- **Future add-ons need no new surface.** An add-on (IP, snapshot, backup, transfer overage)
  is a metered single-resource `Plan` ([ADR 0008](0008-add-on-as-metered-single-resource-plan.md)),
  authored by the Configurator's simple builder like any other plan. Add-ons introduce no
  third pricing concept.

## What does not change

The rate spine and everything under it stand: `Catalog Rate`'s Dynamic-Link shape,
regional-over-global resolution, price-lock-as-grandfathering (the locked rate lives on the
`Subscription Change` row, [ADR 0010](0010-price-lock-folded-into-subscription-change.md)),
and the composed config living on the Subscription
([ADR 0009](0009-composable-resource-pricing-design-your-own-config.md)). Only the
*authoring* story is unified; storage, resolution, and locking are untouched. This is a
KISS consolidation of how prices are *set*, not a change to how they are *stored* or
*charged*.

## Consequences

- **The Configurator gains a component-rate-card step**, beside its preset and
  simple-plan builders: set the per-unit rate for each `Resource Type` × currency ×
  cluster. `update_component_rate` ([issue #79](../../issues/79-per-resource-rate-card.md))
  becomes the Configurator's internal write rather than a parallel public path.

- **The "set one, forget the other" drift becomes structurally hard.** One screen shows the
  whole picture — presets, the component card, add-ons — so an incomplete card is visible
  *before* a region offers composed configs, instead of surfacing as a `$0` estimate. (The
  console already refuses to offer a custom config when its card is incomplete; this fixes
  the cause, not just the symptom.)

- **A composed config is offered only where its component card is complete** for the team's
  currency and region — and the Configurator is where that completeness is made true.

- **The Configurator can sanity-check pricing**: warn when a preset's flat rate sits below
  its component sum (an intended discount) or above it (a likely mispricing), since it now
  sees both numbers.

## Considered and rejected

**Full collapse — everything priced is a `Plan`.** Make `Compute` / `Memory` / `Disk`
per-unit *component* Plans, drop `Resource Type` as a price target, and resolve a composed
config as `Σ(component-Plan rate × qty)`; one `priced_doctype`, end of story. Rejected: it
manufactures **degenerate plans** — a bare `$/vCPU` with no allowance, no composition, never
sold standalone — which muddies the very thing [ADR 0008](0008-add-on-as-metered-single-resource-plan.md)
bought ("a `Plan` is a sellable offering"). The uniformity is cosmetic: both targets already
share one table and one resolver, so single-`priced_doctype` buys almost nothing while
costing a migration and a new class of non-offering Plans. Revisit only if a primitive ever
becomes independently sellable (at which point it *is* an offering, and becomes a Plan
honestly).

## Supersedes / amends

- **Amends the authoring half of [ADR 0009](0009-composable-resource-pricing-design-your-own-config.md):**
  the component rate card is authored by the Plan Configurator, not a standalone seed +
  endpoint. The data model (`Catalog Rate` on `Resource Type`) is unchanged.
- **Amends [issue #79](../../issues/79-per-resource-rate-card.md):** `update_component_rate`
  is the Configurator's internal write; the seed is fresh-install defaults only.
- Builds on [ADR 0007](0007-polymorphic-catalog-category-masters.md) (the `Resource Type`
  master) and [ADR 0008](0008-add-on-as-metered-single-resource-plan.md) (offerings folded
  into `Plan`). Updates [final-plan-pricing.md §4/§11](../../final-plan-pricing.md) to name
  the Configurator as the single pricing authority.
