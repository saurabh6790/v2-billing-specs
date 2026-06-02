# Plans & Pricing

## Purpose

Define billable plans, how pricing is locked for grandfathering, and how plans + prices reach the regional clusters.

## Concepts

- **Plan** — a billable configuration with one **immutable identity forever** (`plan-2vcpu`). A price change never forks a new plan (the v1 mistake that caused plan proliferation and a sync storm). The plan stays *listed*; only its price moves.
- **Plan Resource** — what a plan includes (created-once child table).
- **Price-lock** — an append-only row, keyed by **`resource_id`**, capturing the price at provision time. Billing always reads the lock, never the live plan price.

## Data Model

**Plan** (stable; child tables OK)

| Field | Type |
|-------|------|
| name | Data |
| title | Data |
| plan_type | Select (base / addon) |
| billing_cycle | Select (monthly / annual) |
| annual_discount_pct | Float |
| currency | Data |
| is_active | Check |

**Plan Resource** (child table of Plan)

| Field | Type | Notes |
|-------|------|-------|
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| unit | Data | vCPU / GB / unit |
| quantity_included | Float | Allowance included in base price |
| price_per_unit | Currency | Live catalog price (mutable) |
| metered_rate | Currency | Per-unit overage rate (metered types) |
| billing_interval | Select | hourly / daily / monthly |
| billing_type | Select | fixed / metered |

**Price-lock** (append-only; keyed by `resource_id`) — see also `Subscription Resource` in [subscriptions.md](subscriptions.md).

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Stable physical resource identity (from Agent event) — the lock key |
| plan | Link → Plan | |
| price_per_unit | Currency | Locked at provision = Agent `shown_price` |
| metered_rate | Currency | Locked metered rate |
| metered_allowance | Float | Locked included allowance |
| billing_interval | Select | Copied from Plan Resource at lock time |
| started_at / ended_at | Datetime | ended_at null = active |

## Grandfathering (price-lock mechanism)

1. Customer provisions at the cluster. The Agent emits a `subscribed` event carrying `resource_id` and the `shown_price` displayed.
2. Central writes an append-only price-lock row keyed by `resource_id`, capturing the locked price (= `shown_price`; logs a discrepancy if it differs from Central's current price).
3. Billing reads the lock forever.

Rules:
- Existing resource keeps its locked price until **terminated/re-provisioned** — no time-based expiry.
- A destroy-then-reprovision of the "same" plan is a *different* `resource_id` → a *new* lock at the then-current price.
- Plan upgrade/downgrade: old resource's lock closes (terminated), new resource opens a new lock at the new plan's current price.
- Admin price increase = edit one live field (or append an effective-dated row). Existing locks untouched; new provisions lock the new price. Zero new plans.
- Admin escape hatch: bulk "re-lock to current price" for forced migrations (e.g. sunsetting a plan).

## Plan distribution & price display

- Central pushes plan definitions + a **display price** to each Agent's `Plan Cache` on change (cheap — few clusters, rare). Display only; the Agent computes nothing with it.
- This lets the regional UI show price during a Central outage, and keeps the Agent thin (it carries a number).
- **Price shown = price locked**, guaranteed: the Agent reports `shown_price` on the event, and Central locks that.

## API

```
# [Customer + Admin] Browse / detail
GET  /api/resource/Plan?filters=[["is_active","=",1]]
GET  /api/resource/Plan/{name}

# [Admin] Create / update plan (price change = edit, no new plan)
POST /api/resource/Plan
PUT  /api/resource/Plan/{name}

# [Admin] Push plans + display price to an Agent
POST /api/method/cloud_billing.sync.push_plans_to_agent
     { "agent_url": "...", "plans": ["plan-2vcpu"] }

# [Regional UI] Live price read (never cached as authoritative)
GET  /api/method/cloud_billing.plans.get_plan_pricing?plan=plan-2vcpu
```

## Notes

- Pricing is **read live at purchase** (human pace), **locked at provision**, and **frozen for billing** (machine pace). Three roles, one number.
- Metered rate + allowance are locked alongside fixed price in the same lock row.
