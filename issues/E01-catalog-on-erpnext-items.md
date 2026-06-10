# E01 — Catalog on ERPNext: Item + Item Price + Pricing Rule

**Builds on:** ERPNext · **Replaces:** old #01, #27, #33 · **Phase:** Foundation · **Type:** AFK

## Goal

Model bundles and add-ons as ERPNext **Items**, rates as **Item Prices**, region/commitment overrides
as **Pricing Rules**, and keep the **Price-lock** custom for grandfathering. Retire the custom
`Plan` / `Add-on` / `Catalog Rate` DocTypes. See [plans-and-pricing.md](../plans-and-pricing.md).

## Scope

- Custom fields on **Item**: `fc_billing_type` (bundle/addon), `fc_resource_type`,
  `fc_billing_type_mode` (fixed/metered), `fc_billing_interval`, `fc_pricing_mode`
  (grandfathered/live), `fc_includes` (child: resource_type, quantity, unit — composition +
  allowance, no price).
- Seed the bundles/add-ons as service Items (`is_stock_item=0`, `is_sales_item=1`).
- **Item Price** rows per `(item, price list=currency)`; region overrides as **Pricing Rule** (or
  region-suffixed selling price list). Rate authoring UI = Item + Item Price desk forms (replaces the
  custom Plan Configurator).
- **Price-lock** custom DocType kept; re-point `plan` → `item`; carries `locked_rate` in rate units,
  `pricing_mode`, `cluster`, `resource_id`, `started_at`/`ended_at`.
- **Rate resolution** helper: `(item, currency, cluster)` → live rate (price list + region Pricing
  Rule, else base Item Price).
- **Catalog push** to Agent Plan Cache: Item identity + `fc_includes` + the full Item Price set.

## Money note

`Item Price.price_list_rate` is ERPNext `Currency` (major unit). The authoritative sub-paisa metered
rate lives in **rate units** on the price-lock / a custom field; billing computes from rate units and
writes minor→major at the Sales Invoice boundary (E02). Flat bundle rates agree exactly.

## Acceptance

- A rate change is a **new Item Price / Pricing Rule**, never a new Item (no plan proliferation).
- `(item, currency, cluster)` resolves to the correct rate with region override beating base.
- A `subscribed` event writes a price-lock = `shown_rate`; billing reads the lock forever; live-priced
  add-ons ignore the lock and read the current Item Price.
- Catalog push delivers identity + includes + rates to an Agent.

## Out of scope

Invoice generation (E09), metering (E12), commitment discount Pricing Rule wiring (E19).
