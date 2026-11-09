# Workflow inventory

The 17 workflows from the source prompt, reconstructed from code at `a95b491e`.
Paths are under `central/billing/` unless they start with `central/` or `dashboard/`.
"Manual" means a person must act for the workflow to finish.

Customer-side walkthroughs of the same flows are in
[customer-to-cash.md](customer-to-cash.md). State diagrams are in
[lifecycle-diagrams.md](lifecycle-diagrams.md).

## Summary

| # | Workflow | Trigger | Main code | Jobs | External | Manual |
|---|---|---|---|---|---|---|
| 1 | Customer onboarding | Signup, then billing step | `api/dashboard/account.py` `save_billing_profile`; `payments/provisioning.py` (entry tier, tax profile, welcome credit) | `ingester.customer.sync_pending_profiles` (daily) | ERPNext customer | No |
| 2 | Product purchase | Customer creates server or subscribes to a service | `central/api/servers.py` → `central.resource_actions.submit_request` → `validate_purchase` | — | Atlas | No |
| 3 | Subscription creation | Virtual Machine reaches Running | `Virtual Machine.on_update` → `catalog/subscriptions.py:120`; snapshots `catalog/snapshots.py:33`; IPs `public_ips.py:53`; services `catalog/services.py` | `backfill_missing_subscriptions` (daily) | Atlas status | No |
| 4 | Service activation | Atlas creates the VM | `central/integrations` | `central.integrations.servers.reconcile` (*/10) | Atlas | No |
| 5 | Usage collection | Grove/Cargo call `report_usage`; Central records VM runtime | `api/billing_api.py:623` → `revenue/metering.py:193` `ingest_rollup`; `platform/sync.py` `record_meter_rollups`; `revenue/storage_usage.py` | `record_storage_usage` (daily) | Grove, Cargo | No |
| 6 | Billing calculation | Monthly draft, live forecast | `revenue/invoicing/generate.py`, `lines.py` (hour/day weighted from Subscription Change segments), `metering.metered_line_items`, `catalog/commitments.py`, `revenue/tax.py` | — | — | No |
| 7 | Invoice generation | 1st of month | `revenue/invoicing/run.py` `draft_monthly_invoices` → page jobs → `draft_team_invoice` | `draft_monthly_invoices` (monthly), `collect_due_invoices` (hourly) | — | Held drafts need the customer to complete billing details |
| 8 | Payment initiation | Payment date reached; "Pay now"; dunning retry | `payments/collection.py` `collect_invoice`; `payments/charges.py` `pay_invoice`, `create_invoice_payment_order:292` | `collect_on_payment_date` (hourly), `run_emandate_cycle` (daily) | Stripe, Razorpay, PayPal | Manual Checkout teams pay by hand |
| 9 | Payment confirmation | Gateway webhook | `payments/webhooks.py:75` `process_webhook` (signature first) → `_store_and_enqueue` (unique event id) → `handle_webhook_event` | `retry_failed_webhooks` (hourly), `run_reconciliation` (hourly) | Gateways | No |
| 10 | Payment allocation | Webhook capture applied | Payment Attempt → Invoice; surplus to wallet; late capture refunded; capture on Cancelled/Waived to wallet (ARCHITECTURE §4C) | — | — | Operator told on Cancelled/Waived capture |
| 11 | Invoice settlement | Credits cover at open, or capture | `revenue/invoicing/lifecycle.py` (open, credits draw, `expected_collection:95`); `revenue/credits.py` | — | ERPNext Sales Invoice push on Paid | No |
| 12 | Subscription renewal | No renewal event. Monthly subscriptions bill in arrears from segments until stopped. Annual billing cycle exists as a field. | `lines.py` | monthly run | — | — |
| 13 | Upgrade and downgrade | Customer resizes | `central/api/servers.py` `resize_server` → `catalog/subscriptions.py` `begin_resize` → `apply_resize_billing` → new Subscription Change at today's rate | — | Atlas | Disk cannot shrink (`catalog/subscriptions.py:867`) |
| 14 | Cancellation | Customer terminates server; pause billing | Server terminate (outside billing) ends segment; `pause_billing` `catalog/subscriptions.py:1134` | — | Atlas | No |
| 15 | Refunds | Operator action on Invoice | Desk buttons `doctype/invoice/invoice.js` → `api/admin/corrections.py` → `payments/corrections.py` (cancel and refund, refund part, retry failed refunds) | `recheck_completed_refunds` (daily), reconciliation (hourly, Pending refunds) | Gateway refund API; ERPNext credit note | **Yes**, always operator-started |
| 16 | Credit adjustments | Operator | `api/admin/teams.py:69` `adjust_team_credits` (button on Team form, `central/identity/doctype/team/team.js`); promo grants; expiry | `run_credit_expiry` (daily) | ERPNext advance for paid-in credit | **Yes** |
| 17 | Suspension and reactivation | Dunning ladder; payment | `revenue/dunning.py` `run_dunning`, `run_single_retries:433`; `catalog/subscriptions.py` `suspend_for_nonpayment`, `restore_after_payment:1214` (called from `doctype/invoice/invoice.py:118`) | `run_dunning` (daily), single retry inside `collect_on_payment_date` | Atlas stop/start | Termination after suspension is an operator decision (`platform.alerts.termination_due`) |

