# Jobs, hooks and background work

Snapshot central `a95b491e` (9 Nov 2026). Sources: `central/hooks.py` (line numbers
below) and an AST scan of `central/billing` for `enqueue` calls and DocType controller
methods. Everything here is **registration in code (E1)**. Whether each job runs on
schedule in production, how long it takes and what it does on a given day were not
checked (no scheduler logs read). What a job does is not described here unless its
code was read; see [workflows.md](workflows.md).

## Scheduled jobs (21)

| Cadence | Function | `central/hooks.py` |
|---|---|---|
| daily | `central.billing.revenue.dunning.run_dunning` | 302 |
| daily | `central.billing.payments.charges.cleanup_payment_logs` | 303 |
| daily | `central.billing.projection.batch.prune` | 304 |
| daily | `central.billing.payments.emandate.run_emandate_cycle` | 305 |
| daily | `central.billing.catalog.subscriptions.backfill_missing_subscriptions` | 306 |
| daily | `central.billing.payments.settlement.run_billing_details_reminder` | 307 |
| daily | `central.billing.revenue.credits.run_credit_expiry` | 308 |
| daily | `central.billing.revenue.gst_status.run_gst_status_refresh` | 309 |
| daily | `central.billing.ingester.customer.sync_pending_profiles` | 310 |
| daily | `central.billing.ingester.advance.sync_pending_advances` | 311 |
| daily | `central.billing.revenue.storage_usage.record_storage_usage` | 312 |
| daily | `central.billing.platform.invariants.run_invariant_audit` | 313 |
| daily | `central.billing.payments.reconciliation.recheck_completed_refunds` | 314 |
| hourly | `central.billing.revenue.invoicing.collect_due_invoices` | 317 |
| hourly | `central.billing.payments.collection.collect_on_payment_date` | 318 |
| hourly | `central.billing.ingester.erpnext_sync.retry_failed_syncs` | 319 |
| hourly | `central.billing.payments.reconciliation.run_reconciliation` | 320 |
| hourly | `central.billing.payments.webhooks.retry_failed_webhooks` | 321 |
| hourly | `central.billing.platform.alerts.run_operator_alerts` | 322 |
| monthly | `central.billing.revenue.invoicing.draft_monthly_invoices` | 327 |
| monthly | `central.billing.payments.payments.expire_payment_methods` | 328 |

Non-billing jobs in the same file that import billing (for example
`central.signups.trial.run_trials`) are outside this list.

## Lifecycle hooks

| Hook | Billing functions | `central/hooks.py` |
|---|---|---|
| `after_install` | `catalog.taxonomy_setup.ensure_catalog_masters`, `settings.ensure_snapshot_settings`, `platform.constraints.ensure_constraints`, `settings.ensure_welcome_credit_amounts`, `settings.ensure_minimum_invoice_amounts`, `gateways.setup.ensure_gateway_records`, `navigation.ensure_workspace_sidebars` | 139-146 |
| `after_migrate` | same, without the welcome-credit and minimum-invoice seeds | 334-339 |
| `before_tests` | same as `after_install` without minimum-invoice seed | 352-358 |
| `override_doctype_dashboards` | `Currency` → `api.dashboard_overrides.currency_dashboard` | 387 |

`platform.constraints.ensure_constraints` adds one database CHECK constraint:
`tabCredit Wallet` `balance >= 0` (`central/billing/platform/constraints.py:26-32,46-54`).

## Document events

| DocTypes | Event → function | `central/hooks.py` |
|---|---|---|
| Invoice, Payment Attempt, Refund, Credit Ledger Entry, Credit Wallet, Usage Rollup, Webhook Event, Billing Event, Top-up Order | `validate` → `platform.records.refuse_manual_edit`; `on_trash` → `platform.records.refuse_manual_delete` | 215-230 |

## Permission hooks

| DocTypes | Hook → function | `central/hooks.py` |
|---|---|---|
| 21 DocTypes in `_BILLING_TEAM_RECORDS` | `permission_query_conditions` → `central.permissions.billing_record_query_conditions`; `has_permission` → `central.permissions.billing_record_has_permission` | 440-462, 481, 501 |

Both functions return operator-only access (`central/permissions.py:355-365`, E2): a
System Manager sees every billing record; nobody else sees any through Frappe's
generic read paths.

## DocType controller hooks

