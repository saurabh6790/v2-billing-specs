# 01 — App scaffold + Plan catalog + push to Agent Plan Cache

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md), [subscription-agent.md](../subscription-agent.md)

## What to build

Scaffold the two apps (`cloud_billing` on Central, `subscription_agent` per cluster) and deliver the plan catalog end-to-end: an admin creates a `Plan` (single immutable identity) with `Plan Resource` rows, and Central pushes the plan definition **plus a display price** to a cluster Agent's `Plan Cache`. The cluster can then render available plans without calling Central. Price is mutable on Central (a price change is an edit, never a new plan).

## Acceptance criteria

- [ ] Both apps scaffold and install; `Plan` + `Plan Resource` (child table) DocTypes exist with CRUD.
- [ ] Admin creates/edits a plan via API; a price edit does not create a new plan.
- [ ] `push_plans_to_agent` syncs plan identity + composition + display price into a test Agent's `Plan Cache`.
- [ ] Agent `Plan Cache` is read-only locally and carries `unit_price` for display only (no computation).
- [ ] A live `get_plan_pricing` read endpoint returns the current Central price.

## Blocked by

None - can start immediately.
