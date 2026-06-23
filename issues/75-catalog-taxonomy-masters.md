# 75 — Catalog taxonomy masters: Plan Category + Plan Sub-Category + Resource Type

**Type:** AFK · **Milestone:** PC · **Spec:** [final-plan-pricing.md §5.1](../final-plan-pricing.md) · **ADR:** [0007](../docs/adr/0007-polymorphic-catalog-category-masters.md)

## What to build

Replace the VM-shaped `Select` enums (`Plan.plan_class`, `*.resource_type`) with three masters so new product families are data, not schema. This is the foundation slice — no new families and no configurator change yet, just the taxonomy spine and a clean migration off the enums.

### DocTypes

- **`Plan Category`** (master, behavioral, self-describing) — fields:
  - `category_name` (Data, autoname) · `is_active` (Check)
  - `allowed_resource_types` (Table → child with a `Link → Resource Type`)
  - `default_billing_type` (Select: Fixed / Metered / Tiered)
  - `default_pricing_mode` (Select: Grandfathered / Live)
  - `billable_unit` (Data — e.g. `vCPU bundle / mo`, `1M tokens`, `GB-day`)
  - `meter_kind` (Select: None / Counter / Gauge)
  - `sub_category_label` (Data — blank ⇒ family has no sub-category axis)
  - `configurator_builder` (Select: vm_rungs / simple)
  - `description` (Small Text)
- **`Plan Sub-Category`** (master, **optional**) — `sub_category_name` (Data), `category` (Link → Plan Category, required), `is_active` (Check). Unique on `(category, sub_category_name)`.
- **`Resource Type`** (master) — `resource_type_name` (Data, autoname), `is_active` (Check).

### Schema changes

- `Plan`: **drop `plan_class` (Select)**; add `category` (Link → Plan Category, **required**) and `sub_category` (Link → Plan Sub-Category, **optional**, filtered to the chosen category).
- `Plan Includes.resource_type` and `Add-on.resource_type`: `Select` → `Link → Resource Type`.

### Seed (current VM taxonomy — nothing in flight breaks)

- Resource Types: `Compute, Memory, Disk, Transfer` (+ `Tokens, Storage, Backup` reserved for [#77](77-new-product-families.md)).
- Category `VM Plans`: `allowed_resource_types = Compute/Memory/Disk/Transfer`, `default_billing_type = Fixed`, `billable_unit = vCPU bundle / mo`, `meter_kind = None`, `sub_category_label = Optimization profile`, `configurator_builder = vm_rungs`.
- Sub-Categories under `VM Plans`: `General Purpose, CPU Optimised, Memory Optimised, Storage Optimised`.

### Validation

`Plan.validate`: every `Plan Includes.resource_type` must be in its `category.allowed_resource_types` — a Tokens plan can't include Disk.

### Migration (v-next patch)

- Create the masters + VM seeds above.
- Backfill: every existing `Plan.plan_class` → matching `Plan Sub-Category` (and `category = VM Plans`); `Custom` → leave `sub_category` blank under `VM Plans`.
- Rewrite `Plan Includes.resource_type` / `Add-on.resource_type` string values to the seeded `Resource Type` links.
- Existing rows with `resource_type in (IP, Snapshot)` are **flagged for reclassification** in [#77](77-new-product-families.md) (do not silently drop); patch logs them.

## Acceptance criteria

- [ ] `Plan Category`, `Plan Sub-Category`, `Resource Type` DocTypes exist with the fields above.
- [ ] `Plan.plan_class` is gone; `category` (required) + `sub_category` (optional) exist; `sub_category` is filtered to the selected category.
- [ ] `Plan Includes.resource_type` and `Add-on.resource_type` are `Link → Resource Type`.
- [ ] Seeds load: `VM Plans` Category, its four Sub-Categories, the four core Resource Types.
- [ ] `Plan.validate` rejects an include whose resource type is not in the category's `allowed_resource_types`.
- [ ] Migration backfills existing Plans' `category`/`sub_category` from `plan_class` and rewrites resource-type strings to links with **zero data loss**; IP/Snapshot rows are logged for #77.
- [ ] Test: a plan saved with an off-family resource type is rejected; a migrated VM plan resolves the same `Catalog Rate` as before (taxonomy change is billing-neutral).

## Blocked by

- [#27](27-rates-standalone-doctype-migration.md) (Catalog Rate is the rate spine these masters sit alongside) — soft; assumes the current catalog exists ([#01](01-app-scaffold-plan-catalog.md)).
