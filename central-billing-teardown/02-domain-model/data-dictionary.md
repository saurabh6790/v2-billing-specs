# Data dictionary

All 52 billing DocTypes at `a95b491e`. "Fields" counts data fields (layout breaks
excluded only in the detail tables below). "Perms" is the role permission in the
DocType JSON: r read, w write, c create, d delete. "Track" is `track_changes`.

## DocTypes

| DocType | Kind | Naming | Status options | Money fields | Perms (System Manager) | Track |
|---|---|---|---|---|---|---|
| Accounting Gateway Account | child | — | — | 0 | — | 0 |
| Accounting Receivable Account | child | — | — | 0 | — | 0 |
| Billing Event | doc | hash | — | 1 | r | 1 |
| Billing Notification Log | doc | hash | Queued / Failed / Suppressed | 0 | rwcd | 0 |
| Billing Profile | doc | field:team | (collection_mode, gst_status) | 3 | rwcd | 1 |
| Billing Projection Batch | doc | hash | — | 0 | rd | 0 |
| Billing Projection Summary | doc | hash | — | 5 | rd | 0 |
| Billing Run | doc | field:period_end | Drafting / Collecting / Complete | 0 | r | 0 |
| Billing Run Team | doc | `{period_end}-{team}` | — | 0 | r | 0 |
| Billing Scenario | doc | field:scenario_name | — | 0 | rwcd | 0 |
| Billing Scenario Event | child | — | — | 2 | — | 0 |
| Billing Scenario Rate | child | — | — | 1 | — | 0 |
| Billing Settings | single | — | — | 0 | rwc | 1 |
| Catalog Rate | doc | default | — | 1 | rwcd | 1 |
| Commitment | doc | hash | Active / Completed / Breached | 1 | rwcd | 1 |
| Credit Ledger Entry | doc | hash | (entry_type Credit / Debit) | 3 | r | 1 |
| Credit Wallet | doc | `{team}-{currency}` | — | 1 | r | 1 |
| Entitlement Token | doc | hash | — | 0 | rwcd | 0 |
| Gateway Customer | doc | `{team}::{gateway}` | — | 0 | rwcd | 1 |
| Invoice | doc | default | Outstanding / Paid / Overdue / Waived / Cancelled | 11 | r | 1 |
| Invoice Line Item | child | — | — | 2 | — | 0 |
| Minimum Invoice Amount | child | — | — | 1 | — | 0 |
| Muted Operator Alert | child | — | — | 0 | — | 0 |
| Payment Attempt | doc | hash | Initiated / Authorised / Captured / Failed / Refunded | 1 | r | 1 |
| Payment Gateway | doc | field:adapter_key | — | 0 | rw | 1 |
| Payment Gateway Currency | child | — | — | 1 | — | 0 |
| Payment Gateway Webhook Event | child | — | OK / Missing / Not Used | 0 | — | 0 |
| Payment Method | doc | hash | Pending Validation / Active / Paused / Cancelled / Expired / Failed | 1 | rwcd | 1 |
| Plan | doc | hash | — | 0 | rwcd | 1 |
| Plan Category | doc | field:category_name | — | 0 | rwcd | 1 |
| Plan Category Resource Type | child | — | — | 0 | — | 0 |
| Plan Configurator | doc | field:template_name | — | 0 | rwcd | 1 |
| Plan Configurator Component Rate | child | — | — | 1 | — | 1 |
| Plan Configurator Plan | child | — | — | 0 | — | 1 |
| Plan Configurator Rate | child | — | — | 1 | — | 1 |
| Plan Configurator Simple Plan | child | — | — | 0 | — | 0 |
| Plan Includes | child | — | — | 0 | — | 0 |
| Plan Sub-Category | doc | field:sub_category_name | — | 0 | rwcd | 1 |
| Project | doc | hash | — | 1 | rwcd | 1 |
| Refund | doc | hash | Initiated / Pending / Completed / Failed | 4 | r | 1 |
| Rerating Run | doc | hash | Running / Complete / Failed | 0 | r | 0 |
| Resource Type | doc | field:resource_type_name | — | 1 | rwcd | 1 |
| Subscription | doc | hash | (account_standing Current / Past Due / Suspended) | 0 | rwcd | 1 |
| Subscription Change | doc | hash | (change_type, 9 values) | 1 | r | 1 |
| Tax Profile | doc | field:team | — | 0 | rwcd | 1 |
| Top-up Order | doc | `TU-{YY}{MM}-{#####}` | Created / Credited / Failed / Expired | 3 | r | 1 |
| Trust Tier Level | doc | prompt | — | 0 | rwcd | 1 |
| Trust Tier Threshold | child | — | — | 2 | — | 0 |
| Usage Rollup | doc | hash | — | 1 | r | 1 |
| Webhook Event | doc | hash | Received / Processed / Failed / Ignored | 0 | r | 1 |
| Welcome Credit Amount | child | — | — | 1 | — | 0 |

