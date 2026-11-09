# Screen inventory

Every billing surface a person can reach, who uses it, and how far this teardown
has covered it. Snapshot: central `a95b491e` (9 Nov 2026). Paths start at the
central repo root.

## How the screens were inspected

**Not in a browser.** The bench at `cenral-bench` serves `central.local`,
`demo-billing.local` and `prod-central-bck.local` on port 8011. A browser pass on
`demo-billing.localhost` (seeded demo data) was tried. It stopped at login: a
locally generated session could not replace the server's guest cookie without
putting the session id in a URL, which the audit does not do. So every screen
observation here comes from reading the Vue and Desk source. The local checkout
(`7323433f`) is 4 commits behind the snapshot, and none of the 4 touch the D1/D2
files. The source settles copy, logic, states and ARIA attributes. It does
**not** settle:

- rendered layout, spacing and colour contrast;
- behaviour at phone width beyond what the CSS classes state;
- focus order and screen-reader output;
- timing (how long skeletons show, how the page fills in).

Rows marked "source only" carry that limit. A visual pass needs someone signed
in to `demo-billing.localhost` ([product-decisions-required.md](../05-brainstorming/product-decisions-required.md), D-09).

**How often each problem happens** was measured read-only on
`prod-central-bck.local`, the production backup (latest invoice change 3 Nov 2026).
Results, aggregate counts only, are in
[measurements.md](../04-problem-discovery/measurements.md).

## Domains

The teardown runs domain by domain. This checkpoint covers the first two.

| Domain | Scope | Status |
|---|---|---|
| **D1 Billing setup and payment methods** | Billing details, country and currency, payment methods and their order, collection mode, payment day, onboarding billing step | **Covered at this checkpoint** |
| **D2 Invoices and collection** | Invoice list, receipt panel, Pay now, outstanding banner, statement, refunds card, operator invoice actions | **Covered at this checkpoint** |
| D3 Cost visibility and limits | This cycle card, spend chart, breakdown, limits, tiers, budget alert | Not started (earlier pass only) |
| D4 Wallet and credits | Top-up, wallet history, auto-recharge, credit expiry | Not started (earlier pass only) |
| D5 Subscriptions and projects | Subscriptions table, pause/resume, projects, stop all servers | Not started (earlier pass only) |
| D6 Purchase-time billing | Plan menu prices, limit checks, resize, trial upgrade | Not started (earlier pass only) |
| D7 Operator back office | Desk workspace, reports, catalog, corrections, simulator | D1/D2 touch points only |

## Customer console (`dashboard/`)

Routes: `dashboard/src/router/index.ts:114-130`. Sidebar: `dashboard/src/components/navigation/list.ts:93-116`.

