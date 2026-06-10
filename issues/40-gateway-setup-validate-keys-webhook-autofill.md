# 40 — Gateway setup: validate credentials + auto-fill webhook secret

**Type:** AFK · **Milestone:** GW · **Spec:** [payments.md](../payments.md) (§ Gateway setup: validate keys + auto-fill webhook secret)

## What to build

Make `Payment Gateway` setup **validated and self-wiring**, so a misconfigured gateway can't go live and the admin never copy-pastes a webhook signing secret.

Two new `GatewayAdapter` capabilities:

- `validate_credentials() -> dict` — **universal**. Cheapest authenticated read against the gateway (Stripe `Account.retrieve()`, Razorpay an authed fetch) purely to prove the keys work. Returns the gateway account identity (incl. currency); raises `GatewayAuthError` on rejected credentials. Never charges or mutates.
- `register_webhook(callback_url, events) -> {endpoint_id, secret}` — **optional** (base default raises `GatewayUnsupported`). Creates the gateway-side webhook endpoint pointed at this site's callback and returns the signing secret. Stripe `WebhookEndpoint.create(...)` returns a `whsec_…`; Razorpay's create-webhook takes a caller-chosen secret, so the adapter generates a strong random one server-side, registers it, and returns it.

`Payment Gateway` controller `validate` wiring (admin-only, gateway-setup-time — does **not** touch the hot charge/webhook paths):

1. **Validate keys on save** when `api_key`/`api_secret` are set or changed → `adapter.validate_credentials()`. `GatewayAuthError` → `frappe.throw` (save rejected). On success stamp `credentials_validated_at`; throw if the returned account currency ≠ configured `currency`. Re-validate only when credentials change.
2. **Auto-register webhook + fill secret** when no `webhook_endpoint_id` yet → `adapter.register_webhook(<site_url>/api/method/cloud_billing.webhooks.<adapter_key>, events)`; store `webhook_endpoint_id` and write the returned secret into the read-only `webhook_secret`. `GatewayUnsupported` → `webhook_secret` becomes a required manual field and the panel shows the callback URL to paste.
3. **Enable gate** — `is_enabled` cannot be turned on while `credentials_validated_at` is empty.
4. **Rotation/teardown** — a "Re-validate & re-register webhook" action re-runs 1–2 (rotating the secret); changing credentials clears `credentials_validated_at`; disable/delete de-registers the gateway-side endpoint via `webhook_endpoint_id` (ties into [#24](24-gateway-integration-port-decommission.md)).

New config fields: `webhook_endpoint_id` (Data), `credentials_validated_at` (Datetime); `webhook_secret` flips to system-managed/read-only when the gateway supports `register_webhook`.

## Acceptance criteria

- [ ] `validate_credentials()` on the base adapter contract; Stripe + Razorpay implementations passing the shared contract suite (good keys → identity dict; bad keys → `GatewayAuthError`).
- [ ] Saving a gateway with **invalid** keys is rejected (`frappe.throw`); valid keys stamp `credentials_validated_at`.
- [ ] Account currency ≠ configured `currency` → save rejected.
- [ ] On first valid save, `register_webhook` is called, `webhook_endpoint_id` + `webhook_secret` are populated, and `webhook_secret` is read-only in the form.
- [ ] Gateway whose adapter raises `GatewayUnsupported` for `register_webhook` → `webhook_secret` required manual field; callback URL surfaced.
- [ ] `is_enabled` cannot be set while `credentials_validated_at` is empty.
- [ ] "Re-validate & re-register webhook" action rotates the secret; disable/delete de-registers the endpoint (no orphan endpoint left firing).
- [ ] Validation runs only when api_key/api_secret change (no gateway call on unrelated edits).
- [ ] Secrets still never returned by any customer-facing API.

## Blocked by

[#02](02-gateway-adapter-webhook-spine.md) — gateway config + adapter + webhook spine. (Touches Razorpay [#08](08-razorpay-upi-mandate.md) and PayPal [#25](25-paypal-adapter.md) adapters as they each implement the two new methods.)
