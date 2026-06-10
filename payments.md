# Payments

## Purpose

Charge invoices and collect payment through external gateways by **reusing and extending
`frappe/payments`** — with signature-first webhooks, idempotent off-session charges, mandate-aware
ceilings, and reconciliation for lost confirmations. This reverses old issue #24 (which removed
`frappe/payments`); see [ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

## What we reuse from frappe/payments

`frappe/payments` already ships:

- The **`Payment Gateway`** DocType + `get_payment_gateway_controller(gateway)` resolver.
- Per-gateway **settings controllers**: `Razorpay Settings`, `Stripe Settings`, `PayPal Settings`,
  `GoCardless Settings`, `Paytm Settings`, `Mpesa Settings`, `Braintree Settings`, `Paymob Settings`
  — each a DocType with `validate_transaction_currency`, `get_payment_url`, and the SDK plumbing.
- **`Payment Request`** integration (ERPNext) — initiate a collection against a Sales Invoice.
- The redirect/checkout flow and `Integration Request` logging.

We use this as the gateway seam: **core billing logic never imports gateway SDKs** — it resolves a
controller through `Payment Gateway` and calls our extension methods on it.

## What we extend (the platform contract)

The `frappe/payments` controllers are built for **redirect checkout** (customer-present,
`get_payment_url`). The platform additionally needs **off-session recurring charges**, a hardened
**webhook spine**, and **mandate** handling. We add these as a **mixin / extension methods** on each
settings controller (one place per gateway), preserving the original method *contract* from the
first design without the parallel adapter hierarchy:

```python
class FCGatewayMixin:                       # mixed into <Gateway> Settings
    # universal
    def fc_validate_credentials(self) -> dict                       # cheap authed read; raises on bad keys
    def fc_setup_payment_method(self, team, setup_data) -> dict      # SetupIntent / mandate order
    def fc_validate_payment_method(self, payment_method) -> bool     # micro-charge (Stripe)
    def fc_charge(self, sales_invoice, payment_method, idempotency_key) -> PaymentResult  # OFF-SESSION
    def fc_refund(self, payment_entry, amount, reason) -> RefundResult
    def fc_verify_webhook_signature(self, payload: bytes, headers: dict) -> bool
    def fc_parse_webhook_event(self, payload: dict, headers: dict | None) -> NormalisedEvent
    def fc_get_transaction_status(self, gateway_txn_id: str) -> str

    # optional (base raises GatewayUnsupported)
    def fc_register_webhook(self, callback_url, events=None) -> dict  # → {endpoint_id, secret}
    def fc_verify_payment_signature(self, data: dict) -> bool         # checkout callback (Razorpay)
    def fc_cancel_mandate(self, mandate_reference, customer_reference=None) -> bool
    def fc_get_mandate_status(self, mandate_reference: str) -> str
```

Notes on the seam:
- **Amounts cross the seam as integer minor units.** `fc_charge`/`fc_refund` read the amount from
  the Sales Invoice's `fc_expected_collection` (computed in minor units) and pass it straight to
  Razorpay `amount` (paise) / Stripe `amount` (cents) — no float→int conversion, no boundary
  rounding ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)).
- `fc_validate_credentials` makes the cheapest authed read (Stripe `Account.retrieve()`, Razorpay an
  authed fetch) to prove the keys and confirm the account currency; raises `GatewayAuthError`.
- `fc_register_webhook` programmatically creates the endpoint pointed at this site and returns the
  signing secret. Stripe returns `whsec_…`; Razorpay takes a caller-chosen secret so the adapter
  generates a strong random one. Gateways that can't self-register fall back to `GatewayUnsupported`
  and the admin pastes the secret.
- `fc_parse_webhook_event` takes headers because Razorpay's dedupe id is in `X-Razorpay-Event-Id`,
  Stripe's in the body.
- Declines return a failed `PaymentResult`; transient/network failures raise `GatewayTimeout` so a
  retry reuses the same idempotency key.

**Target gateways:** Stripe (USD, Payment Intents, SetupIntent, micro-charge) and Razorpay (INR, UPI
Autopay mandate + recurring) at launch via the mixin; PayPal to follow. The other `frappe/payments`
controllers are available but unconfigured.

