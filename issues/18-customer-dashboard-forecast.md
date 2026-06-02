# 18 — Customer dashboard + forecast

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md), [invoicing.md](../invoicing.md)

## What to build

The self-service customer portal (`Billing User` role), strictly scoped to the logged-in team via permission query — no cross-team data ever returned. Surfaces: current-month forecast (projected bill vs credit balance, driven by the running-total meter rows + fixed accrual), active subscriptions, invoice history + detail (line items, status, PDF), payment methods, credit balance & ledger, notification preferences.

## Acceptance criteria

- [ ] All customer endpoints auto-scoped to the caller's team; passing another team's name is ignored.
- [ ] Forecast API returns projected_total, credit_balance, shortfall, days_remaining, line_items.
- [ ] Forecast reads live metered running-totals + fixed accrual.
- [ ] Invoice history/detail with PDF download; payment methods; credit ledger view.
- [ ] Admin-only fields (gateway config, success rates, waive) never exposed here.

## Blocked by

- #09
- #11
- #12
