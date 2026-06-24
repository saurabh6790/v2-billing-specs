# Add-on as a metered, single-resource Plan — retire the Add-on doctype

Date: 2026-06-24

[ADR 0007](0007-polymorphic-catalog-category-masters.md) made the catalog polymorphic
and, in doing so, quietly dissolved most of what made `Add-on` a separate thing:

- **Rates are already unified.** `Catalog Rate` is a Dynamic Link priced for a
  `Plan` *or* an `Add-on`, region × currency — one rate spine, two priced doctypes.
- **Single-resource plans already exist.** The `simple` configurator builder authors a
  `Plan` whose composition is one `Plan Includes` row (AI Tokens, SaaS Storage, Remote
  Storage). Structurally that *is* an add-on: one `resource_type` + `unit` + a rate.

What's left of `Add-on` is a near-duplicate of `Plan` carrying three billing-behaviour
fields and a different attachment model:

- `billing_type` (`Fixed` / `Metered`), `billing_interval` (`Hourly` / `Daily` /
  `Monthly`), `pricing_mode` (`Grandfathered` / `Live`) — semantics `Plan` lacks
  (a Plan is flat-rate per `billing_cycle`).
- **Attachment by resource_type, not by subscription.** An Add-on is *not* attached to
  a subscription. `revenue/metering.py` looks it up globally —
  `get_value("Add-on", {"resource_type": ...})` — so an Add-on is really "the metered
  per-unit price + cadence for a resource type" (Transfer overage @ ₹0.80/GB), keyed by
  its resource.

So the catalog now has two doctypes for "a priced resource," differing only in billing
metadata that could live on the family. That metadata *was* meant to live there:
ADR 0007 specced `default_billing_type` / `default_pricing_mode` / `billable_unit` /
`meter_kind` on `Plan Category`, but they shipped unread and were dropped as dead weight
(patch `v18_drop_unused_category_billing_meta`). This ADR brings them back **with a
consumer**.

A throwaway prototype (`central/billing/_prototype_addon_as_plan/`, since deleted) drove
the model end-to-end and it held: resolution by `resource_type`, regional-over-global
rate selection, Grandfathered (locked rate) vs Live (re-priced) after a rate change,
unmodelled-resource errors, and "a multi-include bundle is never a metering target." It
surfaced exactly one decision — uniqueness — captured below.

## Decision

**Delete the `Add-on` doctype. An add-on is a metered, single-resource `Plan`. The
billing behaviour moves onto `Plan Category`; metering resolves the metered Plan by its
single include's `resource_type`.**

- **`Plan Category` regains billing semantics — now consumed:**
  - `billing_type` (`Fixed` / `Metered`) — Fixed = flat per `billing_cycle`; Metered =
    per-unit usage billing.
  - `billing_interval` (`Hourly` / `Daily` / `Monthly`) — the metering cadence (Metered
    only).
  - `pricing_mode` (`Grandfathered` / `Live`) — Grandfathered bills the rate locked at
    provision time; Live re-prices at the current `Catalog Rate` ([ADR 0002](0002-live-priced-storage-add-ons.md)).

  These replace the identically-named fields on `Add-on`. A family is metered or flat;
  individual plans inherit it. (If a future family ever needs a per-plan override, it
  becomes a Plan field then — not now.)
- **A "metered plan" is a `Plan` whose category is `Metered` and whose composition is a
  single `Plan Includes` row.** A multi-resource bundle is never a metering target.
- **Metering resolves by resource type.** `revenue/metering.py`'s
  `get_value("Add-on", {"resource_type": ...})` becomes "find the metered single-resource
  Plan whose include matches this resource type." `Catalog Rate.priced_doctype` for these
  rows becomes `Plan`.
- **Uniqueness is an explicit validation rule.** At most one *active* metered
  single-resource Plan may exist per `resource_type`, so resolution is unambiguous.
  Today's `get_value` already assumes this and silently picks one row; making it a
  validation surfaces the collision instead of hiding it. (`Plan.validate`: reject a
  second active metered plan for a resource another active metered plan already covers.)

## What does **not** change

The billing spine is untouched. `Catalog Rate` (Dynamic Link, region × currency, now
`Plan`-only for these rows), price-lock/grandfathering, the metered formula
`max(0, qty − allowance) × rate`, gauge/counter integration, commitment, and invoicing
all stand. The prototype confirmed the two pricing modes behave exactly as `metering.py`
does today. **The change is contained to the catalog taxonomy and metering's lookup —
not the engine that prices, locks, or bills.**

## Consequences

- One priced entity instead of two. The `Add-on` doctype, `add_on_dashboard.py`, and the
  Add-on branch of every catalog/pricing/metering/invoicing path go away; `Catalog
  Rate`'s `priced_doctype` collapses toward `Plan` for these rows.
- **Migration required:** every `Add-on` becomes a `Plan` (single-resource, under a
  metered category seeded with the Add-on's `billing_type`/`interval`/`pricing_mode`);
  repoint its `Catalog Rate` rows from `priced_doctype=Add-on` to `Plan`; rewrite
  metering/commitment references. Billing-neutral: a migrated overage resolves the same
  rate it did as an Add-on.
- The uniqueness rule is a guardrail the old global lookup never had — no more "two
  Add-ons for Transfer, whichever the query returns first."
- `Plan Category` becomes the single home for "is this family flat or metered, and how is
  it priced" — finishing the self-describing-category intent of ADR 0007 (this time wired
  into metering, which is why v18's unused fields are safe to re-add).
- Risk: families that are *both* a bundled allowance and metered overage (AI Tokens) must
  still model the allowance on the base plan and the overage as the metered plan — the
  prototype validated the overage half; the allowance interaction is the integration risk
  to verify in the slice.