## Payment Gateway config (frappe/payments + setup hardening)

The gateway is a `frappe/payments` **`Payment Gateway`** row pointing at a `<Gateway> Settings`
controller (the existing model — `gateway_settings` + `gateway_controller`). We keep credentials and
webhook secrets in the settings controller (encrypted Password fields) and add the platform setup
hardening:

On **save** of the settings controller, when API key/secret are set or changed:

1. **Validate the keys** — `fc_validate_credentials()`. On `GatewayAuthError` → `frappe.throw`, save
   rejected. On success, stamp `credentials_validated_at` and confirm the account currency matches.
2. **Auto-register the webhook + fill the secret** — if no `webhook_endpoint_id`, call
   `fc_register_webhook(callback_url, events)` where `callback_url` is
   `<site_url>/api/method/central.billing.webhooks.<gateway>`; store `webhook_endpoint_id` and the
   returned signing secret (read-only field). Unsupported → manual secret field + show the callback URL.
3. **Enable gate** — the gateway can't be enabled while `credentials_validated_at` is empty.

**Rotation:** a "Re-validate & re-register webhook" action re-runs 1–2; de-registering tears down
the gateway-side endpoint via `webhook_endpoint_id`. Admin-only, setup-time; never touches the hot
charge/webhook paths.

## Payment Method lifecycle (kept custom, links payments token)

`frappe/payments` has no saved-method/mandate registry for off-session charges, so **Payment
Method** stays a custom DocType, storing the gateway token the mixin produced.

Add card → `fc_setup_payment_method` (Stripe SetupIntent / Razorpay order) → customer confirms →
**micro-charge (₹1 / $0.50) captured and refunded** → `active`.

```
pending_validation → active ↘ failed ;  active → expired (monthly scheduler)
```

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| gateway | Link → Payment Gateway | the frappe/payments row |
| method_type | Select | card / upi_autopay / prepaid_credits |
| gateway_method_id | Data | Stripe `pm_…`, Razorpay mandate ID |
| status | Select | pending_validation / active / expired / failed |
| priority | Int | **Fallback order** — 0 = primary, dense, team-scoped |
| is_default | Check | mirror of `priority == 0` |
| display_label | Data | "Visa ····4242" |
| expiry_month / expiry_year | Int | |
| mandate_max_amount | Long Int | **Minor units** = trust-tier cap (mandate methods only) |
| validated_at | Datetime | |

**No duplicate card across slots** — same `gateway_method_id` twice is rejected.

## Settlement fallback (primary → backup)

A team keeps an ordered list of active methods (by `priority`). When credits don't cover a bill,
settlement charges the **primary**, and on failure rotates to the next. Because a charge is confirmed
**asynchronously** (the Sales Invoice goes `Paid` only on the webhook → Payment Entry), fallback is
**event-driven**:

- A decline arrives synchronously (`PaymentResult.success == False`) or asynchronously (a webhook
  failure event).
- Both funnel into one idempotent collector, `collect_invoice(sales_invoice)`, which charges the
  next active, non-re-auth method **that has not already failed for this invoice** — deriving the
  "already failed" set from the invoice's Payment Requests / failed Payment Entries (no extra state).
- **Escalate, don't repeat:** each method is tried at most once per invoice. Once all fail, the
  invoice is left `Unpaid` for dunning to escalate. The `Sales Invoice … FOR UPDATE` lock + the
  in-flight Payment Request guard prevent double-charging.

Credits are consumed once before the card legs (the waterfall in [credits.md](credits.md)); fallback
only re-charges the card remainder.

## Settlement & mandates

See [credits.md](credits.md) for the full settlement model.

**Mandate ceilings.** A mandate (UPI Autopay) has a fixed `max_amount`. To make "bill exceeds
mandate" structurally impossible, **mandate `max_amount` = the team's trust-tier cap**. A promotion
that raises the cap requires **mandate re-authorisation**; until then the customer is held at the old
ceiling. **Cards are exempt.**