## Detail

### 1. Customer onboarding

- **Data written:** Billing Profile, Tax Profile, Credit Ledger Entry (welcome credit,
  unique on `instrument_fingerprint`), Gateway Customer, Payment Method.
- **States:** Payment Method Pending Validation → Active / Failed.
- **Notifications:** none billing-specific until first invoice; billing-details
  reminder daily for credit-funded teams (`settlement.run_billing_details_reminder`).
- **Failure:** card check declines → `decline.method_failure_message` copy; gateway
  outage → wrapped message (`gateways/base.py:130-143`).
- **Recovery:** customer retries. Gateway customer is committed before the order so a
  failure does not orphan it.
- **Gap:** the card check is a charge, but onboarding says "No charge today" (F-04).

### 7–11. Customer to cash

See [customer-to-cash.md](customer-to-cash.md). Key controls:

| Control | Where |
|---|---|
| One invoice per team per period | `Invoice.period_key` unique |
| One team = one transaction = one commit in the run | `revenue/invoicing/run.py` |
| Lock-wait and deadlock retried with jitter | `draft_team_invoice` `CONTENTION_RETRIES` |
| Late run never shortens grace (dates set from open day) | ARCHITECTURE §3 |
| No debit before payment date; pre-debit notice 24 h before mandate debit | `payments/collection.py` `collect_invoice` |
| Webhook stored once, processed async, retried | `payments/webhooks.py:122-217` |
| Amount, currency and stored row checked before settle | ARCHITECTURE §4C table |

### 15. Refunds

- **Trigger:** operator only. Customers have no refund request screen; they see
  refunds in the Refunds card (`dashboard/src/components/billing/RefundsCard.vue`).
- **Rules:** full refund = cancel and refund (invoice → Cancelled, credit note in
  ERPNext). Partial = refund part, invoice stays Paid (`payments/corrections.py:45-93`).
  A credit note is time-limited: "A credit note for this invoice was due by {0}, so
  it can no longer be cancelled." (`:757`).
- **Failure:** Refund Failed → "Retry Failed Refunds" button; Pending refunds
  reconciled hourly.

### 16. Credit adjustments

- Two buttons on the Team form: "Grant Credit" (promotional, with validity days and a
  required note) and "Adjust Credit" (credit or debit, does not expire, required note)
  (`central/identity/doctype/team/team.js:38-39,166-221`). Both call
  `api/admin/teams.py:69` `adjust_team_credits` or the grant path.
- The note is required only in the Desk dialog. The API accepts `note=None`
  (`api/admin/teams.py:67-69`), so a direct call leaves no reason. Cancel and refund
  enforce a reason in the API (`api/admin/corrections.py:18,30,50`).
- No approval step or second person for any amount.

### 17. Suspension and reactivation

- With defaults: invoice opens on the 1st, retries every 2 days to the due date, Overdue
  on the last retry day, suspended on the 15th, termination due on the 25th.
- Suspension stops servers and flags `stopped_for_nonpayment`. Payment restores
  standing and starts only those servers (`catalog/subscriptions.py:1214-1230`).
- **Copy gap:** the console tells the customer "you can start them again once the
  bill is settled" (`PaymentSchedulePanel.vue:174-177`) and "Pay the bill to start
  them again" (`lib/dunning.ts:27`). The servers restart by themselves (F-22).
