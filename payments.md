# Payments

## Purpose

Charge invoices and collect payment through external gateways behind a uniform adapter, with signature-first webhooks, idempotent charges, mandate-aware ceilings, and reconciliation for lost confirmations.

## Gateway Adapter

Core billing logic never imports gateway code. Each gateway implements:

```python
class GatewayAdapter:
    # universal (every gateway implements)
    def validate_credentials(self) -> dict                     # cheap authed read; raises on bad keys
    def setup_payment_method(self, team, setup_data) -> dict   # SetupIntent / mandate order
    def validate_payment_method(self, payment_method) -> bool  # micro-charge (Stripe)
    def charge(self, invoice, payment_method, idempotency_key) -> PaymentResult
    def refund(self, payment_attempt, amount, reason) -> RefundResult
    def verify_webhook_signature(self, payload: bytes, headers: dict) -> bool
    def parse_webhook_event(self, payload: dict, headers: dict | None) -> NormalisedEvent
    def get_transaction_status(self, gateway_txn_id: str) -> str

    # optional, gateway-specific (base default raises GatewayUnsupported)
    def register_webhook(self, callback_url: str, events: list[str] | None = None) -> dict  # → {endpoint_id, secret}; events defaults to the adapter's set
    def create_customer(self, team) -> str
    def verify_payment_signature(self, data: dict) -> bool     # checkout callback (Razorpay)
    def cancel_mandate(self, mandate_reference, customer_reference=None) -> bool
    def get_mandate_status(self, mandate_reference: str) -> str
```