**Razorpay: card *or* UPI.** Razorpay does both rails as recurring tokens via the same flow
(`fc_setup_payment_method(method ∈ {upi, card})`). **UPI Autopay has a ₹1,00,000 recurring ceiling**
— so UPI is **blocked** (UI hides it; server backstop refuses) when the trust-tier cap or last
invoice ≥ ₹1,00,000, steering the team to a card. `mandates.upi_eligibility(team)` is the single
source.

**Gateway resolved by currency + controller, not "default".** INR → Razorpay (card + UPI), USD/EUR →
Stripe (card only). Razorpay is never shown to a non-INR team. Stripe cards use Stripe.js Elements
against a SetupIntent (PCI: the PAN never reaches the server).

## Webhooks (signature-first)

`frappe/payments` controllers don't all verify the signature first, so we own the inbound route and
wrap them. All gateway webhooks land at `/api/method/central.billing.webhooks.<gateway>`:

1. Read raw bytes before any JSON parsing.
2. `controller.fc_verify_webhook_signature()` — **first operation, before any DB access**. Fail →
   HTTP 400 (closes the v1 order-ID enumeration bug).
3. Parse into `NormalisedEvent`.
4. Insert a **Webhook Event** (unique on `gateway_event_id`) — duplicates fail silently, return 200.
5. Enqueue a background job for the state transition.

No business logic runs in the HTTP request cycle.

**Webhook Event** (custom DocType — kept; `frappe/payments`' `Integration Request` is not
signature-first-dedupe shaped): `gateway`, `gateway_event_id` (**unique**), `event_type`,
`raw_payload` (Long Text), `status` (received/processed/failed/ignored), `processed_at`, `error`.

## Charge flow & idempotency

`Unpaid` Sales Invoice → create a **Payment Request** (carries the gateway + idempotency key derived
from the request name) → `fc_charge()` → **wait for the webhook to record a Payment Entry and mark
the invoice `Paid`** (never on the API response). The API response only stamps the gateway
transaction id.

| Normalised webhook event | Effect |
|--------------------------|--------|
| `payment.authorised` / intent `requires_capture` | record authorised; no ledger move |
| `payment.captured` / `payment_intent.succeeded` | **create Payment Entry against the Sales Invoice → `Paid`** |
| `payment.failed` / `payment_intent.payment_failed` | record failure; re-enter `collect_invoice` (fallback) / dunning |

The webhook job that creates the Payment Entry is the same one that resolves the Payment Request.
Out-of-order/unmatched events are no-ops (the Webhook Event dedupe guarantees once-only). The
`Sales Invoice … FOR UPDATE` lock keeps concurrent collection from producing two Payment Entries.

## Refunds

- **Full dispute** → **return Sales Invoice (credit note) + `fc_refund()` to source**; original
  invoice stays `Paid`.
- **Partial overcharge** → credit the **wallet** (default for active customers; refund-to-source for
  churning) — a credit ledger entry + ERPNext credit note.
- Symmetric across gateways via the mixin. The refund is an ERPNext **Payment Entry** (Pay).

## Retry, reconciliation & log retention

- Failed payments retried Day 1 / 3 / 7. After Day 7 → Sales Invoice `Overdue`, standing `past_due`.
- **Reconciliation job (daily):** built on ERPNext **Payment Reconciliation** + a gateway scan,
  resolving the **"charged-at-gateway-but-never-webhooked"** terminal state without double-charging
  (idempotency key) or leaving revenue uncollected. The single most important hardening job.
- **Webhook Event** is high-volume append-only — pruned on a rolling 90-day window
  (`payment_log_retention_days`), skipping unhandled rows. Payment Entries are statutory ERPNext
  records and are **not** pruned.

## API

```
POST /api/method/central.billing.payments.initiate_payment_method_setup   # → client_secret
POST /api/method/central.billing.payments.confirm_payment_method          # → active after micro-charge
GET  /api/resource/Payment Method
PUT  /api/resource/Payment Method/{name}   { "priority": 0 }
POST /api/method/central.billing.payments.pay_invoice                      # → Payment Request
POST /api/method/central.billing.webhooks.stripe
POST /api/method/central.billing.webhooks.razorpay
```

## Notes

- ERPNext is the statutory SOR (in-process); Central is the SOR for the customer-facing balance.
- The gateway SDKs live entirely behind `frappe/payments` controllers — core logic imports none.
