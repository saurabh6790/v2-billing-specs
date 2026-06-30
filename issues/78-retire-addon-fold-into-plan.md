# 78 — Retire Add-on: fold into a metered, single-resource Plan

**Type:** AFK · **Milestone:** PC · **Spec:** [final-plan-pricing.md §5](../final-plan-pricing.md) · **ADR:** [0008](../docs/adr/0008-add-on-as-metered-single-resource-plan.md)

## What to build

Delete the `Add-on` doctype. An add-on becomes a **metered, single-resource `Plan`**: the billing behaviour (`billing_type` / `billing_interval` / `pricing_mode`) moves onto `Plan Category`, and metering resolves the metered Plan by its single include's `resource_type` instead of `get_value("Add-on", {...})`. Rates are already unified under `Catalog Rate` ([#27](27-rates-standalone-doctype-migration.md)); this slice unifies the priced *entity*. Validated by a throwaway prototype (`central/billing/_prototype_addon_as_plan/`) before specing.

### Schema changes

- **`Plan Category`** — re-add (now with a consumer; they were dropped unused in `v18`):
  - `billing_type` (Select: `Fixed` / `Metered`)
  - `billing_interval` (Select: `Hourly` / `Daily` / `Monthly`) — Metered cadence
  - `pricing_mode` (Select: `Grandfathered` / `Live`)
  - Leading-blank options where a default would otherwise mislead; `Fixed` is the sensible default for `billing_type`.
- **`Plan`** — no new fields. A "metered plan" is `category.billing_type == "Metered"` **and** exactly one `Plan Includes` row.
- **`Add-on`** — **deleted** (doctype, `add_on.py`, `add_on_dashboard.py`).
- **`Catalog Rate`** — `priced_doctype` rows for former Add-ons repoint to `Plan`.

### Logic changes

- **`revenue/metering.py`** — replace `_addon_for(resource_type)` / `get_value("Add-on", {"resource_type": ...})` with "the active metered single-resource Plan whose include matches `resource_type`." Keep both pricing modes verbatim: Grandfathered = the price-lock's `locked_rate`; Live = `resolve_rate` at current `Catalog Rate`.
- **`catalog/pricing.py`, `revenue/invoicing/lines.py`, `api/admin/catalog.py`, `api/dashboard/_shared.py`, the billing workspace** — drop the `Add-on` branch; route through `Plan`.
- **`get_eligible_plans`** ([#33](33-plan-configurator-authoring-ui.md) area) already filters to `provision_target == "Server"`, so metered/overage plans never leak into the create-server menu — no change needed, but add a regression test.

### Validation

`Plan.validate`: at most **one active** metered single-resource Plan per `resource_type` — reject a second so metering's resolution is unambiguous (the old global lookup silently picked one).

### Migration (v-next patch)

- Seed/ensure a metered category per distinct former-Add-on `(billing_type, billing_interval, pricing_mode)` signature (or carry the values onto the existing family the resource belongs to).
- For each `Add-on`: create a `Plan` (single include = the Add-on's `resource_type` + `unit`, under the matching metered category); repoint its `Catalog Rate` rows from `priced_doctype=Add-on` to `Plan`.
- Rewrite metering / commitment / invoicing references to the new Plan.
- Delete `Add-on` rows last. **Zero billing change:** a migrated overage resolves the same rate it did as an Add-on.

## Acceptance criteria

- [ ] `Plan Category` carries `billing_type` / `billing_interval` / `pricing_mode`; the `Add-on` doctype and its dashboard/controller are gone.
- [ ] Metering resolves the metered Plan by `resource_type`; Grandfathered bills the locked rate and Live re-prices at the current `Catalog Rate` (parity with pre-refactor `metering.py`).
- [ ] `Plan.validate` rejects a second active metered plan for a `resource_type` already covered.
- [ ] Migration converts every Add-on to a metered single-resource Plan and repoints its `Catalog Rate` rows with **zero billing change** (a migrated overage bills identically).
- [ ] No `Add-on` references remain in `catalog/`, `revenue/`, `api/`, or the workspace.
- [ ] Tests: metered usage bills correctly (regional-over-global rate); Grandfathered vs Live after a rate change; an unmodelled resource errors; a duplicate metered plan for one resource is rejected; the create-server menu still excludes metered plans.

## Blocked by

- [#75](75-catalog-taxonomy-masters.md) (Plan Category / Resource Type masters — done)
- [#76](76-category-aware-configurator.md) (the `simple` builder that authors single-resource plans — done)
- Soft: [#12](12-metered-billing-usage-meter.md) (Usage Meter is what consumes the resolved metered Plan)

## Notes

- AI Tokens "bundled allowance + metered overage" keeps the allowance on the base plan and the overage as the metered plan — verify this interaction in the slice (the prototype validated the overage half only).
- The prototype (`central/billing/_prototype_addon_as_plan/`) and its `NOTES.md` capture the validated model; delete it once this lands.
