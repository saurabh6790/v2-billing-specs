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
carte as `Σ(quantity × per-resource rate)`, it mints **no `Plan`** — the chosen **composition** is
recorded on the **Subscription**, and that sum is **locked as one whole-config rate** on the
subscription's change row (per-resource charges are *not* frozen separately;
[ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md) +
[ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)). It then bills as a single
line at that locked rate. Proportion (RAM = vCPU × the profile's ratio) and bounds come from the
`Plan Sub-Category`.
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

**Money representation**:
All money in the billing app — per-unit **rate**s, line-item amounts, subtotal, total, tax, credit,
balance — is a Frappe **`Currency` (float) in major units** (₹/$/€), not an internal minor-unit
integer. ₹10.00 is stored `10.0`. Conversion to the **gateway minor unit** (Razorpay paise / Stripe
cents — the integer the gateway actually charges) happens *only* at the gateway boundary as
`round(major × factor)`, where the per-currency factor is `100` for INR/USD, `1` for JPY, `1000` for
BHD (JPY is a real trap — never `/100` blindly).
[ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units model was **never
built and is deprecated**.
_Avoid_: integer minor units as the internal type, `Long Int` money, "amount in paisa". (₹10.00 is
`10.0`, not `1000`.)

**Rate precision**:
A per-unit metered **rate** (`€0.009`/GB transfer, `0.12`/vCPU, `0.8` overage) is a `Currency` float
whose **field precision** must be wide enough to hold sub-cent values — the float model's answer to
sub-paisa rates (what deprecated [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) solved
with a `MINOR × 10⁶` integer scale). A flat bundle rate is the whole-number case. Rounding to the
settled amount happens **once per line item**.
_Avoid_: a 2-dp rate field (silently overcharges sub-cent meters); `Long Int` rate units.

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
The append-only record that freezes the rate (and allowance) a specific provisioned resource was
shown at provision time. Billing reads it forever; it is how grandfathering works. A resize
re-resolves at current rates; stop/start does not re-price; re-provisioning is a new lock.
Since [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) the lock is **not a
separate doctype** — it *is* the **`Subscription Change`** row that opens a segment (`locked_rate` +
`currency` + `effective_at`); the physical resource_id is reached via the Subscription's `asset_id`.
_Avoid_: Grandfather record, price history, snapshot (overloaded — see snapshot the resource); a
standalone "Price Lock" doctype (retired).

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

### Projecting forward

**Projection**:
What billing *will* do — the same rating, settlement and dunning rules applied to a future calendar
instead of today's. A projection changes nothing: it is the billing engine asked a question rather
than told to act ([ADR 0020](docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)). It
spans one team or a filtered cohort, one period or many, and carries the **scenario** it was computed
under.
_Avoid_: **Run** (a run *bills people* — see below), forecast (reserved, see below), estimate,
what-if (that is the scenario, not the output), dry run.

**Scenario**:
The named bundle of *inputs* a projection is computed under — which configuration to use (live, or
with named overrides), which hypothetical events to inject (a resize, a decline, a top-up), and how
to treat unknown payment outcomes. Varying the scenario and holding the team fixed is how the
question "what would this change do?" gets asked.
_Avoid_: simulation (that is the activity), case, variant, test.

**Forecast**:
The **customer-facing** projection: this team, this month, live configuration, everything settles.
One fixed scenario out of many, shown in the customer dashboard. Reserved for that meaning —
an operator projecting six months under an overridden price list is *not* forecasting.
_Avoid_: using "forecast" for the operator-facing tool. (That is the **Simulator**, showing a
**projection**.)

**Simulator**:
The operator's surface onto projections — where a scenario is composed and its projection read. A
tool, never a computation: nothing is ever "simulated" into the database.
_Avoid_: naming any stored document or code path "simulation run".

**Run**:
**Always** the monthly billing run — the scheduled job that rates the closed month and collects it.
The word carries a promise of side effects: a run moves money. Nothing read-only is ever a run.
_Avoid_: "simulation run", "projection run", "dry run".

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
- **Money is float `Currency` in major units, not integer minor units.**
  [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) proposed integer minor/rate units
  (`Long Int`) but was **never implemented and is deprecated** — rates and amounts are `Currency`
  floats in rupees/dollars (₹10.00 = `10.0`). Minor units (paise/cents) exist only at the gateway
  boundary as the integer a gateway adapter charges. The spec corpus has been swept to describe this
  float model (#90); the ADR 0003 migration issues #34–#39 are marked OBSOLETE.

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
