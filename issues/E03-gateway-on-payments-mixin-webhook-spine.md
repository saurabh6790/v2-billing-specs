# E03 — Gateway base on frappe/payments + `FCGatewayMixin` + webhook spine

**Builds on:** frappe/payments · **Replaces:** old #02, #24, #40 · **Phase:** Foundation · **Type:** AFK

## Goal

Establish the gateway seam by **reusing `frappe/payments`** (its `Payment Gateway` DocType, per-gateway
settings controllers, `get_payment_gateway_controller`, Payment Request) and **extending** it with the
platform contract: off-session recurring charge, signature-first webhook spine, and validated
self-wiring setup. Reverses old #24 (which removed payments). See [payments.md](../payments.md) and
[ADR 0005](../docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

## Scope

- **`FCGatewayMixin`** mixed into the `<Gateway> Settings` controllers (Stripe, Razorpay at launch):
  `fc_validate_credentials`, `fc_setup_payment_method`, `fc_validate_payment_method`, `fc_charge`
  (off-session, idempotency key, amount in **integer minor units** straight through),
  `fc_refund`, `fc_verify_webhook_signature`, `fc_parse_webhook_event`, `fc_get_transaction_status`;
  optional `fc_register_webhook`, `fc_verify_payment_signature`, `fc_cancel_mandate`,
  `fc_get_mandate_status`. Errors: `GatewayAuthError`, `GatewayTimeout`, `GatewayUnsupported`.
- **Webhook spine** — own the route `/api/method/central.billing.webhooks.<gateway>`: read raw bytes
  → `fc_verify_webhook_signature` **first, before any DB access** → parse `NormalisedEvent` → insert
  **Webhook Event** (unique `gateway_event_id`, dupes 200 silently) → enqueue the transition job. No
  business logic in the HTTP cycle.
- **Validated, self-wiring setup** — on save of the settings controller, when keys change:
  `fc_validate_credentials` (reject save on `GatewayAuthError`, stamp `credentials_validated_at`,
  check account currency); auto-`fc_register_webhook` → store `webhook_endpoint_id` + fill the
  read-only `webhook_secret`; `is_enabled` gated on validation. "Re-validate & re-register" action;
  de-register tears down the endpoint.

## Acceptance

- Core billing imports **no** gateway SDK — only resolves a controller and calls `fc_*`.
- A bad key is rejected **on save**; a wrong-currency account is rejected; the webhook secret is
  system-managed (never hand-pasted) when the gateway self-registers.
- A webhook with a bad signature is rejected **before** any DB read (closes the order-ID enumeration
  bug); a replayed event dedupes on `gateway_event_id`.
- `fc_charge` passes the stored minor-unit integer straight to Razorpay `amount` (paise) / Stripe
  `amount` (cents) — no float→int conversion.

## Out of scope

The charge state machine + Payment Entry creation (E10); Payment Method lifecycle (E06); mandates
(E17).
