# Polymorphic catalog — product families as masters, not enums

Date: 2026-06-23

The catalog was born VM-shaped. The taxonomy that decides *what kind of thing a plan
is* lived in three frozen `Select` enums:

- `Plan.plan_class` — `General / CPU Optimised / Memory Optimised / Storage Optimised / Custom`
- `Plan Includes.resource_type` and `Add-on.resource_type` — `Compute / Memory / Disk / Transfer / IP / Snapshot`
- the `Plan Configurator`'s sizing math — hardcoded vCPU → memory-ratio → disk → transfer rungs

That was fine while everything sold was a VM. It no longer is. Three new product
families are coming:

- **AI tokens** — billed by consumption (metered), and/or a bundled allowance with
  overage. No vCPU, no disk; the billable primitive is a *token*.
- **Frappe Suite SaaS sites** — billed on **disk only**, Dropbox/GDrive style. The
  customer never sees vCPU or RAM.
- **Frappe Box** — a hardware device with preinstalled Frappe; the customer subscribes
  to **remote storage** for data, or to **backups/snapshots**. Storage is the *primary*
  product here, not a VM add-on.

Adding each of these to the enums means editing core schema, touching the
VM-assuming configurator, and reasoning about whether `resource_type = Tokens` is even
coherent next to `Compute`. The enum is the proliferation trap that
[final-plan-pricing.md §5](../../final-plan-pricing.md) already rejected one level up:
*"flexible by documents, never by plan proliferation."* The same principle says the
taxonomy itself must be data, not code.

A second, smaller pressure: **IP** and **Snapshot** were never resource *types* in the
way Compute/Memory/Disk are. They are things billed independently of any bundle's
composition — add-ons (IP) or stand-alone live-priced products (Snapshot/Storage, which
*is* the Frappe Box offering). Keeping them in the core `resource_type` enum conflated
"a primitive a bundle is composed of" with "a thing a team can buy on its own."

## Decision

**The catalog becomes polymorphic across product families, driven by masters instead of
enums. A `Plan Category` master carries the behavior of a family; a `Plan Sub-Category`
master is the variant layer beneath it; a `Resource Type` master replaces the
composition enum. The Plan Configurator dispatches to a per-category builder.**

- **`Plan Category`** (master, behavioral, **self-describing**) — the product family
  (`VM Plans`, `AI Tokens`, `SaaS Storage`, `Remote Storage`). It is not a label; it
  carries the family's rules *and its own vocabulary* so authoring and billing-data
  collection are self-explanatory:
  - `allowed_resource_types` — which `Resource Type`s may appear in a member plan's
    `includes` (VM Plans → Compute/Memory/Disk/Transfer; AI Tokens → Tokens; Remote
    Storage → Storage/Backup).
  - `default_billing_type` — `Fixed` / `Metered` / `Tiered` for the family.
  - `default_pricing_mode` — `Grandfathered` / `Live` (Remote Storage defaults `Live`,
    inheriting [ADR 0002](0002-live-priced-storage-add-ons.md)).
  - `billable_unit` — the human-readable thing billing counts (`vCPU bundle / month`,
    `1M tokens`, `GB-day`). This is the answer to *"what data do we collect to bill
    this family?"* — the Category states it.
  - `meter_kind` — `none (flat)` / `counter` / `gauge`, wiring straight into existing
    metering ([metering.md](../../metering.md)): counter for tokens, gauge for storage
    GB-days, none for flat bundles.
  - `sub_category_label` — what a sub-category *means* for this family, so the picker
    reads "Optimization profile" (VM Plans) or "Storage purpose" (Remote Storage)
    rather than a generic "Sub-Category". Blank ⇒ the family has no sub-category axis.
  - `configurator_builder` — which builder authors the family (`vm_rungs` | `simple`).
  - `description` — one line surfaced in the configurator.
