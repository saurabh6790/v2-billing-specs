# 01 — App scaffold + Bundle/Add-on catalog + push to Agent Plan Cache

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md), [subscription-agent.md](../subscription-agent.md)

## What to build

Scaffold the two apps (`press_billing` on Central, `press_billing_agent` per cluster) and deliver the catalog end-to-end. The catalog is two DocTypes: a **Plan (bundle)** — one immutable identity with a flat **rate per (region, currency)** and a spec-only **includes** composition — and an **Add-on** (per-unit, same rate shape). A bundle's rate **is** its price; it is never `quantity × rate`. Central resolves the rate for a team's currency and the resource's cluster (most-specific region match, else global), and pushes the bundle identity + includes + full rate set to a cluster Agent's `Plan Cache`. Rates are mutable on Central (a rate change is editing a `Plan Rate` row or adding a region override — never a new plan).

## Acceptance criteria

- [ ] Both apps scaffold and install; `Plan` (with `Plan Rate` + `Plan Includes` child tables) and `Add-on` (with `Add-on Rate`) DocTypes exist with CRUD.
- [ ] A bundle holds **multiple currency rates without duplicating the plan** (e.g. USD 40 + INR 3200), and supports a **per-region override** row; `quantity`/`unit` on includes carry **no price**.
- [ ] Rate resolution picks the most-specific cluster match for a currency, else the global (blank-cluster) row; a rate edit does not create a new plan.
- [ ] `push_plans_to_agent` syncs bundle identity + includes + rate set into a test Agent's `Plan Cache`.
- [ ] Agent `Plan Cache` is read-only locally and carries `rates_json` + `includes_json` for display only (no computation).
- [ ] A live `get_plan_pricing(plan, currency, cluster)` read endpoint returns the resolved current Central rate.

## Blocked by

None - can start immediately.
