# Composable resource pricing — design-your-own config beside curated presets

Date: 2026-06-30

The catalog was born selling fixed bundles: a `Plan` is *one* sellable shape
(`2 vCPU · 4 GB · 40 GB`) carrying *one* opaque price, and the
[final-plan-pricing.md §3](../../final-plan-pricing.md) axiom forbids ever decomposing it:

> *"There is no `price_per_unit`… a Bundle → the rate **is** the price. Never summed from
> priced sub-resources."*

That axiom earned its keep — it is what stopped a rate bump from forking a new plan and
flooding the catalog (the v1 proliferation trap). But it also means the only way to offer a
different size is to author another bundle, and the customer can only ever pick a point we
pre-baked. We now want **design-your-own config**: a customer slides vCPU / RAM / disk to
the size they actually need, sees the price update live, and provisions it — alongside a
**few curated presets** for people who just want a sensible default.

A custom config cannot be a pre-authored `Plan` (there are effectively infinite of them —
the proliferation trap, returned). And it cannot be priced by a flat bundle rate, because
no such rate was ever authored for an arbitrary shape. It can only be priced **from its
parts**: `1 vCPU = $1/mo`, `1 GB RAM = $1/mo`, `1 GB disk = $0.50/mo`. So for the compute
family the §3 axiom is now wrong, and we replace it — narrowly, and without disturbing the
parts of the spine that earned the axiom.

## Decision

**The compute family gains a second pricing mode. A `Plan` becomes a curated *preset*
(flat rate, possibly discounted); a *custom config* is priced à la carte as
`Σ(quantity × per-resource rate)`. The composition a customer actually runs lives on the
Subscription, not on a per-config Plan. The per-resource rate card reuses the existing
`Catalog Rate` spine.**

- **Per-resource rate card via `Catalog Rate`.** [ADR 0007](0007-polymorphic-catalog-category-masters.md)
  already made `Resource Type` a master. We make those masters **priceable** through the
  existing `Catalog Rate` Dynamic Link — `priced_doctype = Resource Type`,
  `priced_for = Compute`, `rate = $1 / vCPU / mo`, region × currency. No new rate doctype,
  no new resolution code, no new lock mechanism: the component rate card is just more
  `Catalog Rate` rows, resolved regional-over-global exactly like a plan rate.

- **Two modes, one seam.**
  - **Preset (flat).** A `Plan` with a curated `Catalog Rate`, billed and grandfathered
    exactly as today. A preset's price **may sit below its component sum** — a deliberate
    bundle discount. The discount is a property of *subscribing to the preset*, not of its
    shape: a hand-built custom config that happens to match a preset's shape pays the
    component sum, not the discounted rate.
  - **Composed (à la carte).** Price `= Σ(include.quantity × component_rate)`. No curated
    rate exists; the price is always its parts.

- **The config lives on the Subscription, not a per-config Plan.** Presets remain `Plan`
  templates (a few). When a customer provisions — preset *or* custom — the chosen
  composition and the rates in force are written onto the **Subscription**, which becomes
  the source of truth for what is billed. A custom config mints **no** `Plan`; this is what
  keeps "infinite shapes" off the catalog-proliferation path.

