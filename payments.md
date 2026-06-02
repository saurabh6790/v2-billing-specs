# Payments

## Purpose

Charge invoices and collect payment through external gateways behind a uniform adapter, with signature-first webhooks, idempotent charges, mandate-aware ceilings, and reconciliation for lost confirmations.

## Gateway Adapter

Core billing logic never imports gateway code. Each gateway implements:

```python
class GatewayAdapter:
    def setup_payment_method(self, team, setup_data) -> dict
    def validate_payment_method(self, payment_method) -> bool   # micro-charge
    def charge(self, invoice, payment_method, idempotency_key) -> PaymentResult
    def refund(self, payment_attempt, amount, reason) -> RefundResult
    def verify_webhook_signature(self, payload: bytes, headers: dict) -> bool
    def parse_webhook_event(self, payload: dict) -> NormalisedEvent
    def get_transaction_status(self, gateway_txn_id: str) -> str
```

Implemented: Stripe (USD, Payment Intents), Razorpay (INR, card + UPI Autopay mandate). PayPal to follow — one adapter class, no core changes.

## Payment Gateway (config)

One row per configured gateway. Credentials and webhook secrets are stored encrypted; the adapter for a charge/refund/webhook is resolved by `adapter_key`.

| Field | Type | Notes |
|-------|------|-------|
| name | Data | e.g. GW-Stripe, GW-Razorpay |
| title | Data | Display name |
| adapter_key | Select | stripe / razorpay / paypal — selects the `GatewayAdapter` impl |
| currency | Data | Settlement currency this gateway handles (USD, INR) |
| api_key | Password | Encrypted |
| api_secret | Password | Encrypted |
| webhook_secret | Password | Encrypted — used by `verify_webhook_signature` |
| supports_mandates | Check | True for UPI Autopay / SEPA-style gateways |
| is_enabled | Check | Disabled gateways reject new charges |
| is_default_for_currency | Check | Picked when a team's currency matches |

Managed only via the admin **Gateway Config** panel (see [dashboard.md](dashboard.md)). Secrets are never returned by any customer-facing API.

## Payment Method lifecycle

Add card → gateway setup flow (Stripe SetupIntent / Razorpay order) → customer confirms → **micro-charge (₹1 / $0.50) captured and refunded** to prove the card is live → `active`.

```
pending_validation → active
                   ↘ failed
active → expired (monthly expiry scheduler)
```

**Payment Method** (separate DocType — not child of Team)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| gateway | Link → Payment Gateway | |
| method_type | Select | card / upi_autopay / prepaid_credits |
| gateway_method_id | Data | Stripe `pm_xxx`, Razorpay mandate ID |
| status | Select | pending_validation / active / expired / failed |
| is_default | Check | |
| display_label | Data | "Visa ····4242" |
| expiry_month / expiry_year | Int | |
| mandate_max_amount | Currency | = trust-tier cap (mandate methods only) |
| validated_at | Datetime | |

## Settlement & mandates

See [credits.md](credits.md) for the full settlement model (≥1 source required; credits-then-card waterfall; wallet-gating for credits-only).

**Mandate ceilings.** A mandate (UPI Autopay, etc.) has a fixed `max_amount`. To make "bill exceeds mandate" structurally impossible, **mandate `max_amount` = the team's trust-tier cap**. A promotion that raises the cap requires **mandate re-authorisation** (customer re-consent); until then the customer is held at the old ceiling. **Cards are exempt** (off-session, any amount).

## Webhooks (signature-first)

All gateway webhooks land at `/api/method/cloud_billing.webhooks.<gateway>`:

1. Read raw bytes before any JSON parsing.
2. `adapter.verify_webhook_signature()` — **first operation, before any DB access**. Fail → HTTP 400. (Closes the v1 order-ID enumeration bug.)
3. Parse into `NormalisedEvent`.
4. Insert `Webhook Event` (unique on `gateway_event_id`) — duplicates fail silently, return 200.
5. Enqueue a background job for the state transition.

No business logic runs in the HTTP request cycle.

**Webhook Event** (separate DocType)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| gateway | Link → Payment Gateway | |
| gateway_event_id | Data | **Unique constraint** — dedupes replays |
| event_type | Data | |
| raw_payload | Long Text | Full JSON |
| status | Select | received / processed / failed / ignored |
| processed_at | Datetime | |
| error | Small Text | |

## Charge flow & idempotency

`Open` → `charge()` with `idempotency_key = payment_attempt.name` → **wait for webhook to mark `Paid`** (never mark paid on the API response). Each attempt is a new **Payment Attempt** record.

**Payment Attempt** (separate DocType — not child of Invoice)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| invoice | Link → Invoice | |
| gateway | Link → Payment Gateway | |
| payment_method | Link → Payment Method | |
| amount / currency | Currency / Data | |
| idempotency_key | Data | Unique — drives gateway dedupe |
| status | Select | initiated / authorised / captured / failed / refunded |
| gateway_transaction_id | Data | |
| initiated_at / completed_at | Datetime | |
| failure_code | Data | |
| failure_reason | Small Text | |
| retry_number | Int | 0 = first attempt |

## Retry & reconciliation

- Failed payments retried Day 1 / Day 3 / Day 7. After Day 7 → invoice `Overdue`, standing `past_due`. Notify with the failure reason each time.
- **Reconciliation job (daily):** scans ambiguous states against gateway APIs and resolves the **"charged-at-gateway-but-never-webhooked"** terminal state — without double-charging (idempotency key) or leaving revenue uncollected. The single most important hardening job.

## Refunds

- **Full dispute** → refund to source (`adapter.refund()`); invoice stays `Paid` + `Refund` record.
- **Partial overcharge** → credit the wallet (default for active customers; refund-to-source for churning customers).
- Symmetric across gateways via the adapter.

**Refund** (separate DocType — linked to the original Payment Attempt)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| payment_attempt | Link → Payment Attempt | The original charge |
| invoice | Link → Invoice | Stays `Paid` (no "refunded" state) |
| amount / currency | Currency / Data | |
| destination | Select | source (gateway) / wallet (credit ledger) |
| reason | Small Text | |
| gateway_refund_id | Data | |
| status | Select | initiated / completed / failed |
| created_at / completed_at | Datetime | |

## API

```
POST /api/method/cloud_billing.payments.initiate_payment_method_setup   # → client_secret
POST /api/method/cloud_billing.payments.confirm_payment_method          # → active after micro-charge
GET  /api/resource/Payment Method
PUT  /api/resource/Payment Method/{name}   { "is_default": 1 }
POST /api/method/cloud_billing.billing.pay_invoice                       # → Payment Attempt
POST /api/method/cloud_billing.webhooks.stripe
POST /api/method/cloud_billing.webhooks.razorpay
```

## Notes

- ERPNext is the statutory SOR; Cloud Billing is the SOR for the customer-facing balance. Corrections originate in Cloud Billing (see [invoicing.md](invoicing.md)).
