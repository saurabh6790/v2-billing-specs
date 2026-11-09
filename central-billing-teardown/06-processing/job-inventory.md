# Job inventory

Billing jobs from `central/hooks.py` `scheduler_events` at `a95b491e`. Paths under
`central/billing/`. "Isolated" means the job runs each row through
`platform/jobs.each_isolated` (savepoint and commit per row, failure logged, rest go on).

This lists what is scheduled in code. Whether each job runs on time in production,
how long it takes and how many rows it handles was not checked (no scheduler logs
were read).

## Scheduled

| Cadence | Job | Input | Output | Isolated | Duplicate protection | Monitoring |
|---|---|---|---|---|---|---|
| monthly | `revenue.invoicing.draft_monthly_invoices` | Teams with billable segments or usage in the closed month | Draft invoices via page jobs | Per team, own commit | `Invoice.period_key` unique; page jobs deduplicated on the slice bound; `Billing Run` unique on `period_end` | Billing Run row; readiness check B5; operator alerts |
| hourly | `revenue.invoicing.collect_due_invoices` | Drafts with no due date for closed months | Opened invoices, credit draws, first charges | Per invoice | Settled draft drops out of the scan | Billing Run counts |
| hourly | `payments.collection.collect_on_payment_date` | Owed invoices with payment date ≤ tomorrow; mandate debits whose window opened; single retries; reminders | Charges, reminders | Yes | In-flight attempt check; `payment_reminder_sent_at` conditional update | Operator alerts (stale attempts) |
| hourly | `ingester.erpnext_sync.retry_failed_syncs` | Invoices `Pending` with retry time passed | Sales Invoices | Yes | Marker on Sales Invoice; per-key lock | Failed syncs in operator alerts |
| hourly | `payments.reconciliation.run_reconciliation` | Unanswered attempts, unconfirmed top-ups, Pending refunds | Settled / failed attempts, credited or expired top-ups | Yes | `resolved_by` provenance; reads gateway only | — |
| hourly | `payments.webhooks.retry_failed_webhooks` | Failed events with retries left; Received older than 15 min | Re-enqueued events | Per event job | Unique event id; `already_applied` check | Failed webhooks in operator alerts |
| hourly | `platform.alerts.run_operator_alerts` | Invariants, readiness, failed webhooks, stale attempts, unsettled captures, held invoices, failed refunds, failed syncs | Raven / email digest | — | Digest dedupe, repeat window, mutes | Is the monitoring |
| daily | `revenue.dunning.run_dunning` | Open and overdue invoices | Retries, Overdue, suspension, termination due | Yes | Ladder dates on the invoice | Operator alerts (termination due) |
| daily | `payments.charges.cleanup_payment_logs` | Payment Attempts and Webhook Events past retention | Deletions | — | — | — |
| daily | `projection.batch.prune` | Old projection batches | Deletions | — | — | — |
| daily | `payments.emandate.run_emandate_cycle` | INR mandate invoices | Pre-debit notices, debits | Yes | `predebit_notified_at` | — |
| daily | `catalog.subscriptions.backfill_missing_subscriptions` | Running VMs with no Subscription | Subscriptions | Yes | Unique active subscription per server (`subscription.py:104`) | — |
| daily | `payments.settlement.run_billing_details_reminder` | Credit-funded teams without details | Reminder notices | — | — | — |
| daily | `revenue.credits.run_credit_expiry` | Expired promo grants | Debit entries | Yes | Ledger | — |
| daily | `revenue.gst_status.run_gst_status_refresh` | Indian GSTINs due a check | `gst_status` | — | `gst_status_retry_after` | — |
| daily | `ingester.customer.sync_pending_profiles` | Profiles not yet in ERPNext | ERPNext customers | — | lock | — |
| daily | `ingester.advance.sync_pending_advances` | Paid-in credits not yet in ERPNext | ERPNext advances | — | `advance_id` | — |
| daily | `revenue.storage_usage.record_storage_usage` | Storage resources | Usage Rollups | — | Rollup idempotency key | — |
| daily | `platform.invariants.run_invariant_audit` | Money tables | Violations | — | — | Feeds operator alerts |
| daily | `payments.reconciliation.recheck_completed_refunds` | Card refunds completed in last 30 days | Flags a later failure | — | — | — |
| monthly | `payments.payments.expire_payment_methods` | Cards past expiry month | Payment Method Expired | Yes | — | — |

## Event-driven and async

| Trigger | Handler | Queue |
|---|---|---|
| Gateway webhook | `payments/webhooks.py` `handle_webhook_event` | default, deduplicated by event |
| Invoice Paid | `erpnext_sync.enqueue_invoice_sync` | default |
| Billing Profile complete | `release_held_invoices` → `run.release_held_drafts` | billing |
| Invoice paid while suspended | `Invoice.on_update` → `restore_after_payment` (`doctype/invoice/invoice.py:118`) | inline, then power actions queued |
| Run page jobs | `draft_team_page`, `settle_draft_page` | `billing` (falls back to `long` with a warning) |
| Cohort projection | `projection/batch.py` | long, with wall-clock limit |

## Owners

No owner is recorded in code for any job. The operator alert channel (Raven or
email, Billing Settings) is the only routing. See
[asynchronous-processing-review.md](asynchronous-processing-review.md).
