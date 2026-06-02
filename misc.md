# Misc / Decision Notes

Cross-cutting rationale that doesn't belong to a single domain file.

## Why we don't build on the existing `frappe/payments` app

> Note: central-spec's `billing.md` says "collect payment via frappe/payments." We deliberately diverge. This records why.

`frappe/payments` is a mature, well-tested app — but it is built for a **different shape of problem** than a billing engine.

**What `frappe/payments` is designed for:** one-off, *on-session* checkout. A `Payment Request` is created, the customer is redirected to the gateway (or an embedded button), they pay once, and a webhook/redirect confirms. Gateway settings live in per-gateway singletons (e.g. "Razorpay Settings", "Stripe Settings"). It is the right tool for webshop/ERPNext "pay this invoice now" flows.

**What v2 billing needs that doesn't map onto it:**

| Requirement | Why `frappe/payments` doesn't fit |
|-------------|-----------------------------------|
| **Off-session recurring auto-charge** | Its model is on-session redirect/checkout, not "charge a stored method/mandate at month-end without the customer present." |
| **Mandates pegged to trust tier** | No first-class UPI Autopay / mandate lifecycle with a `max_amount` we control and re-authorise on tier promotion (see [payments.md](payments.md)). |
| **Idempotency keys derived from `payment_attempt.name`** | No `Payment Attempt` model; no per-attempt idempotency contract to prevent double-charge on retry. |
| **Signature-first webhooks** | We require HMAC verification as the *first* operation before any DB access (the v1 enumeration bug). We need full control of the security ordering and our own `Webhook Event` dedupe on `gateway_event_id`. |
| **Retry / dunning state machine** | Day 1/3/7 retry → `past_due` → suspend is billing logic, not checkout logic. |
| **Reconciliation** | The "charged-but-never-webhooked" terminal-state scan needs our own attempt/refund records. |
| **Adapter isolation** | Core billing must never import gateway code; adding a gateway = one `GatewayAdapter` class passing a shared contract-test suite. `frappe/payments` controllers are coupled to its Payment Request / integration patterns. |
| **Multi-account / multi-currency by gateway** | We model many `Payment Gateway` config rows (per currency/account); the singleton-settings model fights this. |

**Decision:** build a thin **`GatewayAdapter`** layer owned by Cloud Billing (see [payments.md](payments.md)). Reusing `frappe/payments` would mean bending its checkout abstractions around a recurring-billing engine and inheriting webhook patterns we explicitly want to redesign — more friction than writing a focused adapter.

**Tracked as:** the Gateway Integrations milestone — porting the existing Stripe/Razorpay integrations into the adapter model and retiring the old path is [issue #24](issues/24-gateway-integration-port-decommission.md).

**What we still borrow:** the underlying gateway SDKs (the `stripe` / `razorpay` Python libraries) and `frappe/payments` as a *reference* for gateway quirks. We are not reinventing gateway protocols — only the billing-side orchestration around them.

**Revisit if:** a future need is genuinely one-off-checkout shaped (e.g. a standalone "buy a one-time add-on" flow with no subscription), where `frappe/payments` might be the simpler path for that surface alone.

## Other notes

- ERPNext is the statutory accounting SOR; Cloud Billing is the SOR for the customer-facing balance. Corrections originate in Cloud Billing and sync down to ERPNext (see [invoicing.md](invoicing.md)).
- `Team` and user roles are owned by Central core / IAM, not this spec; referenced via `Link → Team` and the `Billing Admin` / `Billing User` roles.
