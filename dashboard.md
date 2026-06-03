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

## Frontend stack

Both surfaces are **Frappe-UI** SPAs (Vue 3 + Vite + Vue Router + Pinia), the same stack `frappe/press` ships its dashboard on. They are **not** Desk forms.

- **Design system = `frappe-ui` Tailwind preset.** Use `presets: [frappeUIPreset]` from `frappe-ui/tailwind` (as press does). The preset *is* the source of the colour tokens, spacing, and typography — adopting it yields press's exact CSS/colour patterns by construction. **No bespoke palette, no hand-picked hex values**; only press's tokens (`gray`, `blue` primary, semantic `green`/`amber`/`red` for paid/at-risk/overdue).
- **Components** come from `frappe-ui` (`Button`, `Dialog`, `ListView`, `Badge`, form controls); charts via `echarts`/`vue-echarts`; icons via `unplugin-icons` / `feather-icons` — matching press's choices.
- **Data layer:** `frappe-ui` resources (`createResource`/`createListResource`) call the whitelisted endpoints below; no direct DB access from the client.
- **Scaffold once, shared:** the SPA shell, router, auth/team context, and the imported design tokens are set up in the portal scaffold (#26); #18 and #19 build their routes inside it.

Customer screens follow the billing wireframes ([central-spec wireframes#billing](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing)): Billing Overview (prepaid wallet-balance vs postpaid outstanding-invoice variants) · Invoice List · Invoice Detail (line items + PDF) · Top-Up dialog (prepaid) · Pay-Invoice dialog (postpaid) · Billing Settings (prepaid/postpaid mode, min-balance / spend-alert thresholds).

## Notes

- Forecast is driven by the running-total meter rows + fixed accrual (see [metering.md](metering.md), [invoicing.md](invoicing.md)).
- The billing wireframes are render targets for #18; the design tokens are non-negotiable (press parity), the exact layout may adapt to the live data model.
