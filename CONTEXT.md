# Billing & Pricing — Glossary

The language of how Frappe Cloud v2 prices resources, locks those prices, and bills for them, on an
**ERPNext base**. This is a glossary, not a spec — see [plans-and-pricing.md](plans-and-pricing.md),
[invoicing.md](invoicing.md), and [erpnext-mapping.md](erpnext-mapping.md). Each catalog/accounting
term notes its **ERPNext landing spot**; domain terms ERPNext doesn't model stay custom.

## Language

### Catalog

**Bundle**:
A flat-rate sellable offering of bundled resources (e.g. 2 vCPU + 4 GB + 80 GB). Has **one immutable
identity forever** (`bundle-2vcpu`); a price change never forks a new one.
→ **ERPNext: a service `Item`** (`is_stock_item = 0`). Its rate is the price, never `qty × rate`.
_Avoid_: Plan version, tier, SKU.

**Add-on**:
A per-unit resource billed on top of a bundle (snapshot, transfer overage, extra disk, IP).
`rate × quantity`. Either **grandfathered** (rate locked at provision) or **live-priced** (read each
period). → **ERPNext: a service `Item`**, billed by quantity on the Sales Invoice.
_Avoid_: Extra, upsell, supplement.

**Live-priced add-on**:
An add-on whose rate is read from the current rate **each billing period** rather than locked at
provision — the deliberate exception to grandfathering (depreciating storage; snapshot is the first
member). → rate read from the current **Item Price** at generation, not from the price-lock.
_Avoid_: Spot price, current price.

**Rate**:
The single pricing word. For a **bundle**, the rate *is* the price. For an **add-on**, the per-unit
price. → **ERPNext: an `Item Price`** row (per price list = currency/region). A rate change is a new
Item Price, never a new Item.
_Avoid_: Price, price_per_unit, cost, tariff.

**Composition** (the bundle's *includes*):
The resources a bundle contains, recorded as spec only — **no price**. Also the **allowance**
baseline add-on overage is measured against. → Item spec fields / attributes; the allowance is read
by metering, not priced.
_Avoid_: Line items, priced parts.

**Item Price** (was `Catalog Rate`):
ERPNext's standalone price table — one row per `(Item, price list)`. A **price list** encodes the
currency (and, with a region selling-price-list convention, the cluster). A new currency or region
is a new Item Price **row** / price list, never a new Item and never a new column.
Region-specific overrides and the commitment discount ride **Pricing Rule** on top.

**Minor unit**:
The smallest indivisible amount of a currency — **paisa** for INR, **cent** for USD. In the
**compute core** (proration, metered `qty × rate`, credit ledger, the gateway charge) all settled
money is a **64-bit integer count of minor units** — never a float. At the **Sales Invoice
boundary** it converts to ERPNext's major-unit decimal (round-off disabled). The per-currency factor
comes from the `money` module's curated ISO-4217 table, **not** Frappe's `Currency` DocType (which
mis-states JPY). See [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) and the money
boundary in [erpnext-mapping.md](erpnext-mapping.md). _Avoid_: float rupees on the compute path.

**Rate unit**:
The sub-minor scale a **per-unit rate** is stored at — minor units × 10⁶ — so a sub-paisa metered
rate (€0.009/GB → `900000` rate units) is exact (Stripe `unit_amount_decimal` model). Held as
`Long Int`; rounding from rate units to settled minor units happens **once per line item**.
_Avoid_: storing per-unit rates in plain paisa.

### Pricing in time

**Commitment**:
A team-level promise to keep monthly fixed-bundle spend at or above a **floor** for a fixed **term**,
in exchange for a discounted rate on each monthly-in-arrears invoice. Resource-agnostic. Dropping
below the floor before term-end triggers a **clawback**. → discount expressed as a **Pricing Rule**;
the floor rollup + clawback math stay custom. See [ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md).
_Avoid_: Contract, lock-in, reservation.

**Floor**:
The minimum monthly **fixed bundle spend** a Commitment guarantees, measured by a team-level rollup.
Metered usage and one-off add-ons bill at list, never count toward the floor, never get the discount.
_Avoid_: Minimum, quota, cap.

**Clawback**:
The reconciling charge when a team drops committed spend **below the floor** before term-end: it
repays only the discount enjoyed on months already consumed. → an extra **Sales Invoice** line / debit
note.
_Avoid_: Penalty, termination fee.

**Price-lock**:
The append-only record, keyed by **resource_id**, that freezes the rate (and allowance) a specific
provisioned resource was shown at provision time. Billing reads it forever; it is how grandfathering
works. **Custom — ERPNext Item Price has no per-provision freeze.** Re-provisioning yields a new
resource_id and a new lock.
_Avoid_: Grandfather record, price history.

**Shown rate**:
The live rate resolved for the customer's currency + cluster at purchase and displayed in the UI. The
Agent reports it on the `subscribed` event so **rate shown = rate locked**.

### Resource lifecycle (billing view)

**Alive**:
A provisioned resource that is **running or stopped**. Both bill the full bundle rate — stopping does
**not** reduce the bill (DigitalOcean model).
_Avoid_: Active, on.

**Terminated**:
A resource that has been destroyed. Compute billing stops (the price-lock closes); only retained
**snapshots** keep billing, at the **live** snapshot rate.
_Avoid_: Deleted, cancelled, off.

### Accounting (ERPNext)

**Sales Invoice** (was custom `Invoice`):
The one invoice — customer-facing **and** statutory. Draft = `docstatus 0`; submitting posts GL and
makes it `Unpaid`; a confirmed Payment Entry makes it `Paid`. Round-off disabled so the grand total
equals the paise-precise charge.

**Payment Entry / Payment Request** (was `Payment Attempt`):
A **Payment Request** initiates collection against a Sales Invoice (and carries the gateway link); a
**Payment Entry** records the confirmed receipt on webhook and settles the invoice.

**Tax Withholding Category** (was the custom TDS seam):
ERPNext's native withholding — the Payment Entry withholds TDS, the invoice stays whole. GST/SEZ ride
**Sales Taxes and Charges Templates** + **Tax Category**.

## Flagged ambiguities

- **"stopped"** is *operational* (powered off) but **not** a *billing* state — a stopped resource is
  still **Alive** and bills the full bundle rate. Only **Terminated** changes compute billing.
- **"version"** (as in `bundle v1`/`v2`) is rejected vocabulary. A price change is a new **Item
  Price**; genuinely different resources are a *different Item*.
- **Grandfathering is not universal.** Bundles/most add-ons lock their rate at provision
  (**price-lock**); depreciating storage (**snapshot**) is a deliberate **live-priced** exception
  (reads the current Item Price). See [ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md).
- **Money has two homes.** Integer **minor units** in the compute core; ERPNext **major-unit
  decimals** on the Sales Invoice, equal to the paisa. The boundary is the only conversion. See
  [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md).
