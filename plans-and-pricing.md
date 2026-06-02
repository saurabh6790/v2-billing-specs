# Plans & Pricing

## Purpose

Define billable **bundles** and **add-ons**, how rates are held per currency and per region, how a rate is locked for grandfathering, and how the catalog reaches the regional clusters.

## Model: bundles and add-ons

Two sellable things, modelled as two DocTypes:

- **Plan (bundle)** — a flat-rate offering (DigitalOcean-style: "$40/droplet"). One **immutable identity forever** (`bundle-2vcpu`); a rate change never forks a new plan (the v1 mistake that caused plan proliferation and a sync storm). A bundle *includes* a set of resources (2 vCPU, 4 GB, 80 GB) and carries a single **rate** per currency (and optionally per region). **The rate is the price — never `quantity × rate`.**
- **Add-on** — a per-unit item billed on top (bandwidth overage, extra block storage, snapshots, IPs). Here `rate × quantity` applies, and it is unambiguous because the thing is metered/discrete.

There is no `price` or `price_per_unit` anywhere; the single pricing word is **rate**.

## Why flat-rate bundles (and not per-resource pricing)

The earlier draft priced each included resource (`quantity_included × price_per_unit`) and summed them. At a glance you could not tell whether an invoice line was `qty × price` or just `price`. A bundle is one rate: `2 vCPU + 4 GB + 80 GB = $40/mo`, full stop. `press` already works this way (`Server Plan` / `Site Plan` carry flat `price_inr` / `price_usd`, with `vcpu` / `memory` / `disk` as composition, not priced lines). The included quantities survive only as the **allowance baseline** that add-on overage is measured against.

## Data model

**Plan (bundle)** — immutable identity; child tables OK

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`bundle-2vcpu`) |
| title | Data | |
| billing_cycle | Select | monthly / annual |
| annual_discount_pct | Float | |
| is_active | Check | |
| rates | Table → Plan Rate | Region × currency rates |
| includes | Table → Plan Includes | Composition (spec only) |

**Plan Rate** (child of Plan) — region × currency

| Field | Type | Notes |
|-------|------|-------|
| cluster | Data | **Blank = global default**; else a region/cluster key (e.g. `ap-south-1`) |
| currency | Link → Currency | INR, USD, … — going generic is *adding a row*, never a column |
| rate | Currency | The flat rate in that currency for that region |

**Plan Includes** (child of Plan) — composition, **no price**

| Field | Type | Notes |
|-------|------|-------|
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| quantity | Float | Included amount; also the metered **allowance** baseline |
| unit | Data | vCPU / GB / unit |

**Add-on** — immutable identity; per-unit

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`addon-bandwidth`) |
| title | Data | |
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| unit | Data | GB / unit |
| billing_type | Select | fixed / metered |
| billing_interval | Select | hourly / daily / monthly |
| rates | Table → Add-on Rate | Region × currency, **per-unit** rate |

**Add-on Rate** (child of Add-on) — same `(cluster, currency, rate)` shape as Plan Rate; `rate` is per-unit.

**Price-lock** (append-only; keyed by `resource_id`) — see also `Subscription Resource` in [subscriptions.md](subscriptions.md).

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Stable physical resource identity (from Agent event) — the lock key |
| plan | Link → Plan | |
| currency | Link → Currency | The team's billing currency at provision |
| locked_rate | Currency | Locked at provision = Agent `shown_rate` |
| cluster | Data | The region the resource ran in (drives which rate was resolved) |
| billing_interval | Select | Copied at lock time |
| started_at / ended_at | Datetime | ended_at null = active |

## Rate resolution

Given a `(plan-or-addon, team currency, resource cluster)`:

1. Take the rate rows matching the **currency**.
2. Prefer the row whose **cluster** matches the resource's region; otherwise fall back to the **global** (blank-cluster) row.
3. That rate is the live catalog rate.

A team has **one billing currency** (see [architecture.md](architecture.md)); the **cluster** comes from where the resource actually runs (reported by the Agent). One plan identity therefore covers every currency and every region — **no plan-per-currency, no plan-per-region**. AWS US-vs-India price differences are extra `Plan Rate` rows, not extra plans.

## Grandfathering (price-lock mechanism)

1. Customer provisions at the cluster. The Agent emits a `subscribed` event carrying `resource_id` and the **shown rate** (resolved for the team's currency + the cluster's region).
2. Central writes an append-only price-lock row keyed by `resource_id`, capturing the **currency + locked rate** (= `shown_rate`; logs a discrepancy if it differs from Central's currently-resolved rate).
3. Billing reads the lock forever.

Rules:
- Existing resource keeps its locked rate until **terminated/re-provisioned** — no time-based expiry.
- Destroy-then-reprovision of the "same" bundle is a *different* `resource_id` → a *new* lock at the then-current resolved rate.
- Upgrade/downgrade: old resource's lock closes (terminated), new resource opens a new lock at the new bundle's current rate.
- Admin rate change = edit one `Plan Rate` row, or **add a region override row**. Existing locks untouched; new provisions lock the new rate. Zero new plans.
- Admin escape hatch: bulk "re-lock to current rate" for forced migrations (e.g. sunsetting a bundle).

## Catalog distribution & price display

- Central pushes bundle identity + **includes** + the **full rate set** to each Agent's `Plan Cache` on change (cheap — few clusters, rare). Display only; the Agent computes nothing.
- The regional UI shows the rate for the user's currency and the cluster's region. This lets the UI show a rate during a Central outage and keeps the Agent thin (it carries numbers).
- **Rate shown = rate locked**, guaranteed: the Agent reports `shown_rate` on the event, and Central locks that.

## API

```
# [Customer + Admin] Browse / detail
GET  /api/resource/Plan?filters=[["is_active","=",1]]
GET  /api/resource/Plan/{name}
GET  /api/resource/Add-on

# [Admin] Create / update (a rate change = edit a Plan Rate row, no new plan)
POST /api/resource/Plan
PUT  /api/resource/Plan/{name}

# [Admin] Push bundles (+ includes + rates) to an Agent
POST /api/method/press_billing.sync.push_plans_to_agent
     { "agent_url": "...", "plans": ["bundle-2vcpu"] }

# [Regional UI] Live rate read, resolved for currency (+ optional cluster)
GET  /api/method/press_billing.plans.get_plan_pricing?plan=bundle-2vcpu&currency=USD&cluster=ap-south-1
```

## Notes

- Bundles never multiply `qty × rate`; add-ons do.
- Pricing is **read live at purchase** (human pace), **locked at provision** (per currency + region), and **frozen for billing** (machine pace). Three roles, one number.
- Generic by construction: a new currency or a new region is a new `Plan Rate` row — never a new plan.