- **Price-lock locks the component rates; resize re-resolves.** At provision Central
  resolves the component rates live and **locks** them (shown = locked), writing the
  composition into the price-lock + `subscribed` event. While the config is unchanged the
  locked rates hold (grandfathered — a later rate-card change does not touch a running
  config). A **resize** (the slider moved and confirmed) is a `changed` event exactly like
  [issue #54](../../issues/54-changed-event-resize-plan-change.md): the open segment closes,
  a new segment opens with the new composition **re-resolved at the current rate card**, and
  a new lock is appended. Grandfathering protects only the *unchanged* config — now at
  component granularity. Switching modes (slide off a preset → composed, or pick a preset →
  flat) is the same `changed` event.

- **Proportionality lives on `Plan Sub-Category`.** The optimization profile already carries
  the RAM:CPU ratio; it is promoted from a configurator *pre-fill default* to a **runtime
  constraint** and gains **bounds**: min/max vCPU, the allowed vCPU step set, and the disk
  range. The customer slider snaps vCPU to a step and **auto-derives RAM = vCPU × ratio**, so
  an off-ratio shape (`3 vCPU · 1 GB`) is impossible by construction; disk is an independent
  bounded slider. The live price recomputes from the rate card and the slider caps its own
  reach at the team's remaining trust-tier headroom, re-validated server-side at provision.

- **Eligibility surfaces a rate card, not just a plan list.** `get_eligible_plans` returns,
  in addition to the curated presets, the **component rate card + the profile's bounds + the
  headroom ceiling** so the slider can compute and bound itself; provision re-validates
  composition, ratio, bounds, and headroom server-side.

- **Composed invoice lines are itemized.** A composed subscription bills **one line item per
  resource component** (`Compute 2 vCPU × $1`, `Memory 4 GB × $1`, `Disk 40 GB × $0.50`),
  time-prorated by days alive — the transparency is the point of à-la-carte pricing. A preset
  still bills its single flat line.

## What does **not** change

The rate spine and everything downstream of it stand. `Catalog Rate`'s Dynamic-Link shape,
regional-over-global resolution, the segmented two-phase invoice
([invoicing.md](../../invoicing.md), issue #09), the `changed`-event re-lock flow
([issue #54](../../issues/54-changed-event-resize-plan-change.md)), the metered formula
`max(0, qty − allowance) × rate`, commitment, and price-lock-as-grandfathering are reused
verbatim. The compute family's "alive bills the full config, time-prorated; only terminate
stops compute" rule ([final-plan-pricing.md §7](../../final-plan-pricing.md)) is unchanged —
a *config* now sits where a *bundle rate* did. **The change is contained to: a second
pricing mode for the compute family, the Subscription carrying the composition, and the
slider constraints on the Sub-Category.** The §3 flat-rate axiom is *not* deleted globally —
it still governs presets and the token/storage families; it is replaced only for the
composed compute path.

## Consequences

- **§3 is no longer absolute.** `final-plan-pricing.md` must record two compute pricing
  modes (preset-flat vs composed) and the rule that a price *may* be summed from parts in
  the composed mode. The flat-rate axiom survives for presets and non-compute families.
- **`Resource Type` becomes priceable.** New `Catalog Rate` rows with
  `priced_doctype = Resource Type` form the component rate card; admin tooling
  (`update_plan_rate`) gains a sibling for editing component rates.
- **The Subscription gains a pricing-mode axis and a composition.** A subscription/segment is
  either `preset` (links a `Plan`, bills its flat rate) or `composed` (carries `includes` +
  the locked component rates). Invoicing branches on this seam.
- **`Plan Sub-Category` gains bounds** (min/max vCPU, step set, disk range) on top of the
  existing ratio, and those bounds become a validated constraint at provision/resize, not
  just an authoring hint.
- **The configurator's role narrows for compute.** It still authors the curated presets and
  seeds the **component rate card**; it no longer needs to bake a full doubling ladder of
  shapes, because the slider covers the continuum between presets.
- **Migration is light and billing-neutral.** Existing VM bundles stay as presets with their
  current flat rates and locks untouched; no running subscription re-prices. The only new
  data is the component rate card (`Catalog Rate` rows per `Resource Type`) and the
  Sub-Category bounds. Nothing migrates *off* the old model — composed pricing is purely
  additive.
- **Risk to verify in the slice:** the preset↔composed mode switch on resize (does a customer
  sliding off a preset cleanly lose the discount and land on component pricing, with correct
  segment proration across the switch), and headroom enforcement on a *continuously* priced
  slider rather than a discrete affordable-plan list.
