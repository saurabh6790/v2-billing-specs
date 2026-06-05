# 01 — App scaffold + Bundle/Add-on catalog + push to Agent Plan Cache

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md), [subscription-agent.md](../subscription-agent.md)

## What to build

Scaffold the two apps (`press_billing` on Central, `press_billing_agent` per cluster) and deliver the catalog end-to-end. The catalog is a **Plan (bundle)** — one immutable identity with a spec-only **includes** composition — and an **Add-on** (per-unit). Rates live in a **single standalone DocType** `Catalog Rate` (ERPNext `Item Price` style), not child tables: each row links its parent via a **Dynamic Link** (`priced_doctype` ∈ {Plan, Add-on} + `priced_for`) and carries `cluster` (`Data`), `currency` (Link → Currency), `rate`. One table prices both bundles and add-ons. A bundle's rate **is** its price; it is never `quantity × rate`. Central resolves the rate for a team's currency and the resource's cluster (most-specific region match, else global), and pushes the bundle identity + includes + full rate set to a cluster Agent's `Plan Cache`. Rates are mutable on Central (a rate change is editing/creating a `Catalog Rate` document — never a new plan). The `Plan`/`Add-on`/`Currency` forms surface their rates via dashboard **connections**.

## Acceptance criteria

- [ ] Both apps scaffold and install; `Plan` (with a `Plan Includes` child table) and `Add-on` exist, plus a **single standalone** `Catalog Rate` DocType that links its parent via a **Dynamic Link** (`priced_doctype` validated to {Plan, Add-on} + `priced_for`), with `cluster` (`Data`), `currency` (Link → Currency), `rate` — all with CRUD.
- [ ] A bundle holds **multiple currency rates without duplicating the plan** (e.g. USD 40 + INR 3200) as separate `Catalog Rate` documents, and supports a **per-region override** document; `quantity`/`unit` on includes carry **no price**.
- [ ] `Plan`/`Add-on`/`Currency` dashboards declare **connections** to `Catalog Rate` (Plan/Add-on via the dynamic link, price-lock to `Plan`), so related records are reachable from the form.
- [ ] Rate resolution picks the most-specific cluster match for a currency, else the global (blank-cluster) document; a rate edit does not create a new plan.
- [ ] `push_plans_to_agent` syncs bundle identity + includes + rate set into a test Agent's `Plan Cache`.
- [ ] Agent `Plan Cache` is read-only locally and carries `rates_json` + `includes_json` for display only (no computation).
- [ ] A live `get_plan_pricing(plan, currency, cluster)` read endpoint returns the resolved current Central rate.

## Blocked by

None - can start immediately.