- **`Plan Sub-Category`** (master, **optional**) — a variant within one family,
  `Link`ing to its `Plan Category`. Used **only where a real variant axis exists**:
  VM Plans → `CPU Optimised` / `Memory Optimised` / `General Purpose`; Remote Storage →
  `Data` / `Backups` / `Snapshots`. A family with no natural variant (AI Tokens, flat
  SaaS Storage) has **no sub-category** — the plan sits directly under its Category, and
  the UI does not force one. This **replaces `Plan.plan_class`** (which was mandatory and
  VM-only). A "Custom" authoring run, when the family *does* use sub-categories, mints a
  new Sub-Category *first*, then the plans and rates beneath it.

### Worked catalog (the families, concretely)

| Category | Sub-Category (`sub_category_label`) | Resource type(s) | Billing type | `billable_unit` | `meter_kind` | Builder |
|----------|------------------------------------|------------------|--------------|-----------------|-------------|---------|
| **VM Plans** | Optimization profile — General / CPU / Memory / Storage Opt. | Compute, Memory, Disk, Transfer | Fixed | vCPU bundle / mo | none (flat) | `vm_rungs` |
| **AI Tokens** | *(none by default; optional "Packaging": PAYG / Token Pack)* | Tokens | Metered (allowance + overage) | 1M tokens | counter | `simple` |
| **SaaS Storage** | *(none; optional by suite)* | Disk | Fixed *or* Metered | GB / mo *or* GB-day | gauge | `simple` |
| **Remote Storage** (Frappe Box) | Storage purpose — Data / Backups / Snapshots | Storage, Backup | Metered, live-priced | GB-day | gauge | `simple` |
- **`Resource Type`** (master) — `Compute`, `Memory`, `Disk`, `Transfer`, `Tokens`,
  `Storage`, `Backup`. `Plan Includes.resource_type` and `Add-on.resource_type` become
  `Link → Resource Type`. **`IP` and `Snapshot` are removed from the core set**: `IP`
  is an `Add-on`; `Snapshot`/`Storage` is a live-priced `Add-on` *or* the primary
  product of the `Remote Storage` category (Frappe Box). A Category enforces its
  `allowed_resource_types` on member plans' composition.
- **Configurator dispatch** — the configurator reads `Category.configurator_builder` and
  runs the matching builder. `vm_rungs` is the existing vCPU/memory/disk/transfer flow,
  unchanged. `simple` is a new minimal builder (name + included quantity + unit + rates)
  that covers AI Tokens, SaaS Storage, and Remote Storage today. New rung-style families
  add a builder only when one is genuinely needed.

## What does **not** change

The billing spine is untouched. `Catalog Rate` (Dynamic Link, region × currency),
price-lock/grandfathering, the metered formula `max(0, qty − allowance) × rate`, gauge
integration for storage, commitment, and invoicing all stand. AI tokens "metered or
bundled or both" is the existing allowance+overage path with `Resource Type = Tokens`;
SaaS-disk and Frappe-Box-storage are plans whose composition is a single non-compute
resource. **The redesign is contained to the catalog taxonomy and the configurator** —
not the engine that prices, locks, or bills.

## Consequences

- New product families are added by creating a `Plan Category` document (+ its rules)
  and authoring plans — **zero core-schema change** for families that fit an existing
  builder.
- Migration is required: backfill `plan_class` values into `Plan Sub-Category` (+ a
  `VM Plans` Category) and rewrite `resource_type` enum values to `Resource Type` links;
  reclassify existing `IP`/`Snapshot` rows as add-ons. Seed the masters with the
  current VM taxonomy so nothing in flight breaks.
- Category-level validation (`allowed_resource_types`) gives the catalog a guardrail the
  enum never had: a Tokens plan can't accidentally include Disk.
- The configurator gains a dispatch seam; the VM rung math is preserved verbatim behind
  the `vm_rungs` builder, so existing VM authoring is unaffected.
