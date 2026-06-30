# Billing & Pricing

The language of how Frappe Cloud v2 prices resources, locks those prices, and bills for them.
This is a glossary, not a spec — see `final-plan-pricing.md`, `plans-and-pricing.md`, and
`invoicing.md` for the design.

## Language

### Catalog

**Bundle** (a.k.a. **preset**):
A flat-rate sellable offering of bundled resources (e.g. 2 vCPU + 4 GB + 80 GB). Has **one
immutable identity forever** (`bundle-2vcpu`); a price change never forks a new one. Modelled as
the **Plan** DocType. We stock a *few*; customers size in between with a **composed config**
([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)).
_Avoid_: Plan version, tier, SKU. (A bundle is never "versioned" — see **Rate**.)

**Add-on**:
A per-unit resource billed on top of a bundle (snapshot, transfer overage, extra disk, IP).
Unlike a bundle, an add-on is `rate × quantity`. An add-on is either **grandfathered** (rate
locked at provision, like bundles) or **live-priced** (see below), set per add-on type.
_Avoid_: Extra, upsell, supplement.

**Live-priced add-on**:
An add-on whose rate is read from the current Catalog Rate **each billing period** rather than
locked at provision — the deliberate exception to grandfathering. Used for depreciating storage
(snapshot is the first member), where uniform grandfathering would strand a customer on a
stale-high rate. The customer is always on the current (typically lower) rate.
_Avoid_: Spot price, current price. (It is still a catalog rate — just read late, not locked.)

**Rate**:
The single pricing word. For a **preset** (curated `Plan`), the rate *is* the price (never
`quantity × rate`). For a **composed config**, the price is `Σ(quantity × per-resource rate)` from
the rate card ([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)).
For an **add-on**, it is the per-unit price. A rate change is a new **Catalog Rate** document,
never a new plan.
_Avoid_: Price, price_per_unit, cost, tariff.

**Preset**:
A curated `Plan` — a ready-made compute size sold at a flat rate that **may sit below its
component sum** (a bundle discount kept only while the customer sits exactly on the preset). We
stock a few. _Avoid_: "bundle" as the only sizing option. (Beyond presets, customers compose.)

**Composed config** (a.k.a. custom config):
A compute size a customer **designs on the slider** rather than picking off the shelf. Priced à la
carte as `Σ(quantity × per-resource rate)`, it mints **no `Plan`** — the chosen composition + the
locked component rates are recorded on the **Subscription**
([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)). Proportion (RAM =
vCPU × the profile's ratio) and bounds come from the `Plan Sub-Category`.
_Avoid_: minting a Plan per config. (That is the proliferation trap ADR 0009 avoids.)

**Rate card** (component rates):
The per-resource prices a composed config is summed from — `$/vCPU`, `$/GB RAM`, `$/GB disk` —
stored as ordinary `Catalog Rate` rows with `priced_doctype = Resource Type`, resolved
regional-over-global like any rate. _Avoid_: a separate "Resource Rate" doctype. (It is `Catalog Rate`.)

**Composition** (a plan's / config's *includes*):
The resources it contains (compute / memory / disk …) with their quantities. For a **preset** it is
spec-only (no price) and serves as the **allowance** baseline for add-on overage. For a **composed
config** the same quantities are *also* what the price is summed from against the rate card
([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)).
_Avoid_: decomposing a *preset* into priced parts. (Only a composed config is summed from its parts.)

**Catalog Rate**:
One standalone DocType (ERPNext `Item Price` style) holding every preset's, add-on's, and
**component**'s rate, one row per `(priced_doctype, priced_for, cluster, currency)`. `priced_for`
is a `Plan` (preset / metered add-on) or a `Resource Type` (a rate-card component, [ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)).
A new currency or region is a new Catalog Rate *document*, never a new plan and never a new column.

**Product family** (Plan Category):
What *kind of thing* a plan sells — `VM Plans`, `AI Tokens`, `SaaS Storage`, `Remote Storage` —
modelled as the **Plan Category** master ([ADR 0007](docs/adr/0007-polymorphic-catalog-category-masters.md)).
A Category is **behavioral and self-describing**: it declares the `allowed_resource_types` a member
plan may include, its `billable_unit` (what billing counts — `1M tokens`, `GB-day`), its
`meter_kind` (none / counter / gauge), its `sub_category_label`, and which `configurator_builder`
authors it. Adding a family is a new Category *document*, not a schema change.
_Avoid_: plan type, plan_class. (`plan_class` was the mandatory VM-only enum this replaces.)

**Sub-Category** (Plan Sub-Category):
An **optional** variant axis within a family — VM Plans → `CPU Optimised` / `Memory Optimised` /
`General Purpose`; Remote Storage → `Data` / `Backups` / `Snapshots`. A family with no natural
variant (AI Tokens, flat SaaS Storage) has **none** — the plan sits directly under its Category.
What the axis *means* is the Category's `sub_category_label`.
_Avoid_: requiring a sub-category everywhere. (It is optional by design.)

**Resource Type**:
A composition primitive a bundle is built from — `Compute, Memory, Disk, Transfer, Tokens,
Storage, Backup` — modelled as a master that `Plan Includes` and `Add-on` link to. A Resource Type
is also **priceable**: a `Catalog Rate` with `priced_for = Compute` is the rate-card component a
composed config is summed from ([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)).
**`IP` and `Snapshot` are not resource types**: `IP` is an add-on; `Snapshot`/`Storage` is a
live-priced add-on or the primary product of the Remote Storage family. They are billed
independently of any bundle's composition.
_Avoid_: putting IP/Snapshot in composition. (They are add-ons or their own family.)

**Minor unit**:
The smallest indivisible amount of a currency — **paisa** for INR, **cent** for USD. All settled
money (line-item amount, subtotal, total, tax, credit, balance, what the gateway charges) is a
**64-bit integer count of minor units** — never a float, never a `Currency` field. The integer ÷
the currency's per-currency factor (`100` for INR/USD, `1` for JPY, `1000` for BHD — read from the
**Currency** DocType, never hardcoded) is a display step only. See
[ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). This is the Razorpay (paise) / Stripe
(cents) charge model used as the internal representation.
_Avoid_: float rupees, `Currency` field, "amount in rupees". (₹10.00 is `1000`, not `10.0`.)

