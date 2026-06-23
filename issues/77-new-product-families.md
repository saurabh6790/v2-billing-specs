# 77 — New product families live: AI Tokens, SaaS Storage, Remote Storage (Frappe Box)

**Type:** AFK · **Milestone:** PC · **Spec:** [final-plan-pricing.md §5.1](../final-plan-pricing.md) · **ADR:** [0007](../docs/adr/0007-polymorphic-catalog-category-masters.md)

## What to build

Stand up the three non-VM families on the taxonomy from [#75](75-catalog-taxonomy-masters.md), authored via the `simple` builder from [#76](76-category-aware-configurator.md). Demonstrate each one collects the right data and reaches a billable line item through the **existing** engine — no new billing math.

### Resource Types + Categories (seed)

- Resource Types: `Tokens`, `Storage`, `Backup` (activate the ones reserved in #75).
- **AI Tokens** — `allowed_resource_types = Tokens`, `default_billing_type = Metered`, `billable_unit = 1M tokens`, `meter_kind = Counter`, `sub_category_label = ` (blank — **no sub-categories by default**), `configurator_builder = simple`.
- **SaaS Storage** — `allowed_resource_types = Disk`, `default_billing_type = Fixed`, `billable_unit = GB / mo`, `meter_kind = Gauge`, `sub_category_label = ` (blank), `configurator_builder = simple`.
- **Remote Storage** (Frappe Box) — `allowed_resource_types = Storage, Backup`, `default_billing_type = Metered`, `default_pricing_mode = Live`, `billable_unit = GB-day`, `meter_kind = Gauge`, `sub_category_label = Storage purpose`, sub-categories `Data / Backups / Snapshots`, `configurator_builder = simple`.

### IP & Snapshot reclassification (closes the #75 flag)

- The IP/Snapshot rows #75 logged become **Add-ons** (not resource types): `IP` → grandfathered add-on; `Snapshot`/`Storage` → live-priced add-on (reuses [ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)) and/or a Remote Storage plan. Migration converts/relinks them; no orphaned price-locks.

### Billing-data wiring (reuse, don't reinvent)

- **AI Tokens**: token consumption recorded via the existing **counter** meter ([#12](12-metered-billing-usage-meter.md)); "metered or bundled or both" = `max(0, tokens − allowance) × rate` — a Token Pack plan carries an allowance, pure PAYG carries allowance 0.
- **Remote Storage / SaaS-by-GB-day**: GB-days via the existing **gauge** meter (snapshot path, [#57](57-snapshot-gauge-metering.md)); Remote Storage rate read live per period.
- **SaaS Storage flat tier**: a fixed bundle whose composition is a single Disk include — bills like any bundle, time-prorated.

## Acceptance criteria

- [ ] The three Categories + `Tokens/Storage/Backup` Resource Types are seeded with the rules above.
- [ ] AI Tokens: a plan authored with allowance N bills `max(0, tokens − N) × rate` from a counter rollup; PAYG (allowance 0) bills every token. No vCPU/disk anywhere in the flow.
- [ ] SaaS Storage: a disk-only plan with **no sub-category** is sellable; the customer-facing surface shows only storage (no vCPU/RAM).
- [ ] Remote Storage: a `Snapshots` (or `Data`) plan bills `GB-days × live_rate` via the gauge meter, rate read live per period.
- [ ] IP/Snapshot rows from #75 are reclassified to Add-ons (IP grandfathered, Snapshot live-priced) with price-locks intact; no row left as a core resource type.
- [ ] `Plan.validate` keeps each family inside its `allowed_resource_types` (e.g. an AI Tokens plan can't include Disk).
- [ ] Test per family: author → resolve `Catalog Rate` → produce a correct invoice line item end-to-end.

## Blocked by

- [#75](75-catalog-taxonomy-masters.md) (masters + IP/Snapshot flag)
- [#76](76-category-aware-configurator.md) (the `simple` builder authors these)

Soft dependencies: [#12](12-metered-billing-usage-meter.md) (counter/gauge meters), [#57](57-snapshot-gauge-metering.md) (gauge GB-days), [ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md) (live pricing).
