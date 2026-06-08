# 30 — Commitment: team spend-floor + discounted monthly invoice

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [final-plan-pricing.md](../final-plan-pricing.md) §5 · **ADR:** [0001](../docs/adr/0001-commitment-as-team-spend-floor.md)

## What to build

Let a team trade a **term** for a discounted rate via a **Commitment** — a team-level **fixed-bundle spend floor**, *not* a prepaid plan and *not* a resource lock. A committed team keeps its monthly fixed-bundle spend at/above the floor for a fixed term, and the discount is applied to each **monthly-in-arrears** invoice (no upfront/prepaid bill — that would need the banned pro-rata proration, see [invoicing.md](../invoicing.md)). Commitment is **resource-agnostic**: upgrades, downgrades, and swaps are free as long as committed fixed-bundle spend stays at/above the floor. It is fully **decoupled from the price-lock** — price-lock decides *which rate applies* (grandfathering); commitment is a *discount for a term*.

This slice delivers the happy path (floor met → discount applied). Breach/clawback is [#31](31-commitment-clawback.md).

## What to build (changes)

1. **New DocType `Commitment`**: `team` (Link → Team), `floor` (Currency, monthly fixed-bundle spend), `term_months` (Int), `discount_pct` (Float), `started_at` (Date), `status` (Select: active / completed / breached). `billing_cycle = annual` on a Plan is shorthand for a 12-month commitment term.
2. **Team fixed-bundle spend rollup** — a per-`(team, billing_period)` figure summing the team's **fixed bundle** spend (metered usage and one-off add-ons excluded). Drives both the floor test and the discount.
3. **Discount application at invoice generation** — when a team has an active Commitment and the period's fixed-bundle spend meets the floor, apply `discount_pct` to the fixed-bundle line items (a discount line or per-line reduction; metered/add-on lines untouched). Reuses the existing two-phase generation ([#09](09-postpaid-invoice-generation-fixed.md)).
4. **Forecast** — committed teams' projected total reflects the discount.

## Acceptance criteria

- [ ] A team with an active `Commitment` whose fixed-bundle spend meets the floor gets the discount applied to fixed-bundle lines on its monthly-in-arrears invoice; metered/add-on lines are billed at list.
- [ ] No invoice is raised at sign-up / commitment start (still pure postpaid).
- [ ] Upgrading or swapping bundles within the same period — while staying at/above the floor — keeps the discount and raises no extra charge.
- [ ] The team fixed-bundle spend rollup excludes metered usage and one-off add-ons.
- [ ] Commitment is independent of the per-`resource_id` price-lock (no shared fields/keys).
- [ ] `press_billing` test suite green, with cases for floor-met discount and resource swap within floor.

## Decisions baked in

- **Spend floor, not prepaid, not resource lock** — chosen over upfront annual and per-resource term commitment ([ADR 0001](../docs/adr/0001-commitment-as-team-spend-floor.md)).
- **Discount + floor measured on fixed-bundle spend only** — metered/add-ons are variable, billed at list.
- **Monthly-in-arrears** — no prepaid exception to [invoicing.md](../invoicing.md).

## Blocked by

09 (postpaid two-phase invoice generation — the invoice this discounts).
