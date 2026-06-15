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

Rates are **not** child tables. Following ERPNext's `Item Price` pattern, every rate is a row in **one** standalone DocType — **`Catalog Rate`** — shared by both Plan and Add-on through a **Dynamic Link**. (`Item Price` is a single table that prices every `Item`; likewise one `Catalog Rate` table prices every bundle *and* every add-on — no `Plan Rate` + `Add-on Rate` duplication.) This keeps the plan/add-on identity small and immutable, lets a rate be created/edited/queried/permissioned on its own, and makes "add a region or currency" a new **document**, not a child row buried inside the parent. The parent surfaces its rates through a **connection** (dashboard link), exactly like an `Item` lists its `Item Price`s.

**Plan (bundle)** — immutable identity; no rate child table

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`bundle-2vcpu`) |
| title | Data | |
| billing_cycle | Select | monthly / annual |
| annual_discount_pct | Float | |
| is_active | Check | |
| includes | Table → Plan Includes | Composition (spec only) — stays a child, it carries no price |

**Plan Includes** (child of Plan) — composition, **no price**

| Field | Type | Notes |
|-------|------|-------|
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| quantity | Float | Included amount; also the metered **allowance** baseline |
| unit | Data | vCPU / GB / unit |

**Add-on** — immutable identity; per-unit; no rate child table

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`addon-bandwidth`) |
| title | Data | |
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| unit | Data | GB / unit |
| billing_type | Select | fixed / metered |
| billing_interval | Select | hourly / daily / monthly |

**Catalog Rate** — **single standalone DocType** (ERPNext `Item Price` style), one row per `(parent, cluster, currency)`; serves Plan and Add-on via a Dynamic Link

| Field | Type | Notes |
|-------|------|-------|
| priced_doctype | Link → DocType | The dynamic-link target type: `Plan` or `Add-on` (validated to those two) |
| priced_for | Dynamic Link → `priced_doctype` | The specific bundle (`bundle-2vcpu`) or add-on (`addon-bandwidth`) |
| cluster | Data | **Blank = global default**; else a region/cluster key (e.g. `ap-south-1`). Plain `Data` for now — upgrade to `Link → Cluster` when a `Cluster` DocType exists |
| currency | Link → Currency | INR, USD, … — going generic is *adding a document*, never a column |
| rate | Long Int | **Rate units** (minor × 10⁶), never a float — see [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). Plan: the flat rate. Add-on: the per-unit rate. Same column, billing decides `qty × rate` vs flat. The sub-minor scale lets a sub-paisa metered rate (€0.009/GB → `900000`) be stored exactly (Stripe `unit_amount_decimal` model) |

`autoname` by `{priced_for}-{cluster}-{currency}` (cluster omitted when global). Plan/add-on identities are already distinct (`bundle-2vcpu`, `addon-bandwidth`), so the name is human-readable and the `(priced_doctype, priced_for, cluster, currency)` tuple is unique.

**Price-lock** (append-only; keyed by `resource_id`) — see also `Subscription Resource` in [subscriptions.md](subscriptions.md).

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Stable physical resource identity (recorded by Central at provision) — the lock key |
| plan | Link → Plan | |
| currency | Link → Currency | The team's billing currency at provision |
| locked_rate | Long Int | **Rate units** (minor × 10⁶) — see [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). Locked at provision = the `shown_rate` Central resolved |
| cluster | Data | The region the resource ran in (drives which rate was resolved) |
| billing_interval | Select | Copied at lock time |
| started_at / ended_at | Datetime | ended_at null = active |

## Rate resolution

Given a `(plan-or-addon, team currency, resource cluster)`:

1. Query the `Catalog Rate` documents for that **plan/add-on** (`priced_doctype` + `priced_for`) and **currency**.
2. Prefer the document whose **cluster** matches the resource's region; otherwise fall back to the **global** (blank-cluster) document.
3. That rate is the live catalog rate.

