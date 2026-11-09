# Support operations review

How an operator or support person handles common billing problems at `a95b491e`.
Admin work happens in Frappe Desk (`/desk`), not in the customer console. Only
System Manager has billing DocType permissions; `api/admin/*` requires an operator
(`authz.py:74`).

## What an operator has

### Billing workspace

`central/billing/workspace/billing/billing.json`: 29 blocks.

| Section | Contents |
|---|---|
| Setup needed | Custom block that lists missing accounting setup |
| At a glance | 4 number cards: Open Invoices, Overdue Invoices, Active Subscriptions, Failed Payments (24h) |
| Manage catalog | Launch a plan, Launch an add-on (metered), Update prices, Retire a plan / add-on |
| Dashboards | Billing Health, Billing Day, P&L, Unit Economics, Bare Metal Yield, Cloud Overview, First Payment |
| Reports | 6 cards (Revenue, Profitability, Capacity, Collections, Credits and Growth, Billing Health) over 41 reports |

### Actions on records

| Where | Buttons | Evidence |
|---|---|---|
| Invoice | Cancel, Cancel and Refund, Refund Part, Retry Failed Refunds | `doctype/invoice/invoice.js` |
| Team | Grant Credit, Adjust Credit | `central/identity/doctype/team/team.js:38-39` |
| Billing Settings | Send Test Alert, Check Accounting Setup | `doctype/billing_settings/billing_settings.js` |
| Payment Gateway | Pull / Update webhook settings | `doctype/payment_gateway/payment_gateway.js` |
| Plan Configurator | Generate Plans, Publish Rates | `doctype/plan_configurator/plan_configurator.js` |
| Billing Profile | Edit tier override (reason required, `billing_profile.py:318`), internal flag (operator only, reason required, `:341-343`) | form |
| Billing Simulator | Desk page for projections | `page/billing_simulator` |

### Operator functions with no screen

Searched every `.js`, `.ts`, `.vue` and `.json` in `central/` and `dashboard/` for a
caller. None found for:

| Function | What it does | File |
|---|---|---|
| `preview_rerating`, `apply_rerating` | Re-price a past period for a resource type | `api/admin/rerating.py:13,20` |
| `correct_rollup_terms` | Fix the rate or allowance on a usage rollup | `api/admin/rerating.py:29` |
| `get_team_billing` | One-team billing view (subscriptions, standing) | `api/admin/teams.py:33` |
| `subscribe_team_service` | Subscribe a team to a metered service | `api/admin/services.py:35` |
| `set_default_gateway` | Change the default gateway per currency | `api/admin/gateways.py:84` |
| `reissue_invoice` | Cancel and reissue a pre-payment invoice | `revenue/invoicing/lifecycle.py` |
| `waive_for_internal_team` | Waive an internal team's invoice | `revenue/invoicing/lifecycle.py` (runs automatically monthly) |
| `defer_dunning` | Move a customer's dunning anchor | `revenue/dunning.py` |
| `sync_invoice` | Push one invoice to ERPNext again | `ingester/erpnext_sync.py:36` |
| `retry_payment` | Charge an invoice now | `revenue/dunning.py:319` |
| reprocess a Webhook Event | — | no function exposed; issue 131 |

## Common support cases

| Case | How it is handled today | Steps | Complexity | Gap |
|---|---|---|---|---|
| "Why is my bill this amount?" | Open Invoice in Desk; line items carry `arithmetic` and `basis` | 2 | Low | Desk Invoice view is the raw form. The customer's receipt panel is clearer than what support sees. |
| "I was charged but the invoice is unpaid" | Check Payment Attempt and Webhook Event; reconciliation runs hourly | 3–5 | Medium | If the webhook exhausted retries, only a console replay settles it (IR-03) |
| Dispute / chargeback | Webhook moves attempt; a note on the invoice; alert | auto | Low | Funds-withdrawn event not handled (issue 134) |
| Invoice correction before payment | `reissue_invoice` | console | High | No button |
| Invoice correction after payment | Cancel and Refund, or Refund Part | 2 | Low | Credit note deadline (`payments/corrections.py:757`) |
| Wrong usage billed | Rerating or rollup correction | console | High | No screen; no preview UI |
| Goodwill credit | Team › Grant Credit | 2 | Low | No approval, no limit |
| Customer needs more time | `defer_dunning` | console | High | No button. Support's only Desk lever is to wait. |
| Customer needs a higher limit | Billing Profile tier override with reason | 2 | Low | Good |
| Customer suspended and has paid, server not back | Check power action failure | 3+ | Medium | No dashboard of failed restores |
| Tax invoice missing in ERPNext | Find Invoice with `erpnext_sync_status = Failed` | console | High | No retry button (IR-02) |
| Customer cannot add a card | Payment Method Failed rows, Billing Events | 3 | Medium | Issue 125 (record every failure) |

## Communication to customers

| Event | Channel | Evidence |
|---|---|---|
| Payment scheduled, reminder, retry failed, overdue, refunded, payment date changed | Email + in-app, to members with `billing:view` | `payments/payment_notices.py`; ARCHITECTURE §4B |
| Billing details required | Email | `settlement.run_billing_details_reminder` |
| GSTIN lapsed | Console banner | `GstStatusBanner.vue` |
| Budget alert crossed | Notification to team | `EstimatedCard.vue:65-66` (stored on Billing Profile) |

No customer-visible message tells a team *why* a support action happened (credit
granted, refund made) beyond the ledger note and the Refunds card.

## Escalation

The only escalation path in code is the operator alert digest
(`platform/alerts.py`), with one channel for all kinds, and `termination_due`
paging an operator after suspension. No severity levels, owners or SLAs are encoded.
