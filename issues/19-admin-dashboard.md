# 19 — Admin dashboard

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md)

## What to build

The admin surface (`Billing Admin` role, Frappe internal). Cost-Explorer-style aggregate-then-drill-down: Total MRR/Spend → by Cluster → by Service → by Plan → by Team → by Invoice → line items. Plus panels: Payment Analytics (attempt→success by gateway, failure reasons), Overdue Aging (0–7/8–15/15–30/30d+), Credit Utilisation, **Free/Trial Subsidy** (true cost via cost_report), Gateway Config, Team Lookup, Price Management. All endpoints require `Billing Admin`; customers get 403.

Built as **Frappe-UI** routes inside the portal scaffold (#26) — Vue 3 + `frappe-ui`, using the `frappe-ui/tailwind` preset for press's exact colours/components (no bespoke palette); drill-down tables via `ListView`, charts via `vue-echarts`.

## Acceptance criteria

- [ ] Summary + cluster/team drill-down endpoints; all gated to `Billing Admin` (customer → 403).
- [ ] Payment analytics (success rate + failure reasons by gateway) and overdue aging buckets.
- [ ] Free/trial subsidy panel sums cost_report invoices by cluster and plan.
- [ ] Team lookup returns any team's subscriptions, invoices, payment history, credit balance.
- [ ] Price management updates plan price without affecting existing locks.
- [ ] UI is Frappe-UI on the #26 scaffold, using only the `frappe-ui` preset tokens (press parity — no custom palette).

## Blocked by

- #26
- #09
- #16