**Rate unit**:
The sub-minor scale a **per-unit rate** is stored at — minor units × 10⁶ — so a sub-paisa metered
rate (the real €0.009/GB transfer rate → `900000` rate units) is representable, mirroring Stripe's
`unit_amount_decimal`. Held as `Long Int`; the scale is currency-independent (six extra decimals).
A flat bundle rate is the whole-number case. Rounding from rate units to settled minor units happens
**once per line item** (half away from zero), never on a stored or intermediate value.
_Avoid_: storing per-unit rates in plain paisa (overcharges sub-paisa meters).

### Pricing in time

**Commitment**:
A team-level promise to keep monthly spend at or above a **floor** (e.g. ₹800/mo) for a fixed
**term** (e.g. 12 months), in exchange for a discounted rate on each monthly-in-arrears invoice.
It is **resource-agnostic** — the customer may upgrade, downgrade, or swap resources freely while
the committed spend stays at/above the floor. Frappe Cloud has no lock-in today; commitment is the
opt-in way a customer trades term for price. Dropping below the floor before term-end triggers a
**clawback**. (`billing_cycle = annual` is the first concrete commitment term.)
_Avoid_: Contract, lock-in, reservation, resource term. (Commitment never binds to a resource_id.)

**Floor**:
The minimum monthly **fixed bundle spend** a **Commitment** guarantees, measured by a team-level
spend rollup. Metered usage (snapshots, transfer) and one-off add-ons are variable — they bill at
list, never count toward the floor, and never receive the commitment discount. As long as the
floor is met, upgrades/swaps/churn between bundles are free of consequence.
_Avoid_: Minimum, quota, cap (a cap is a ceiling — the floor is the opposite).

**Clawback**:
The reconciling charge when a team drops its committed spend **below the floor** before the term
ends: it repays the discount the team enjoyed on the months already consumed. The customer repays
only the discount they got — never a fee for unrendered service, and never a charge for staying
above the floor with a different resource mix.
_Avoid_: Penalty, termination fee, cancellation charge.

**Price-lock**:
The append-only record, keyed by **resource_id**, that freezes the rate (and allowance) a specific
provisioned resource was shown at provision time. Billing reads it forever; it is how
grandfathering works. Re-provisioning yields a new resource_id and a new lock.
_Avoid_: Grandfather record, price history, snapshot (overloaded — see snapshot the resource).

**Shown rate**:
The live rate resolved for the customer's currency + cluster at purchase and displayed in the UI.
Central records it on the `subscribed` event as it provisions, so that **rate shown = rate locked**,
guaranteed (the component that shows the rate is the one that locks it — [ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).

### Resource lifecycle (billing view)

**Alive**:
A provisioned resource that is **running or stopped**. Both bill the full bundle rate — a stopped
resource still reserves its compute, so stopping does **not** reduce the bill (DigitalOcean model,
not AWS).
_Avoid_: Active, on. (Note: "alive" spans both operational states `running` and `stopped`.)

**Terminated**:
A resource that has been destroyed. Compute billing stops (the price-lock closes); only retained
**snapshots** keep billing. A snapshot is its own `resource_id` from birth (not a meter on the
VM), so it survives the VM's termination, now owned by the team and billed at the **live**
snapshot rate.
_Avoid_: Deleted, cancelled, off.

## Flagged ambiguities

- **"stopped"** has two readings that were reconciled: it is an *operational* state (the VM is
  powered off) but **not** a *billing* state — a stopped resource is still **Alive** and bills the
  full bundle rate. Only **Terminated** changes compute billing.
- **"version"** (as in `bundle v1`/`v2`) is rejected vocabulary. A price change is a new **Catalog
  Rate**; genuinely different resources are a *different bundle*, not a version.
- **Grandfathering is not universal.** Bundles and most add-ons lock their rate at provision
  (**price-lock**); depreciating storage (**snapshot**) is a deliberate **live-priced** exception.
  `metering.md` still says "rate locked at provision" — that holds for grandfathered add-ons but
  not live-priced ones; reconcile when that doc is next touched.
- **"rate" / "amount" are integers, not rupees.** A **rate** is in **rate units** (minor × 10⁶); an
  **amount** is in **minor units** (paisa/cent). Both are `Long Int` (`bigint`) — never a float,
  `Currency`, or plain `Int` (which caps at ₹2.1 cr). Any spec table still typing money `Currency`
  predates [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) and is being migrated.

## Example dialogue

> **Dev:** Customer stopped their 2-vCPU droplet on the 10th. Do we stop charging compute?
> **Domain:** No. Stopped is still *alive* — the resources stay reserved, so the bundle rate keeps
> accruing. Only *terminate* stops the compute charge.
> **Dev:** And if they terminate but kept a snapshot?
> **Domain:** The bundle's price-lock closes, but the snapshot is its own resource_id from birth —
> it bills as a *live-priced* add-on until deleted. No rate lock: storage prices fall, so we keep
> the customer on the current rate rather than grandfathering a stale-high one.
> **Dev:** They also want the price they signed up at, even after we raise rates.
> **Domain:** That's the price-lock. We froze their shown rate at provision; raising the Catalog
> Rate only affects *new* provisions. Same bundle identity, new rate document.
