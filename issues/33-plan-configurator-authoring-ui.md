# 33 — Plan Configurator authoring UI

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [final-plan-pricing.md](../final-plan-pricing.md) §4, §11

## What to build

An admin authoring flow that makes bundles consistent to *build* without changing the data or billing model. The configurator's resource math is **authoring-only**: it pre-fills memory from vCPU and writes plain `quantity` / `unit` into `Plan Includes` (composition, no price). Billing never sees millicores or ratios.

Flow: pick the memory **ratio** (1:2 standard / 1:4 high-memory) → pick **vCPU** (`1 vCPU = 1000 millicores`; sizes `0.125, 0.25, 0.5, 1, 2, …`) → **auto-fill memory** from the ratio → add **disk** size → save the bundle identity + `includes`. The ratio is a **pre-fill default, not a constraint** — the admin may override the derived memory (e.g. `1 vCPU + 3 GB` off-ratio). Rates are authored separately as `Catalog Rate` documents ([#27](27-rates-standalone-doctype-migration.md)) and are out of scope here.

## What to build (changes)

1. **Configurator UI** (desk form helper or portal admin) — ratio selector, vCPU selector, auto-filled-but-editable memory, disk input.
2. **Write-through** — on save, emit plain `Plan Includes` rows (`resource_type`, `quantity`, `unit`); **no schema change** to `Plan` / `Plan Includes`.
3. **Override allowed** — editing the auto-filled memory off-ratio is permitted and persists.

## Acceptance criteria

- [ ] Selecting a ratio + vCPU auto-fills memory (`0.125 vCPU, 1:2 → 0.25 GB`); the field stays editable.
- [ ] Saving writes plain `quantity` / `unit` rows into `Plan Includes`; no millicores or ratio are stored.
- [ ] An off-ratio override (e.g. `1 vCPU + 3 GB`) saves and is preserved.
- [ ] No change to the `Plan` / `Plan Includes` schema or to any billing path.
- [ ] `press_billing` test/UI checks green.

## Decisions baked in

- **Authoring-only resource model** — millicores + ratio live in the configurator, never in data or billing.
- **Ratio is a default, not a constraint** — off-ratio bundles are allowed.

## Blocked by

01 (Plan catalog — the `Plan` / `Plan Includes` this authors), 27 (`Catalog Rate` — rates authored separately).
