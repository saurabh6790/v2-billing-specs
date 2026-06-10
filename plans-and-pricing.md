# Plans & Pricing

## Purpose

Define billable **bundles** and **add-ons**, how rates are held per currency and per region, how a
rate is locked for grandfathering, and how the catalog reaches the regional clusters — on
**ERPNext Item + Item Price + Pricing Rule**, with the price-lock kept custom.

## Model: bundles and add-ons → ERPNext Items

Two sellable things, both modelled as **service Items** (`is_stock_item = 0`, `is_sales_item = 1`):

- **Bundle** — a flat-rate offering ("$40/droplet"). One **immutable Item code forever**
  (`bundle-2vcpu`); a rate change never forks a new Item (the v1 plan-proliferation bug). The
  bundle *includes* a set of resources (2 vCPU, 4 GB, 80 GB) and carries a single **rate** per
  currency. **The rate is the price — billed quantity 1, never `qty × rate`.**
- **Add-on** — a per-unit Item billed on top (bandwidth overage, block storage, snapshots, IPs).
  Here `qty × rate` applies and is unambiguous because the thing is metered/discrete.

There is no `price` or `price_per_unit` field; the single pricing word is **rate**, held as an
**Item Price**.

> **Why not custom `Plan`/`Add-on`?** The original design built these as bespoke DocTypes. ERPNext
> `Item` already gives identity, an item group taxonomy, UOM, the Item Price connection, and Pricing
> Rule eligibility — everything the custom DocTypes hand-rolled. The bundle-vs-add-on distinction is
> a property we carry as a custom field on Item (`fc_billing_type ∈ {bundle, addon}`), not a new
> DocType. See [ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

### Custom fields on Item

| Field | Type | Notes |
|-------|------|-------|
| `fc_billing_type` | Select | bundle / addon |
| `fc_resource_type` | Select | compute / memory / disk / transfer / ip / snapshot |
| `fc_billing_type_mode` | Select | fixed / metered (add-ons) |
| `fc_billing_interval` | Select | hourly / daily / monthly |
| `fc_pricing_mode` | Select | grandfathered / live (per [ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md)) |
| `fc_includes` | Table (child) | Composition (spec only) — the metered **allowance** baseline; carries no price |

`fc_includes` rows: `resource_type`, `quantity` (Float, also the allowance), `unit` (vCPU/GB/unit).
Composition is never decomposed into priced sub-resources.

## Rates → Item Price (+ price lists for currency/region)

Rates are **Item Price** rows, one per `(Item, price list)`:

- A **price list** carries the **currency** (`Selling INR`, `Selling USD`). A new currency is a new
  price list / Item Price row — never a new Item, never a new column.
- **Region/cluster overrides** ride a **Pricing Rule** (or a region-suffixed selling price list,
  e.g. `Selling INR — ap-south-1`), resolved after the base Item Price. AWS US-vs-India price
  differences are extra Item Prices / Pricing Rules, not extra Items.

| Item Price field | Use |
|------------------|-----|
| `item_code` | the bundle (`bundle-2vcpu`) or add-on (`addon-bandwidth`) |
| `price_list` | encodes currency (+ optional region) |
| `currency` | INR, USD, … |
| `price_list_rate` | the rate, **major-unit decimal** (ERPNext) — see the money note below |
| `valid_from` / `valid_upto` | ERPNext-native effectivity (we set `valid_from`, never delete) |

### Money note — rate units vs Item Price

The compute core holds rates in **rate units** (`minor × 10⁶`, `Long Int`) so a sub-paisa metered
rate (€0.009/GB → `900000`) is exact ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)).
`Item Price.price_list_rate` is an ERPNext `Currency` (major-unit) field. For **flat bundle rates**
the two agree (₹1000.00 ↔ `100000000000` rate units). For **sub-paisa metered rates**, the
authoritative rate lives in the **price-lock / a custom field** in rate units; the Item Price is the
display/ERPNext-native value. Billing computes from rate units and writes the rounded minor→major
amount to the Sales Invoice Item (round-off disabled). The `money` module owns the conversion.

