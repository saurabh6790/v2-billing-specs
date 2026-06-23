# 76 — Category-aware Plan Configurator: pluggable builders (vm_rungs + simple)

**Type:** AFK · **Milestone:** PC · **Spec:** [final-plan-pricing.md §11](../final-plan-pricing.md) · **ADR:** [0007](../docs/adr/0007-polymorphic-catalog-category-masters.md)

## What to build

Make the Plan Configurator the **builder for every family**, not just VMs. It reads the chosen Category's `configurator_builder` and dispatches. Two builders ship; the VM rung math is preserved verbatim behind one of them.

### Dispatch

- Configurator gains a `category` (Link → Plan Category) selector. On change it reads `category.configurator_builder` and shows the matching builder's fields; `billable_unit`, `default_billing_type`, `default_pricing_mode` pre-fill from the Category (overridable).

### `vm_rungs` builder (existing flow, refactored behind dispatch)

- The current vCPU / memory-ratio / disk / transfer rung flow, unchanged in behavior. Only its invocation moves behind the dispatch seam so it runs **only** when `configurator_builder = vm_rungs`.

### `simple` builder (new)

- Minimal authoring: `plan_name` + included `quantity` + `unit` (pre-filled from `billable_unit`) + per-currency/region rate rows. No sizing math.
- Composition is constrained to the Category's `allowed_resource_types` (reuse the [#75](75-catalog-taxonomy-masters.md) validation).
- Covers AI Tokens, SaaS Storage, Remote Storage with one builder.

### Plan identity: hash key + descriptive title

The configurator stops using a plan's human name as its primary key (brittle to sync —
Catalog Rate / Subscription / invoice lines all reference the Plan name).

- `Plan` autonames by **`hash`**; `title` becomes the display field (`title_field`),
  composed as **sub-category (or category) + resource info** — e.g. `CPU Optimised —
  2 vCPU, 4 GB, 80 GB`.
- The configurator no longer forces `__newname`; it lets Frappe mint the hash and records
  it on the rung's **`plan` link**. Idempotency, selection, and pricing key off `rung.plan`
  (the hash), not `rung.plan_name`.
- Existing plans keep their names (hash governs new inserts only — no rename/migration).

### Custom sub-category

- When the chosen family **uses** sub-categories (`sub_category_label` set) and the author picks **Custom**, the configurator **mints the new `Plan Sub-Category` first** (under the chosen Category), then creates the plans + `Catalog Rate` rows beneath it — in one background run, as today.
- Families with no sub-category axis skip this step (plans attach directly to the Category).

## Acceptance criteria

- [ ] Configurator has a `category` selector; switching category swaps the builder per `configurator_builder` and pre-fills `billable_unit` / billing type / pricing mode.
- [ ] `vm_rungs` produces the same bundles + composition + rates as before the refactor (regression: existing VM rung output unchanged).
- [ ] `simple` authors a plan from name + included quantity + unit + rates, with composition limited to the category's allowed resource types.
- [ ] `Plan` autonames by hash; `title` is the display field, composed as sub-category (or category) + resource info. The configurator no longer sets `__newname`.
- [ ] Re-running generation is idempotent via `rung.plan` (the hash), not the human name; pricing applies to the linked plans.
- [ ] Picking **Custom** in a sub-category-using family creates the `Plan Sub-Category` before the plans; the generated plans link to it.
- [ ] A family with blank `sub_category_label` never prompts for a sub-category and attaches plans directly to the Category.
- [ ] Test: a `simple`-built AI Tokens plan and a `vm_rungs`-built VM plan both round-trip to sellable plans with resolvable `Catalog Rate`s.

## Blocked by

- [#75](75-catalog-taxonomy-masters.md) (masters + behavioral Category fields the dispatch reads)