| # | Surface | File | Kind | Domain | Persona | Covered |
|---|---|---|---|---|---|---|
| S-01 | Billing › Overview | `pages/billing/BillingOverviewPage.vue` | Page | D3–D5 (banners: D2) | Customer | Banners only |
| S-02 | Billing › Invoices | `pages/billing/BillingInvoicesPage.vue` | Page | D2 | Customer | Yes, source only |
| S-03 | Invoice list | `components/billing/InvoiceListView.vue` | Table | D2 | Customer | Yes, source only |
| S-04 | Invoice receipt panel | `BillingInvoicesPage.vue:172-412` | Side panel | D2 | Customer | Yes, source only |
| S-05 | Statement tab | `components/billing/StatementCard.vue` | Table + CSV | D2 | Customer, finance contact | Yes (earlier pass), source only |
| S-06 | Refunds card | `components/billing/RefundsCard.vue` | List | D2 | Customer | Yes (earlier pass), source only |
| S-07 | Outstanding / overdue banner | `components/billing/OutstandingAlert.vue` | Banner | D2 | Customer | Yes, source only |
| S-08 | Billing › Payments | `pages/billing/BillingPaymentsPage.vue` | Page | D1 | Customer | Yes, source only |
| S-09 | Payment methods card | `components/billing/PaymentMethodsCard.vue` | Ordered list | D1 | Customer | Yes, source only |
| S-10 | Payment method row menu | `components/billing/PaymentMethodRowActions.vue` | Menu | D1 | Customer | Yes, source only |
| S-11 | Remove payment method | `PaymentMethodsCard.vue:320-329` (`ConfirmDialog`) | Dialog | D1 | Customer | Yes, source only |
| S-12 | Add payment method | `components/AddMethodDialog.vue` | Dialog + gateway sheet | D1 | Customer | Yes, source only |
| S-13 | Billing details card | `components/billing/BillingDetailsCard.vue` | Read-only card | D1 | Customer | Yes, source only |
| S-14 | Billing details dialog | `EditBillingProfileDialog.vue` + `BillingProfileForm.vue` | Form | D1 | Customer | Yes, source only |
| S-15 | Setup flow (details → method) | `components/billing/PaymentMethodFlow.vue` | Dialog chain | D1 | Customer | Yes, source only |
| S-16 | INR "Action required" banner + "How do you want to pay?" | `components/billing/CollectionActionBanner.vue` | Banner + dialog | D1 | Customer (INR) | Yes, source only |
| S-17 | Payment schedule tray + payment day form | `PaymentSchedulePanel.vue`, `PaymentDayForm.vue` | Tray + form | D1 | Customer | Form yes; tray earlier pass |
| S-18 | Onboarding: billing step | `components/onboarding/BillingStep.vue`, `BillingCountryField.vue` | Wizard step | D1 | New customer | Yes, source only |
| S-19 | Trial billing banner | `components/billing/TrialBillingBanner.vue` | Banner | D1 | Trial customer | Copy only |
| S-20 | GSTIN status banner | `components/billing/GstStatusBanner.vue` | Banner | D1 | Customer (India) | Earlier pass |
| S-21 | This cycle, spend, limits, tiers, budget alert | `EstimatedCard.vue`, `SpendCard.vue`, `LimitsCard.vue`, `TiersPanel.vue`, `CycleBreakdownPanel.vue` | Cards + trays | D3 | Customer | Not yet |
| S-22 | Wallet history, top-up | `WalletHistoryPanel.vue`, `TopupDialog.vue` | Tray + dialog | D4 | Customer | Not yet |
| S-23 | Subscriptions, projects, stop all | `PayingForCard.vue`, `PayingForTable.vue`, `ProjectsPanel.vue`, project dialogs, `StopAllServersRow.vue` | Card + trays + dialogs | D5 | Customer | Not yet |
| S-24 | Plan menu, resize, trial upgrade | `PlanGroup.vue`, `NewServerPage.vue`, `ResizeServerDialog.vue`, `TrialUpgradePanel.vue` | Pages + dialogs | D6 | Customer | Not yet |
| — | `MeteredServicesCard.vue` | not imported anywhere | Dead component | — | — | Earlier pass |

## Operator surfaces (Frappe Desk)

Sidebar: `central/workspace_sidebar/billing.json` (95 items). Workspace:
`central/billing/workspace/billing/billing.json` (11 shortcuts, 47 report links).

| # | Surface | File | Domain | Persona | Covered |
|---|---|---|---|---|---|
| O-01 | Billing sidebar | `central/workspace_sidebar/billing.json` | D7 | Support, finance, product admin | Structure read |
| O-02 | Invoice form + Cancel / Refund Part / Cancel and Refund / Retry Failed Refunds | `central/billing/doctype/invoice/invoice.js:6-107` | D2 | Support, finance | Yes, source only |
| O-03 | Team form: Grant Credit, Adjust Credit, Suspend, Archive, Impersonate | `central/identity/doctype/team/team.js:8-49` | D1/D2/D4 | Support | Buttons read |
| O-04 | Billing Profile form | `central/billing/doctype/billing_profile/billing_profile.js` (20 lines) | D1 | Support | Listed |
| O-05 | Payment Method form | `central/billing/doctype/payment_method/` (no `.js`) | D1 | Support | Listed: no form script |
| O-06 | Payment Attempt, Refund, Webhook Event lists | DocType lists | D2 | Support, platform admin | Listed |
| O-07 | 41 reports (Collections section: AR Aging, Failed Payments, Dunning Recovery, …) | `central/billing/report/*` | D2/D7 | Finance | Listed, not reviewed |
| O-08 | Plan Configurator, catalog DocTypes | `central/billing/doctype/plan_configurator/` | D7 | Product admin | Not yet |
| O-09 | Billing Simulator page | `central/billing/page/billing_simulator` | D7 | Product admin, finance | Not yet |
| O-10 | Billing Settings, Payment Gateway, Trust Tier Level | Single + DocTypes | D7 | Platform admin | Not yet |
