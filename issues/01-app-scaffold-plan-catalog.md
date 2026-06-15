# 01 — App scaffold + Bundle/Add-on catalog

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** No Agent app and no Plan Cache to push to — the catalog lives in Central. (Title was "… + push to Agent Plan Cache".)

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

Scaffold the `billing` module in Central and deliver the catalog end-to-end. The catalog is a **Plan (bundle)** — one immutable identity with a spec-only **includes** composition — and an **Add-on** (per-unit). Rates live in a **single standalone DocType** `Catalog Rate` (ERPNext `Item Price` style), not child tables: each row links its parent via a **Dynamic Link** (`priced_doctype` ∈ {Plan, Add-on} + `priced_for`) and carries `cluster` (`Data`), `currency` (Link → Currency), `rate`. One table prices both bundles and add-ons. A bundle's rate **is** its price; it is never `quantity × rate`. Central resolves the rate for a team's currency and the resource's cluster (most-specific region match, else global). Rates are mutable on Central (a rate change is editing/creating a `Catalog Rate` document — never a new plan). The `Plan`/`Add-on`/`Currency` forms surface their rates via dashboard **connections**.

## Acceptance criteria

- [ ] The `billing` module installs in Central; `Plan` (with a `Plan Includes` child table) and `Add-on` exist, plus a **single standalone** `Catalog Rate` DocType that links its parent via a **Dynamic Link** (`priced_doctype` validated to {Plan, Add-on} + `priced_for`), with `cluster` (`Data`), `currency` (Link → Currency), `rate` — all with CRUD.
- [ ] A bundle holds **multiple currency rates without duplicating the plan** (e.g. USD 40 + INR 3200) as separate `Catalog Rate` documents, and supports a **per-region override** document; `quantity`/`unit` on includes carry **no price**.
- [ ] `Plan`/`Add-on`/`Currency` dashboards declare **connections** to `Catalog Rate` (Plan/Add-on via the dynamic link, price-lock to `Plan`), so related records are reachable from the form.
- [ ] Rate resolution picks the most-specific cluster match for a currency, else the global (blank-cluster) document; a rate edit does not create a new plan.
- [ ] A live `get_plan_pricing(plan, currency, cluster)` read endpoint returns the resolved current Central rate.

## Blocked by

None - can start immediately.
