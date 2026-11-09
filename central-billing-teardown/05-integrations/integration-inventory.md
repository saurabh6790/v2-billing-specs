# Integration inventory

Snapshot `a95b491e`. No secret values are reproduced; only where they are read from.
Timeouts, retries and idempotency are as written in code (E1–E2); none was observed
working in production.
Paths are under `central/billing/`.

## Summary

| Integration | Direction | Auth (where read) | Contract | Timeout | Retry | Idempotency | Reconciliation |
|---|---|---|---|---|---|---|---|
| Stripe | Out: charges, SetupIntents, PaymentIntents, refunds. In: webhooks | API secret via `Payment Gateway.get_credential`; webhook secret; `Stripe-Signature` check | Stripe API, version pinned `2026-08-26.dahlia` per request | SDK default (80 s) | SDK `max_network_retries = 2` (module-global) | `idempotency_key` on charge, refund, card check | Hourly `run_reconciliation`; daily `recheck_completed_refunds` |
| Razorpay | Out: orders, recurring payments, refunds, payment links. In: webhooks | API key and secret via `get_credential`; `X-Razorpay-Signature` | Razorpay REST through `razorpay` SDK | **None** | None in adapter; transient errors raised as `GatewayTimeout` (`razorpay_adapter.py:28`) | Order id stored and committed before `createRecurring`; `X-Refund-Idempotency` on refunds (`:205-212`) | same |
| PayPal | Out: orders, captures, vaulted charges, refunds. In: webhooks | Client id/secret via `get_credential`; OAuth token cached per gateway (`paypal_adapter.py:305-309`); verify-webhook-signature API | PayPal REST v2, no SDK | 30 s each call | Transient errors caught at verify (`:186-188`) | `PayPal-Request-Id` = idempotency key (`:138`) | same |
| ERPNext | Out: Customer, Address, Contact, Sales Invoice, Payment Entry, advances, credit notes. In: GST status reads | `token key:secret` from site config (`ingester/connection.py:23-28`) | Frappe REST `api/resource`, `api/method` | 30 s | Sales Invoice: 3 attempts, backoff 60/120/240 s but driven by the hourly job, then Failed and ops alert (`erpnext_sync.py:22-23,100-117`) | Marker in `remarks` (`_marker`); per-key lock (`ingester/locks.py`) | None automatic after Failed |
| Atlas | Out: VM stop/start for pause and suspension, resize. In: VM status | `central.integrations` (outside billing) | Region API | outside billing | Resource Action retries | Resource Action | `central.integrations.servers.reconcile` every 10 min |
| Grove, Cargo | In: usage totals | Pilot credential (`pilot_credential_auth`) | `report_usage` (`api/billing_api.py:623`) | n/a | Caller resends; totals only increase | `Usage Rollup.idempotency_key` unique | — |
| Pilot sites | In: 25 facade endpoints | Pilot credential | `api/billing_api.py` | n/a | Caller | Per endpoint | — |
| Raven | Out: operator alerts | Bot API key/secret in Billing Settings | Raven REST | `RAVEN_TIMEOUT_SECONDS` | Next hourly digest | Digest dedupe and repeat window | — |
| Email / in-app | Out: customer notices | Frappe | `platform/notifications.notify` | queue | Frappe email queue | `payment_reminder_sent_at` conditional update | — |
| GST portal | In, through ERPNext | ERPNext | ERPNext method | 30 s | `gst_status_retry_after` | — | Daily `run_gst_status_refresh`; customer "Check again" |

## Inbound webhooks

| Gateway | Endpoint | Order of work |
|---|---|---|
| Stripe | `payments/webhooks.py:29` `stripe` | Verify signature (`:80`) → ignore events not for Central (`is_central_event`, `:96`) → store with unique `gateway_event_id` (`:122-148`; a duplicate insert is treated as already stored) → enqueue with `deduplicate=True` (`:150-157`) → `handle_webhook_event` (`:162`) |
| Razorpay | `:38` `razorpay` | same |
| PayPal | `:48` `paypal` | same, signature through PayPal's verify API |

Retries: failed events retried hourly up to `MAX_TRIES = 5`; events still `Received`
after 15 minutes are re-enqueued (`:217-237`). After 5 tries an event stays Failed;
the hourly operator alert lists failed webhooks. No Desk action reprocesses one event.

## Outbound to ERPNext

| Record | When | Code |
|---|---|---|
| Customer, Address, Contact | Billing Profile complete or changed; daily sweep | `ingester/customer.py` `sync_pending_profiles` |
| Sales Invoice + Payment Entry | Invoice Paid | `ingester/erpnext_sync.py` `enqueue_invoice_sync`, `sync_invoice:36` |
| Advance (top-up) | Paid-in credit | `ingester/advance.py` `sync_pending_advances` |
| Credit note | Cancel and refund | `payments/corrections.py` |

Invoices are held (`hold_reason = Accounting Sync`) until the customer is synced and
the GSTIN checked, so an invoice is never issued against a customer ERPNext does not
know.
