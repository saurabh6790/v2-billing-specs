# Dashboard

## Purpose

Two strictly role-gated surfaces over the same data: an admin (Frappe internal) view across all teams, and a self-service customer view scoped to one team.

## Roles

- **`Billing Admin`** (Frappe finance/ops/support) — all teams, all clusters. `[Admin]` endpoints return cross-team data.
- **`Billing User`** (team owner / billing contact) — own team only. `[Customer]` endpoints are auto-scoped by permission query; passing another team's name in filters is ignored.

A customer never sees another team's data; an admin can see and act on any team.

## Admin dashboard

Cost-Explorer style — aggregate totals, drill down progressively:

```
Total MRR / Spend (current month + trend)
  └ by Cluster └ by Service └ by Plan └ by Team └ by Invoice → Line items
```

Panels: Payment Analytics (attempt→success by gateway, failure reasons) · Overdue Aging (0–7 / 8–15 / 15–30 / 30d+) · Credit Utilisation · **Free/Trial Subsidy** (cost-to-company for non-paying teams — true cost via `cost_report` invoices) · Gateway Config · Team Lookup · Price Management.

```
GET /api/method/cloud_billing.admin.dashboard.get_summary?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_cluster_breakdown?cluster=&from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_team_billing?team=&from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_free_trial_costs?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_payment_analytics?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_overdue_invoices?aging_bucket=8-15
```

## Customer dashboard

Self-service portal, scoped to the logged-in team:

```
Current Month Forecast (projected bill vs credit balance)
  └ Active Subscriptions └ Current Month Usage Breakdown
Invoice History → Invoice Detail (line items, status, PDF)
Payment Methods (add / remove / default)
Credit Balance & Ledger (top up)
Notification Preferences
```

Intentionally omits: other teams' data, gateway config, payment success rates, admin operations (waive, manual credit adjustment).

## Notes

- Forecast is driven by the running-total meter rows + fixed accrual (see [metering.md](metering.md), [invoicing.md](invoicing.md)).