| DocType | Methods defined on the controller class | File |
|---|---|---|
| Billing Event | before_insert | `central/billing/doctype/billing_event/billing_event.py` |
| Billing Profile | validate, after_insert, on_update | `central/billing/doctype/billing_profile/billing_profile.py` |
| Billing Scenario | validate | `central/billing/doctype/billing_scenario/billing_scenario.py` |
| Billing Settings | validate | `central/billing/doctype/billing_settings/billing_settings.py` |
| Catalog Rate | autoname, validate | `central/billing/doctype/catalog_rate/catalog_rate.py` |
| Credit Ledger Entry | after_insert, validate | `central/billing/doctype/credit_ledger_entry/credit_ledger_entry.py` |
| Credit Wallet | validate | `central/billing/doctype/credit_wallet/credit_wallet.py` |
| Invoice | autoname, validate, on_update | `central/billing/doctype/invoice/invoice.py` |
| Payment Attempt | validate | `central/billing/doctype/payment_attempt/payment_attempt.py` |
| Payment Gateway | validate | `central/billing/doctype/payment_gateway/payment_gateway.py` |
| Payment Method | validate, on_update | `central/billing/doctype/payment_method/payment_method.py` |
| Plan | validate | `central/billing/doctype/plan/plan.py` |
| Plan Category | validate | `central/billing/doctype/plan_category/plan_category.py` |
| Plan Configurator | before_validate | `central/billing/doctype/plan_configurator/plan_configurator.py` |
| Refund | on_update | `central/billing/doctype/refund/refund.py` |
| Rerating Run | before_insert | `central/billing/doctype/rerating_run/rerating_run.py` |
| Subscription | validate, after_insert, on_update | `central/billing/doctype/subscription/subscription.py` |
| Subscription Change | validate | `central/billing/doctype/subscription_change/subscription_change.py` |
| Tax Profile | validate | `central/billing/doctype/tax_profile/tax_profile.py` |
| Trust Tier Level | validate | `central/billing/doctype/trust_tier_level/trust_tier_level.py` |

## Background jobs (enqueue calls)

| Location | Target | Options |
|---|---|---|
| `central/billing/doctype/credit_ledger_entry/credit_ledger_entry.py:21` | `'central.billing.revenue.invoicing.lifecycle.settle_with_new_credit'` | enqueue_after_commit=True |
| `central/billing/doctype/plan_configurator/plan_configurator.py:151` | `run_generation` | queue='long' |
| `central/billing/ingester/advance.py:24` | `'central.billing.ingester.advance.sync_advance'` | queue='short', job_id=f'advance-sync::{entry}', deduplicate=True, enqueue_after_commit=True |
| `central/billing/ingester/customer.py:48` | `profile.team` | — |
| `central/billing/ingester/customer.py:102` | `team` | job_id=f'customer-sync::{team}::{following}' |
| `central/billing/ingester/customer.py:127` | `team` | — |
| `central/billing/ingester/customer.py:134` | `team` | — |
| `central/billing/ingester/customer.py:142` | `team` | — |
| `central/billing/ingester/customer.py:198` | `'central.billing.ingester.customer.sync_customer_profile'` | queue='short', job_id=job_id or f'customer-sync::{team}', deduplicate=True, enqueue_after_commit=True |
| `central/billing/ingester/erpnext_sync.py:28` | `'central.billing.ingester.erpnext_sync.sync_invoice'` | enqueue_after_commit=True, queue='long' |
| `central/billing/payments/corrections.py:780` | `'central.billing.payments.corrections.run_cancellation'` | queue='short', job_id=f'cancellation::{invoice}::{frappe.generate_hash(length=6)}', enqueue_after_commit=True |
| `central/billing/payments/mandates.py:353` | `'central.billing.payments.mandates.refund_authorisation_payment'` | job_id=f"mandate-authorisation-refund::{payment['id']}", deduplicate=True, enqueue_after_commit=True |
| `central/billing/payments/settlement.py:236` | `'central.billing.payments.settlement.remind_team_page'` | queue=billing_queue(), job_id=f'billing-details-ask::{page[-1]}', deduplicate=True |
| `central/billing/payments/webhooks.py:91` | `gateway` | — |
| `central/billing/payments/webhooks.py:153` | `'central.billing.payments.webhooks.handle_webhook_event'` | job_id=f'webhook_event::{event_name}', deduplicate=True, enqueue_after_commit=True |
| `central/billing/projection/batch.py:93` | `'central.billing.projection.batch.run_batch'` | queue=projection_queue(), timeout=WALL_CLOCK_LIMIT_SECONDS + 300 |
| `central/billing/projection/batch.py:141` | `'central.billing.projection.batch.run_batch'` | queue=projection_queue(), timeout=WALL_CLOCK_LIMIT_SECONDS + 300 |
| `central/billing/revenue/gst_status.py:155` | `'central.billing.revenue.gst_status.refresh'` | queue='short', job_id=f'gst-status::{team}', deduplicate=True, enqueue_after_commit=True |
| `central/billing/revenue/gst_status.py:186` | `'central.billing.revenue.gst_status.refresh_stale'` | queue='long', job_id='gst-status-refresh', deduplicate=True |
| `central/billing/revenue/invoicing/run.py:227` | `'central.billing.revenue.invoicing.run.settle_held_drafts'` | queue=billing_queue(), job_id=f'billing-release::{team}', deduplicate=True, enqueue_after_commit=True |
| `central/billing/revenue/invoicing/run.py:353` | `'central.billing.revenue.invoicing.draft_team_page'` | queue=billing_queue(), job_id=f'billing-draft::{period_end}::{until}', deduplicate=True |
| `central/billing/revenue/invoicing/run.py:470` | `'central.billing.revenue.invoicing.settle_draft_page'` | queue=billing_queue(), job_id=f'billing-settle::{cutoff}::{until}', deduplicate=True |

Paths start at the central repo root. `billing_queue()` returns the `billing` queue if the bench config declares it, else `long` with a warning (`central/billing/revenue/invoicing/run.py:65-79`). `projection_queue()` does the same for its own queue and never falls back to `billing` (`central/billing/projection/batch.py:47-58`). Which queues production declares was not checked.
