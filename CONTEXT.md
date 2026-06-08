# Billing & Pricing

The language of how Frappe Cloud v2 prices resources, locks those prices, and bills for them.
This is a glossary, not a spec — see `final-plan-pricing.md`, `plans-and-pricing.md`, and
`invoicing.md` for the design.

## Language

### Catalog

**Bundle**:
A flat-rate sellable offering of bundled resources (e.g. 2 vCPU + 4 GB + 80 GB). Has **one
immutable identity forever** (`bundle-2vcpu`); a price change never forks a new one. Modelled as
the **Plan** DocType.
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
The single pricing word. For a **bundle**, the rate *is* the price (never `quantity × rate`).
For an **add-on**, it is the per-unit price. A rate change is a new **Catalog Rate** document,
never a new bundle.
_Avoid_: Price, price_per_unit, cost, tariff.

**Composition** (the bundle's *includes*):
The resources a bundle contains (compute / memory / disk …), recorded as spec only — it carries
**no price**. Also serves as the **allowance** baseline that add-on overage is measured against.
_Avoid_: Line items, priced parts. (Composition is never decomposed into priced sub-resources.)

**Catalog Rate**:
One standalone DocType (ERPNext `Item Price` style) holding every bundle's and add-on's rate, one
row per `(priced_for, cluster, currency)`. A new currency or region is a new Catalog Rate
*document*, never a new bundle and never a new column.

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
The Agent reports it on the `subscribed` event so that **rate shown = rate locked**, guaranteed.

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
