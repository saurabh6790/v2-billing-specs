# Payments

## Purpose

Charge invoices and collect payment through external gateways behind a uniform adapter, with signature-first webhooks, idempotent charges, mandate-aware ceilings, and reconciliation for lost confirmations.

## Gateway Adapter

Core billing logic never imports gateway code. Each gateway implements:

```python
class GatewayAdapter:
    # universal (every gateway implements)
    def setup_payment_method(self, team, setup_data) -> dict   # SetupIntent / mandate order
    def validate_payment_method(self, payment_method) -> bool  # micro-charge (Stripe)
    def charge(self, invoice, payment_method, idempotency_key) -> PaymentResult
    def refund(self, payment_attempt, amount, reason) -> RefundResult
    def verify_webhook_signature(self, payload: bytes, headers: dict) -> bool
    def parse_webhook_event(self, payload: dict, headers: dict | None) -> NormalisedEvent
    def get_transaction_status(self, gateway_txn_id: str) -> str

    # optional, gateway-specific (base default raises GatewayUnsupported)
    def create_customer(self, team) -> str
    def verify_payment_signature(self, data: dict) -> bool     # checkout callback (Razorpay)
    def cancel_mandate(self, mandate_reference, customer_reference=None) -> bool
    def get_mandate_status(self, mandate_reference: str) -> str
```

Notes on the seam:
- **Amounts cross the seam as integer minor units** — `charge`/`refund` read the invoice/attempt
  amount (already paisa/cent — [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) and pass
  it straight to Razorpay `amount` (paise) / Stripe `amount` (cents). No float→int conversion, no
  rounding at the boundary: the integer billing computed is the integer charged.
- `parse_webhook_event` receives headers because Razorpay's dedupe id is in the `X-Razorpay-Event-Id` header while Stripe's is in the body.
- `verify_payment_signature` is the **client checkout callback** verification (Razorpay UPI Autopay authorisation / one-time order) — distinct from `verify_webhook_signature`. Stripe confirms via intent status, so it leaves this unsupported.
- Declines return a failed `PaymentResult`; transient/network failures raise `GatewayTimeout` so a retry reuses the same idempotency key.

Implemented: Stripe (USD, Payment Intents, SetupIntent, micro-charge), Razorpay (INR, UPI Autopay mandate order + recurring charge). PayPal to follow — one adapter class, no core changes.

## Payment Gateway (config)

One row per configured gateway. Credentials and webhook secrets are stored encrypted; the adapter for a charge/refund/webhook is resolved by `adapter_key`.

| Field | Type | Notes |
|-------|------|-------|
| name | Data | e.g. GW-Stripe, GW-Razorpay |
| title | Data | Display name |
| adapter_key | Select | stripe / razorpay / paypal — selects the `GatewayAdapter` impl |
| currencies | Table → Payment Gateway Currency | Currencies this gateway can settle; one row per currency |
| api_key | Password | Encrypted |
| api_secret | Password | Encrypted |
| webhook_secret | Password | Encrypted — used by `verify_webhook_signature` |
| supports_mandates | Check | True for UPI Autopay / SEPA-style gateways |
| is_enabled | Check | Disabled gateways reject new charges |

**Payment Gateway Currency** (child of Payment Gateway)

| Field | Type | Notes |
|-------|------|-------|
| currency | Link → Currency | e.g. USD, INR, EUR |
| is_default | Check | This gateway is the default handler for this currency. At most one enabled gateway may have `is_default = True` per currency — saving a row with `is_default = True` clears the flag on any other gateway row for the same currency. |

A gateway handles as many currencies as it has rows in this child table (e.g. Stripe can carry USD, EUR, GBP; Razorpay carries INR). The `is_default` check is how the resolver picks the gateway when a team's billing currency matches multiple configured gateways. Marking a different gateway's row `is_default` for a currency is all that is needed to switch routing — no other field changes.

**Gateway resolver** (`gateways.resolve_gateway_for_currency(currency)`): queries `Payment Gateway Currency` for rows where `currency = <team currency>`, `is_default = True`, and the parent gateway `is_enabled = True`. Returns the matching gateway; raises `GatewayNotFound` if none configured.

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
| is_default | Check | Mirror of `priority == 0` (the primary); kept for back-compat |
| priority | Int | **Fallback order** — 0 = primary, 1 = first backup, … (team-scoped, dense) |
| display_label | Data | "Visa ····4242" |
| expiry_month / expiry_year | Int | |
| mandate_max_amount | Long Int | **Minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) = trust-tier cap (mandate methods only) |
| validated_at | Datetime | |