A team has **one billing currency** (see [architecture.md](architecture.md)); the **cluster** is where the resource runs (reported by the cluster manager). One plan identity therefore covers every currency and every region — **no plan-per-currency, no plan-per-region**. AWS US-vs-India price differences are extra `Catalog Rate` documents, not extra plans.

## Grandfathering (price-lock mechanism)

1. Customer subscribes; Central resolves the **shown rate** (for the team's currency + the chosen cluster's region), calls the cluster manager to provision, and gets back the `resource_id`.
2. In the same step Central writes an append-only price-lock row keyed by `resource_id`, capturing the **currency + locked rate** (= `shown_rate`; logs a discrepancy if it differs from Central's currently-resolved rate) and emits the `subscribed` event.
3. Billing reads the lock forever.

Rules:
- Existing resource keeps its locked rate until **terminated/re-provisioned** — no time-based expiry.
- Destroy-then-reprovision of the "same" bundle is a *different* `resource_id` → a *new* lock at the then-current resolved rate.
- Upgrade/downgrade: old resource's lock closes (terminated), new resource opens a new lock at the new bundle's current rate.
- Admin rate change = edit one `Catalog Rate` document, or **create a region-override document**. Existing locks untouched; new provisions lock the new rate. Zero new plans.
- Admin escape hatch: bulk "re-lock to current rate" for forced migrations (e.g. sunsetting a bundle).

## Catalog & price display

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** Plans + rates live in Central; there is no Agent `Plan Cache` to push to.

- Plans (identity + **includes** + the **full rate set**) live in Central; the UI reads them from Central to show the rate for the user's currency and the chosen region.
- **Rate shown = rate locked**, guaranteed: Central resolves the `shown_rate`, locks that exact value at provision, and emits the event — one component does both, so there is nothing to keep in sync.

## API

```
# [Customer + Admin] Browse / detail
GET  /api/resource/Plan?filters=[["is_active","=",1]]
GET  /api/resource/Plan/{name}
GET  /api/resource/Add-on

# [Customer + Admin] A plan/add-on's rates are their own documents (the connection target)
GET  /api/resource/Catalog Rate?filters=[["priced_doctype","=","Plan"],["priced_for","=","bundle-2vcpu"]]

# [Admin] Create / update — a rate change is a Catalog Rate doc, not a plan edit
POST /api/resource/Plan
POST /api/resource/Catalog Rate
PUT  /api/resource/Catalog Rate/{name}

# [UI] Live rate read, resolved for currency (+ optional cluster)
GET  /api/method/press_billing.plans.get_plan_pricing?plan=bundle-2vcpu&currency=USD&cluster=ap-south-1
```

## Notes

- Bundles never multiply `qty × rate`; add-ons do.
- Pricing is **read live at purchase** (human pace), **locked at provision** (per currency + region), and **frozen for billing** (machine pace). Three roles, one number.
- Generic by construction: a new currency or a new region is a new `Catalog Rate` **document** — never a new plan.

## Connections

DocTypes that point at each other are wired as Frappe **connections** (the dashboard "Connections"/Links tab) so an admin can pivot between related records without a query. The links follow the actual link fields:

- **Plan** → `Catalog Rate` (via the `priced_for` dynamic link, `priced_doctype = Plan`) and price-lock (via `plan`). Opening a bundle shows its rate documents grouped under "Pricing" and every lock that references it.
- **Add-on** → `Catalog Rate` (via `priced_for`, `priced_doctype = Add-on`).
- **Currency** → `Catalog Rate` (via `currency`).
- **Price-lock** → `Plan` (via `plan`).

Dynamic-link connections use `non_standard_fieldnames`/`dynamic_links` in the parent's `*_dashboard.py` (`get_data`), matching how ERPNext's `Item` dashboard surfaces `Item Price`. (`cluster` is plain `Data` for now, so it has no connection until it becomes `Link → Cluster`.)