Only System Manager has DocType permissions. Customers never read these DocTypes
directly; every customer read goes through `api/dashboard/*`, which checks the
team capability with `authz.py` and then reads with `frappe.get_all` /
`ignore_permissions` (128 `ignore_permissions=True` in billing outside tests).

## Unique keys (duplicate guards)

| DocType | Unique field | What it prevents |
|---|---|---|
| Invoice | `period_key` (`team|period_start|period_end`) | Two invoices for one team and period (ADR 0018) |
| Payment Attempt | `idempotency_key` | Two attempts for one charge key |
| Webhook Event | `gateway_event_id` | Processing one gateway event twice |
| Usage Rollup | `idempotency_key` | Double-counting one usage report |
| Credit Ledger Entry | `gateway_payment_id`, `instrument_fingerprint` | Crediting one gateway payment twice; a second welcome credit for the same card |
| Billing Run | `period_end` | Two runs for one period |
| Billing Profile, Tax Profile | `team` | Two profiles per team |

## Core fields

### Invoice (50 fields)

| Group | Fields |
|---|---|
| Identity | `team`, `invoice_type` (Billable / Cost Report), `status`, `period_start`, `period_end`, `period_key` |
| Dates | `due_date`, `payment_date`, `dunning_starts_on`, `suspends_on`, `paid_at`, `predebit_notified_at`, `predebit_charge_after`, `payment_reminder_sent_at` |
| Hold | `hold_reason` (Billing Details / Accounting Sync / GSTIN Check) |
| Amounts | `currency` (**Data**, not Link), `subtotal`, `commitment_discount`, `commitment_clawback`, `output_tax_type`, `output_tax_rate`, `output_tax_amount`, `zero_rating_reason`, `customer_gstin`, `total`, `tds_*` (4), `credit_applied`, `advance_applied`, `advance_tax_applied`, `expected_collection`, `amount_paid` |
| ERPNext | `erpnext_invoice`, `payment_record_id`, `promotional_record_id`, `credit_note_id`, `erpnext_sync_status`, `erpnext_synced_at`, `erpnext_sync_attempts`, `erpnext_next_retry_at`, `erpnext_sync_error`, `pdf_url` |

### Billing Profile (49 fields)

Address and contact (8), GST (`gstin`, `gst_status`, `gst_category`, checked/retry dates),
collection (`collection_mode`, `collection_action_reason`, `min_balance`,
`spend_alert_threshold`), payment day (`payment_day`, `payment_day_changes`,
`payment_day_changes_cycle`), tier (`trust_tier_level` Link **and** `trust_tier` Data
copy, `manual_override`, `override_max_spend`, `promoted_at`, `promotion_basis`),
internal (`is_internal`, `internal_reason`), ERPNext ids (`profile_id`, `address_id`,
`contact_id`).

### Subscription (21 fields)

`team`, `project`, `pricing_mode` (Preset / Composed), `plan`, `sub_category`,
`includes`, `billing_cycle`, `account_standing`, `stopped_for_nonpayment`,
`start_date`, `default_payment_method`, `gateway`, `enabled`, `server_id`, `cluster`,
`service_subject`, `vm_snapshot`, `public_ip_server`.

There is **no lifecycle status** (running, stopped, terminated) on Subscription. The
console's Subscriptions table reads `sub.status === 'Terminated'` and `'Stopped'`
(`dashboard/src/components/billing/PayingForTable.vue:52-59`), which the API adds
from the server record.

### Payment Attempt (23 fields)

`invoice`, `team`, `gateway`, `payment_method`, `amount`, `currency` (**Data**),
`idempotency_key`, `retry_number`, `status`, `gateway_transaction_id`,
`gateway_order_id`, `resolved_by` (Webhook / Reconciliation), `initiated_at`,
`gateway_hold_until`, `completed_at`, `failure_code`, `decline_code`,
`failure_reason`, `gateway_response` (JSON).

### Credit Ledger Entry (18 fields)

`team`, `entry_type`, `amount`, `tax_amount`, `paid_in`, `currency`,
`running_balance`, `expires_on`, `reference_type`, `reference_name` (Data, not Dynamic
Link), `gateway_payment_id`, `instrument_fingerprint`, `advance_id`, `created_at`, `note`.

## Type inconsistencies

| Field | Type | Elsewhere |
|---|---|---|
| `Invoice.currency`, `Payment Attempt.currency`, `Usage Rollup.currency` | Data | Link → Currency on Credit Ledger Entry, Billing Profile, Top-up Order, Subscription Change |
| `Credit Ledger Entry.reference_type/name` | Data / Data | A Dynamic Link would let Desk open the source record |
| `Usage Rollup.resource_type`, `cluster` | Data | `Resource Type` and `Region` exist as DocTypes |