**No duplicate card across slots.** A team cannot register the same card (same `gateway_method_id`) twice — the controller rejects it on validate. Using the same card as both primary *and* backup gives no real fallback, so it is disallowed.

## Settlement fallback (primary → backup methods)

A team keeps an **ordered list** of active methods (by `priority`). When credits don't cover a bill, settlement charges the **primary**, and on failure rotates to the next method. Because a charge is confirmed **asynchronously** (the invoice goes `Paid` only on the webhook — see Charge flow), fallback is **event-driven**, not a synchronous try/except cascade:

- A decline arrives on one of two timelines: **synchronously** (`PaymentResult.success == False` at charge time) or **asynchronously** (a webhook failure event later).
- Both funnel into one idempotent collector, `collect_invoice(invoice)`, which charges **the next active, non-re-auth method that has not already failed for this invoice**, deriving the "already failed" set from the invoice's `Payment Attempt` rows (no extra state).
- **Immediate fallback:** on a synchronous decline the collector rotates to the next method **within the same run**. A synchronous success (captured) stops and waits for the webhook; a webhook failure re-enters the collector to rotate.
- **Escalate, don't repeat:** each method is tried **at most once per invoice**. Once every method has failed, the collector returns "no method" and the invoice is left `Open` for dunning ([#14](issues/14-retry-dunning-suspension.md)) to escalate (Overdue → suspend) — it does **not** re-charge a method that already failed.
- The existing in-flight guard + `Invoice … FOR UPDATE` lock keep re-entry from double-charging.

Credits are untouched by fallback — they are consumed once before the card legs (the credits-then-card waterfall in [credits.md](credits.md)); fallback only re-charges the card **remainder**.

## Settlement & mandates

See [credits.md](credits.md) for the full settlement model (≥1 source required; credits-then-card waterfall; wallet-gating for credits-only).

**Mandate ceilings.** A mandate (UPI Autopay, etc.) has a fixed `max_amount`. To make "bill exceeds mandate" structurally impossible, **mandate `max_amount` = the team's trust-tier cap**. A promotion that raises the cap requires **mandate re-authorisation** (customer re-consent); until then the customer is held at the old ceiling. **Cards are exempt** (off-session, any amount).