## Price-lock (kept custom — grandfathering)

ERPNext has no per-provision rate freeze, so the **Price-lock** survives as a custom DocType,
append-only, keyed by `resource_id`.

| Field | Type | Notes |
|-------|------|-------|
| `resource_id` | Data | Stable physical resource identity (from Agent event) — the lock key |
| `item` | Link → Item | The bundle/add-on |
| `currency` | Link → Currency | Team's billing currency at provision |
| `locked_rate` | Long Int | **Rate units** (minor × 10⁶) = Agent `shown_rate` |
| `cluster` | Data | Region the resource ran in (drove which rate resolved) |
| `billing_interval` | Select | Copied at lock time |
| `pricing_mode` | Select | grandfathered / live (copied from Item; `live` ignores `locked_rate`) |
| `started_at` / `ended_at` | Datetime | `ended_at` null = active |

## Rate resolution

Given `(item, team currency, resource cluster)`:

1. Resolve the **price list** for the currency.
2. Apply any **region Pricing Rule** for the resource's cluster; else the base Item Price.
3. That is the live rate.

A team has **one billing currency** (its ERPNext Customer's default); the **cluster** comes from
where the resource runs (Agent-reported). One Item identity covers every currency and region.

## Grandfathering (price-lock mechanism)

1. Customer provisions at the cluster. The Agent emits a `subscribed` event with `resource_id` and
   the **shown rate** (resolved for the team's currency + cluster).
2. Central writes an append-only price-lock keyed by `resource_id`, capturing currency + locked
   rate (= `shown_rate`; logs a discrepancy if it differs from Central's currently-resolved rate).
3. Billing reads the lock forever.

Rules:
- A resource keeps its locked rate until **terminated/re-provisioned** — no time expiry.
- Destroy-then-reprovision = a *different* `resource_id` → a *new* lock at the then-current rate.
- Upgrade/downgrade: old lock closes (terminated), new lock opens at the new bundle's current rate.
- Admin rate change = a new **Item Price** (or region **Pricing Rule**). Existing locks untouched;
  new provisions lock the new rate. Zero new Items.
- **Live-priced** add-ons (snapshot) ignore the lock and read the current Item Price each period
  ([ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md)).
- Admin escape hatch: bulk "re-lock to current rate" for forced migrations.

## Catalog distribution & price display

- Central pushes Item identity + `fc_includes` + the **full Item Price set** to each Agent's local
  cache on change (cheap — few clusters, rare). Display only; the Agent computes nothing.
- The regional UI shows the rate for the user's currency + cluster. Works during a Central outage;
  keeps the Agent thin.
- **Rate shown = rate locked**, guaranteed: the Agent reports `shown_rate` on the event; Central
  locks that.

## API

```
# [Customer + Admin] Browse / detail — Items filtered to billing
GET  /api/resource/Item?filters=[["fc_billing_type","=","bundle"],["disabled","=",0]]
GET  /api/resource/Item/{name}

# [Customer + Admin] An Item's rates are its Item Prices (ERPNext connection)
GET  /api/resource/Item Price?filters=[["item_code","=","bundle-2vcpu"]]

# [Admin] A rate change is a new Item Price (or Pricing Rule), not an Item edit
POST /api/resource/Item Price
POST /api/resource/Pricing Rule

# [Admin] Push bundles (+ includes + prices) to an Agent
POST /api/method/central.billing.catalog.push_to_agent  { agent_url, items: ["bundle-2vcpu"] }

# [Regional UI] Live rate read, resolved for currency (+ optional cluster)
GET  /api/method/central.billing.catalog.get_pricing?item=bundle-2vcpu&currency=USD&cluster=ap-south-1
```

## Notes

- Bundles never multiply `qty × rate` (Sales Invoice Item qty = 1); add-ons do.
- Pricing is **read live at purchase**, **locked at provision** (price-lock), and **frozen for
  billing**. Three roles, one number.
- Generic by construction: a new currency/region is a new **Item Price / Pricing Rule**, never a new
  Item.
- The commitment discount is a **Pricing Rule** scoped to the team for the term (see [ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md)).