Notes on the seam:
- **Each adapter converts to its gateway's minor units at the boundary** — money is stored as a float
  `Currency` in major units (₹, $); `charge`/`refund` read the invoice/attempt amount and the adapter
  converts it to the integer units its gateway API requires — Razorpay `amount` (paise), Stripe
  `amount` (cents) — at the call. That conversion is local to the adapter, not a system-wide storage
  model. *([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units storage
  was never implemented and is deprecated.)*
- `validate_credentials` makes the **cheapest possible authenticated read** against the gateway (Stripe `Account.retrieve()`, Razorpay an authed `payments` fetch) purely to prove the keys work. It returns the gateway account identity (used to confirm the keys match the expected account/currency) and raises `GatewayAuthError` on rejected credentials — it never charges or mutates anything.
- `register_webhook` programmatically creates the webhook endpoint at the gateway pointed at this site's callback URL and returns the signing `secret` to store. Stripe `WebhookEndpoint.create(...)` returns a `whsec_…` secret; Razorpay's create-webhook API takes a secret the caller chooses, so the adapter **generates a strong random secret server-side**, registers it, and returns it. Gateways that can't self-register fall back to the base default (`GatewayUnsupported`) and the admin pastes the secret manually.
- `parse_webhook_event` receives headers because Razorpay's dedupe id is in the `X-Razorpay-Event-Id` header while Stripe's is in the body.
- `verify_payment_signature` is the **client checkout callback** verification (Razorpay UPI Autopay authorisation / one-time order) — distinct from `verify_webhook_signature`. Stripe confirms via intent status, so it leaves this unsupported.
- Declines return a failed `PaymentResult`; transient/network failures raise `GatewayTimeout` so a retry reuses the same idempotency key.

Implemented: Stripe (Payment Intents, SetupIntent, micro-charge — the off-session saved-method rail, and under [ADR 0023](docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md) the rail for **every instrument a Stripe India account can carry**: Visa, Mastercard and Amex one-time, and Visa/Mastercard India card e-mandates), Razorpay (**everything Stripe India cannot take at all** — RuPay, UPI one-time, UPI Autopay, netbanking, and card mandates on networks Stripe will not register). PayPal is a one-time method *inside* Razorpay (international acceptance), not a separate adapter — the standalone PayPal adapter ([#25](issues/25-paypal-adapter.md)) is retired.

The ₹15,000 silent-debit ceiling is an **RBI rule and applies to Stripe India identically** — moving the rail does not move the ceiling. See [payments-inr.md](payments-inr.md).

## Payment Gateway (config)

**Exactly one row per provider, named after its adapter** — `Stripe`, `Razorpay`, `Paypal` ([ADR 0021](docs/adr/0021-one-payment-gateway-record-per-provider.md)). The rows are seeded on install/migrate; an admin fills in keys and flips `is_enabled`, and never creates or deletes one. A second row for the same provider would be unaddressable — there is one webhook callback URL per adapter, and nothing on the row carries a team/region/entity to route on. Credentials and webhook secrets are stored encrypted; the adapter for a charge/refund/webhook is resolved by `adapter_key`.

| Field | Type | Notes |
|-------|------|-------|
| name | Data | = `adapter_key` (`autoname: field:adapter_key`); renaming is off |
| adapter_key | Select | Stripe / Razorpay / Paypal — selects the `GatewayAdapter` impl. `set_only_once`: it names the row, so it cannot be repointed at another provider |
| currencies | Table → Payment Gateway Currency | Currencies this gateway can settle; one row per currency |
| api_key | Password | Encrypted |
| api_secret | Password | Encrypted |
| webhook_secret | Password | Encrypted — used by `verify_webhook_signature`. **System-managed: auto-filled by webhook auto-registration (read-only); not hand-entered when the gateway supports `register_webhook`** |
| webhook_endpoint_id | Data | Gateway's id for the registered endpoint (Stripe `we_…`) — lets us rotate/de-register it |
| credentials_validated_at | Datetime | Set when `validate_credentials` last passed; cleared when api_key/api_secret change |
| supports_mandates | Check | True for UPI Autopay / SEPA-style gateways |
| is_enabled | Check | Disabled gateways reject new charges |

**Payment Gateway Currency** (child of Payment Gateway)

| Field | Type | Notes |
|-------|------|-------|
| currency | Link → Currency | e.g. USD, INR, EUR |
| is_default | Check | This gateway is the default handler for this currency. At most one enabled gateway may have `is_default = True` per currency — saving a row with `is_default = True` clears the flag on any other gateway row for the same currency. |
| max_silent_charge | Currency | Largest amount this gateway may pull **off-session** in this currency. Empty = no ceiling. Stripe INR = ₹15,000, Stripe USD = empty, Razorpay INR = ₹15,000 |
| requires_predebit_notice | Check | **We** send the pre-debit notification and hold the debit for 24h on this rail. False where the gateway does it itself: Stripe's India flow notifies on confirm and holds the intent in `processing` for 26h, so arming our own window on top would delay the charge by two days and notify twice ([ADR 0023](docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md) §6) |

A gateway handles as many currencies as it has rows in this child table (Stripe carries USD, EUR, GBP **and INR**; Razorpay carries INR). The `is_default` check is how the resolver picks the gateway when a team's billing currency matches multiple configured gateways. Marking a different gateway's row `is_default` for a currency is all that is needed to switch routing — no other field changes.

**The silent-debit ceiling lives here, not on the adapter** ([ADR 0022](docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §6). It is a property of *(gateway, currency)*: Stripe pulls any amount in USD and at most ₹15,000 in INR, because the RBI ceiling follows the currency and the merchant's country, not the provider. A per-adapter scalar cannot express that.

**Gateway resolver** (`gateways.resolve_gateway_for_currency(currency)`): queries `Payment Gateway Currency` for rows where `currency = <team currency>` and `is_default = True`, and returns the first whose parent gateway `is_enabled = True`; raises `GatewayNotFound` if none configured. Every default row is considered, not just one — the uniqueness rule only clears the flag on *enabled* gateways, so a gateway that was switched off keeps its default flag and must not shadow the live one.

**Resolving a specific rail** (a PayPal top-up, or the Razorpay a Via-Razorpay PayPal row delegates to) is a primary-key read: the row named after the adapter, checked for `is_enabled` and for a currency row. The same is true of the webhook spine — `webhooks._resolve_gateway(adapter_key)` loads the row by name, so there is no ambiguity about which `webhook_secret` verifies a signature.

Managed only via the admin **Gateway Config** panel (see [dashboard.md](dashboard.md)). Secrets are never returned by any customer-facing API.

### Gateway setup: validate keys + auto-fill webhook secret

Configuring a gateway is the one place a wrong credential goes unnoticed until the first real charge fails. So setup is **validated and self-wiring** — the admin pastes only the API key/secret; the system proves them and provisions the webhook itself.

On **save** of a Payment Gateway (controller `validate`), when `api_key` / `api_secret` are set or changed:

1. **Validate the keys.** Call `adapter.validate_credentials()`. On `GatewayAuthError` → `frappe.throw` and the save is **rejected** (you cannot persist a gateway whose keys don't work). On success, stamp `credentials_validated_at` and confirm the returned account currency matches the configured `currency` (mismatch → throw — a USD-keyed account on an INR gateway is a misconfiguration). Validation only re-runs when the credentials actually change, so unrelated edits don't hammer the gateway.
2. **Auto-register the webhook + fill the secret.** If there's no `webhook_endpoint_id` yet, call `adapter.register_webhook(callback_url, events)` where `callback_url` is this site's route for the gateway (`<site_url>/api/method/cloud_billing.webhooks.<adapter_key>`) and `events` is the adapter's required event set. Store the returned `webhook_endpoint_id` and write the returned signing secret into `webhook_secret`. The field is **read-only in the UI** — the admin never copy-pastes a `whsec_…` from the gateway dashboard.
   - If the gateway can't self-register (`register_webhook` → `GatewayUnsupported`), `webhook_secret` falls back to a **required manual field** and the panel shows the callback URL to paste into the gateway dashboard.
3. **Enable gate.** `is_enabled` cannot be turned on while `credentials_validated_at` is empty — a gateway only goes live once it has proven keys *and* a webhook secret to verify inbound callbacks against.

**Rotation.** A **"Re-validate & re-register webhook"** action re-runs steps 1–2: it re-checks the keys and (re)creates the endpoint, rotating `webhook_secret`. Changing `api_key`/`api_secret` clears `credentials_validated_at`, forcing re-validation on the next save. De-registering (disable/delete) tears down the gateway-side endpoint via `webhook_endpoint_id` so no orphan endpoints keep firing — ties into gateway decommission ([#24](issues/24-gateway-integration-port-decommission.md)).

This is admin-only and gateway-setup-time; it does not touch the hot charge/webhook paths above. See the gateway spine ([#02](issues/02-gateway-adapter-webhook-spine.md)).

## Payment Method lifecycle

Add card → gateway setup flow (Stripe SetupIntent / Razorpay order) → customer confirms → **micro-charge (₹1 / $0.50) captured and refunded** to prove the card is live → `active`.

**The customer picks the instrument; the instrument picks the gateway**, and **Stripe takes everything it can** ([ADR 0023](docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)). Razorpay is consulted only where Stripe India cannot serve the instrument or the network at all, so a Stripe product change moves a rail without re-opening the decision.

There are **two surfaces**, and they carry different instruments. Wallet recharge is one-time, the customer is present, and no ceiling applies. A mandate is off-session, the customer is absent, and the ₹15,000 rule applies.

*Wallet recharge* (see [credits.md](credits.md)):

| Tile | Gateway |
|------|---------|
| Card — Visa / Mastercard / Amex | **Stripe** |
| RuPay card | **Razorpay** — Stripe carries no RuPay |
| UPI | **Razorpay** — Stripe India cannot accept UPI |
| Netbanking | **Razorpay** — Stripe has no netbanking product |

*Auto-pay mandate* (the Payment Method this section describes):

| Tile | Gateway |
|------|---------|
| Card — Visa / Mastercard | **Stripe** (India e-mandate; ₹15k ceiling off-session) |
| Card — RuPay / Amex / Diners | **Razorpay** — Stripe registers India mandates on Visa and Mastercard only |
| UPI Autopay | **Razorpay** |

Netbanking never appears on the mandate surface: it pays once and saves nothing, so offering it there is a promise we cannot keep.

We do **not** detect the card network. Stripe Elements iframes the PAN, so the digits never reach the server, and a BIN table we cannot check is not a design. Instead the mandate surface **names the two networks Stripe can hold a mandate for** and puts the other rail beside it. The RuPay tile says "RuPay card", never "Other cards", or a customer with an unusual Visa lands on the wrong rail. Non-INR teams see a Stripe card form.

**Gateway is a property of the method, not of the charge** (§4). Once a Payment Method exists, its own `gateway` settles it for the rest of its life. We never re-probe Stripe for a card we already know is RuPay, and a charge never shops between gateways for a better rate or a healthier endpoint.

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
| mandate_max_amount | Currency | Float, **major units** = trust-tier cap (mandate methods only) |
| fallback_reason | Select | Why this method is not on the primary rail: `rupay` / `stripe_decline` / `customer_choice`. Empty for a method added on the default rail |
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

### Gateway fallback (a card that fails on Stripe)

The upfront instrument picker removes RuPay-by-surprise, but an ordinary Visa can still fail Stripe validation. The offer of the other rail is a **safety net, not the routing mechanism** ([ADR 0022](docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §5), and it reuses the ordered-method machinery above rather than adding a second one:

- **Only a terminal decline falls back** — `card_declined`, `card_not_supported`, `authentication_failed`. Network timeouts, `processing` and abandoned 3DS are **ambiguous**: the charge may yet succeed, so they never fall back and the reconciliation job ([#21](issues/21-reconciliation-job.md)) resolves them.
- The fallback is a **new Payment Attempt** with its own idempotency key, created only once the prior attempt is terminal. One in-flight attempt per invoice, held by the existing `Invoice … FOR UPDATE` lock.
- **Off-session failures have no interactive fallback.** Nobody is present to authenticate on the other rail, so they degrade to dunning plus an "add another way to pay" notification — the escalate-don't-repeat rule, unchanged.
- The customer is **never shown an empty second card form**: one tap to the alternative, amount prefilled. A method added this way carries `fallback_reason = stripe_decline`.

**Routing is configuration, not code** (§8). Billing Settings carries a per-currency primary gateway and an `enable_gateway_fallback` switch, so the bet that Stripe India's authorisation rate holds against a domestic acquirer can be reversed without a deploy. Attempt success rate is reported by **gateway × network × currency** from the day this ships, which is the number that settles the bet.

## Settlement & mandates

See [credits.md](credits.md) for the full settlement model (≥1 source required; credits-then-card waterfall; wallet-gating for credits-only).

> **Updated 2026-08-08 ([ADR 0022](docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md), revising [ADR 0005](docs/adr/0005-inr-collection-emandate-threshold-prepaid.md)).** Billing is usage-based and **variable**, and an Indian *off-session* recurring debit **above ₹15,000 needs per-cycle re-authentication** — an RBI rule that binds Stripe India exactly as it binds Razorpay. Full behaviour + case matrix: [payments-inr.md](payments-inr.md).

**Saved methods are Stripe wherever Stripe can hold them.** Off-session auto-charge of a variable invoice is the Stripe SetupIntent → off-session PaymentIntent flow; no subscription. We are a **Stripe India merchant**, so INR settles domestically and a Visa or Mastercard mandate is a Stripe mandate. Razorpay keeps the saved methods Stripe will not register: **UPI Autopay**, and card mandates on **RuPay, Amex and Diners**. The **trust-tier cap** bounds every off-session charge, and in INR the `max_silent_charge` on the gateway's currency row bounds it further.

**Collection mode names what the customer experiences, not which provider we called.** Each team carries a `collection_mode`:
- `auto_charge` — the saved method is debited **off-session** with no customer present. In INR this holds only while the debit stays ≤ ₹15,000, and a pre-debit notification precedes each one; in USD there is no ceiling beyond the tier cap. Whether the ceiling applies is derived at charge time from *(currency, gateway capability)*, so the mode does not have to know.
- `manual_checkout` — invoice paid **on-session** at a hosted checkout (OTP, any amount; on-session carries no ₹15k limit).
- `prepaid` — wallet funded by top-ups; usage draws credits down.
- `action_required` — transient: an `auto_charge` team's invoice or forecast crossed the ceiling. Auto-charge pauses, the account **keeps running**, and an **Action Required** prompt asks the customer to pick `manual_checkout` or `prepaid`. We do **not** build the off-session >₹15k AFA-link auto-charge.

The earlier `stripe_auto` and `emandate` were provider names dressed as behaviours, and under ADR 0022 an Indian Stripe card mandate is both at once. They collapse into `auto_charge`.

**Capability-driven routing, not hardcoded.** The capabilities are read from the gateway's **`Payment Gateway Currency`** row — `max_silent_charge`, `requires_predebit_notice` — beside the adapter's own `supports_off_session_charge`. The collection layer asks *"who can pull `amount` in `currency` silently now?"* and, if nobody can, routes to the customer-chosen path. **Top-ups resolve the gateway from the instrument the customer picked**, not from the currency default ([ADR 0023](docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)) — a currency-wide default would send every INR top-up to one provider, including the card ones Stripe should take. A card is added with Stripe.js Elements against a SetupIntent (PCI: the PAN never reaches the server). **PayPal** is a one-time **method inside Razorpay** (international top-ups), not a standalone adapter — the standalone PayPal adapter ([#25](issues/25-paypal-adapter.md)) is retired.

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
| amount / currency | Currency / Data | amount as a float in **major units** (converted to the gateway's minor units at the boundary) |
| idempotency_key | Data | Unique — drives gateway dedupe |
| status | Select | initiated / authorised / captured / failed / refunded |
| gateway_transaction_id | Data | |
| initiated_at / completed_at | Datetime | |
| failure_code | Data | |
| failure_reason | Small Text | |
| retry_number | Int | 0 = first attempt |

## Log retention & cleanup

`Payment Attempt` and `Webhook Event` are high-volume append-only logs (one row per charge / per inbound callback). They are kept on a **rolling 3-month window** and pruned by a daily scheduler (the standard rolling-window retention pattern for high-volume logs):

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
| amount / currency | Currency / Data | amount as a float in **major units** (converted to the gateway's minor units at the boundary) |
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