**Razorpay: card *or* UPI (don't force UPI).** Razorpay does both rails as recurring tokens via the same Checkout → token → recurring-charge flow (`setup_payment_method` takes `method` ∈ {`upi`, `card`}). The "Add payment method" dialog lets the team **choose**; it isn't UPI-only. **UPI Autopay has a ₹1,00,000 recurring ceiling** (the MCC limit) — a recurring UPI charge above it fails at the gateway. So UPI is **blocked** (UI hides it; `setup_mandate` refuses as the server backstop) when the **trust-tier cap or the last invoice ≥ ₹1,00,000**, steering the team to a card (cards carry no such limit). `mandates.upi_eligibility(team)` is the single source of that decision; `dashboard.get_payment_method_options` surfaces it to the UI.

**Gateway resolved by currency via `is_default` row.** The add-method flow calls `gateways.resolve_gateway_for_currency(team.currency)` to find the gateway, then uses its `adapter_key` to determine which payment rails are available: **INR → Razorpay** (card + UPI); **USD/EUR → Stripe**, card only — Razorpay is never shown to a non-INR team. The adapter drives the UI options, not a hardcoded currency check, so swapping the default gateway for a currency in the config panel is enough to change the rails offered. The Stripe card is added with Stripe.js Elements against a SetupIntent (PCI: the PAN never reaches the server).

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

`Open` → create a new **Payment Attempt against that invoice** → `charge()` with `idempotency_key = payment_attempt.name` → **wait for the webhook to mark `Paid`** (never mark paid on the API response). Each charge of an invoice is a new Payment Attempt record (`invoice` link + incrementing `retry_number`); the API response only stamps `gateway_transaction_id`, never a terminal status.

**The Payment Attempt is webhook-driven.** The synchronous `charge()` call leaves the attempt at `initiated`; from there its status is advanced **only** by the respective gateway webhook callback for that transaction (resolved back to the attempt via `gateway_transaction_id`, or `idempotency_key` for Stripe). The webhook job that flips the invoice `Open → Paid` is the same job that advances the attempt — one normalised event updates both. Mapping:

| Normalised webhook event | Payment Attempt status | Invoice effect |
|--------------------------|------------------------|----------------|
| `payment.authorised` / intent `requires_capture` | `authorised` | — (no ledger move yet) |
| `payment.captured` / `payment_intent.succeeded` | `captured` | `Open → Paid`, `amount_paid` set, ledger debit |
| `payment.failed` / `payment_intent.payment_failed` | `failed` (with `failure_code` / `failure_reason`) | stays `Open`; re-enters `collect_invoice` for fallback ([#28](issues/28-secondary-payment-method-fallback.md)) / dunning ([#14](issues/14-retry-dunning-suspension.md)) |

The `authorised` event advances only from `initiated` (it never walks a terminal attempt backwards if the capture/fail callback raced ahead). The terminal `refunded` state is set by the Refund flow ([#15](issues/15-refunds.md)), not this charge webhook — the invoice stays `Paid`. Unmatched or out-of-order events are no-ops (the `Webhook Event` dedupe on `gateway_event_id` already guarantees each callback applies once). The `Invoice … FOR UPDATE` lock keeps concurrent `pay_invoice` calls from producing two `captured` attempts.

**Payment Attempt** (separate DocType — not child of Invoice)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| invoice | Link → Invoice | |
| gateway | Link → Payment Gateway | |
| payment_method | Link → Payment Method | |
| amount / currency | Long Int / Data | amount in **minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) |
| idempotency_key | Data | Unique — drives gateway dedupe |
| status | Select | initiated / authorised / captured / failed / refunded |
| gateway_transaction_id | Data | |
| initiated_at / completed_at | Datetime | |
| failure_code | Data | |
| failure_reason | Small Text | |
| retry_number | Int | 0 = first attempt |

## Log retention & cleanup

`Payment Attempt` and `Webhook Event` are high-volume append-only logs (one row per charge / per inbound callback). They are kept on a **rolling 3-month window** and pruned by a daily scheduler — the same pattern as `Sync Log` ([#03](issues/03-agent-event-log-price-lock.md)):

- `charges.cleanup_payment_logs` (daily scheduler) deletes `Payment Attempt` and processed/ignored `Webhook Event` rows older than the window.
- Window is site-config driven: `payment_log_retention_days`, **default 90 (~3 months)**.
- **Never prune live records.** Skip any Payment Attempt that is non-terminal (`initiated` / `authorised`), whose invoice is still unsettled (`Open` / `Overdue`), or that is referenced by a `Refund`; keep any `Webhook Event` not yet handled (`received` / `failed`) so a stuck event stays visible for triage. Statutory amounts live on the Invoice / ERPNext Sales Invoice (the SOR), so pruning the gateway log loses no money trail.

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
| amount / currency | Long Int / Data | amount in **minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) |
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
