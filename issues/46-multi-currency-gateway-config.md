# 46 — Multi-currency gateway config: `Payment Gateway Currency` child table + resolver

**Type:** AFK · **Milestone:** GW · **Spec:** [payments.md](../payments.md)

## What to build

Replace the single `currency` (Data) + `is_default_for_currency` (Check) fields on `Payment Gateway` with a `Payment Gateway Currency` child DocType and a canonical resolver function. A gateway can now handle as many currencies as it has rows in its child table (e.g. Stripe carries USD, EUR, GBP; Razorpay carries INR). The `is_default` check on each row is the sole mechanism for picking which gateway handles a given currency.

**Schema changes:**

- Remove `currency` and `is_default_for_currency` from `Payment Gateway`.
- New child DocType `Payment Gateway Currency`: fields `currency` (Link → Currency) and `is_default` (Check).
- Invariant enforced on controller save: setting `is_default = True` on a row clears `is_default` on every other enabled gateway's row for the same currency (radio-button semantics scoped per currency).

**Resolver:**

`gateways.resolve_gateway_for_currency(currency)` queries `Payment Gateway Currency` for a row where `currency = <value>`, `is_default = True`, and the parent `Payment Gateway` has `is_enabled = True`. Returns the gateway name; raises `GatewayNotFound` if none configured.

**Callers to update:**

- `dashboard._add_method_gateway(currency)` → delegates to `resolve_gateway_for_currency`
- `mandates.upi_eligibility(team)` — reads the resolved gateway's `adapter_key` to determine UPI eligibility (INR + Razorpay adapter)
- `collect_invoice` / `pay_invoice` charge path — resolves gateway from `invoice.currency` (once #47 lands) or `team.currency` in the interim

**Data migration:** for each existing `Payment Gateway` row, insert one `Payment Gateway Currency` child row copying the old `currency` value with `is_default = True`.

## Acceptance criteria

- [ ] `Payment Gateway Currency` child DocType exists; `currency` and `is_default_for_currency` removed from parent.
- [ ] Saving a gateway row with `is_default = True` for a currency clears the flag on any other enabled gateway row for that same currency.
- [ ] `resolve_gateway_for_currency(currency)` returns the correct gateway; raises `GatewayNotFound` when none is configured for that currency.
- [ ] Existing callers (`_add_method_gateway`, `upi_eligibility`, charge path) route through the resolver — no direct currency field reads remain in core billing.
- [ ] Data migration moves existing `currency` values into child rows with `is_default = True`; no existing gateway loses its currency association.
- [ ] Adapter contract test suite still passes for Stripe (USD) and Razorpay (INR).

## Blocked by

- [#02](02-gateway-adapter-webhook-spine.md)
