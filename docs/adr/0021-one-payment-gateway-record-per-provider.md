# One Payment Gateway record per provider

Date: 2026-08-08

`Payment Gateway` was a user-named DocType: `autoname: prompt`, a required `title`, and a required
`adapter_key` Select. An admin could create as many records as they liked — two Stripes, three
Razorpays. Since #46 moved currency onto the `Payment Gateway Currency` child table, a single record
can already settle many currencies, which removed the only reason anyone had for a second one.

Multiple records per provider never worked. Three things in the code picked "the enabled record for
this adapter" and broke the tie arbitrarily:

- `payments/webhooks.py:_resolve_gateway` — `get_value("Payment Gateway", {"adapter_key": X,
  "is_enabled": 1})`. The callback URL is built per adapter
  (`/api/method/central.billing.payments.webhooks.stripe`), so an inbound request cannot say which
  merchant account it belongs to. With two enabled Stripe records the signature is verified against
  whichever `webhook_secret` the database returned first.
- `api/dashboard/_shared.py:_enabled_gateway_for_currency` — first adapter match in the currency rows.
- `api/dashboard/_shared.py:_add_method_gateway` — `order_by="creation asc"` to break the Razorpay tie.

The routing problem underneath is that nothing on the record carries a routing key. There is no team,
region, country or legal entity to split on, so two records for one provider cannot be told apart by
anything except the arbitrary order they come back in.

## Decision

**The adapter is the identity.** `autoname: field:adapter_key`, so a record is named `Stripe`,
`Razorpay` or `Paypal`. `title` is deleted. `allow_rename` is off and `adapter_key` is `set_only_once`
— Frappe slaves the field to the name, so the provider a record configures cannot change while
`Payment Attempt` and `Webhook Event` rows link to it. Uniqueness is the primary key, not a
`validate()` hook that a bulk write could skip (ADR 0018).

The three records are seeded by `gateways/setup.py:ensure_gateway_records` on install, on migrate and
before tests, the same way the catalog masters are. An adapter is a code-level capability — the set of
providers is whatever `gateways/registry.py:get_adapter` can build — so the roster is derived from the
Select options and the admin never creates or deletes a record. Create and delete permissions are off;
an admin fills in keys and flips Enabled.

Which currencies a provider settles, and which one it is the default for, stays in the `currencies`
child table. That is the routing dimension, and it is the one that works.

The resolvers collapse to primary-key reads. `_resolve_gateway(adapter_key)` is
`frappe.get_doc("Payment Gateway", adapter_key)` — there is no longer a wrong secret to pick.

## What this rules out

**Two merchant accounts with the same provider** — a Pvt Ltd Razorpay and an Inc Razorpay. That case
is not half-built today, it is zero-built, and under ADR 0019 a second merchant account is really a
second selling entity, which is an ERPNext company and invoice-series question before it is a gateway
question. If it ever lands, the shape is an explicit routing key on the record (`Company` /
`Legal Entity`), a resolver keyed on `(entity, currency)`, and a per-record webhook path — added
deliberately, not recovered from duplicate rows nobody can route between.

**Test-mode and live-mode records side by side.** Keys already resolve from
`common_site_config.json` ahead of the record (`GatewayAdapter.get_credential`), which is where a
per-site mode belongs.

## Consequences

The migration (`patches/v0_0/one_gateway_per_adapter.py`) collapses existing duplicates: it keeps the
record the site is actually running on — enabled, then validated, then oldest — folds the losers'
currency rows in, repoints `Gateway Customer` / `Payment Method` / `Payment Attempt` /
`Webhook Event` / `Subscription`, then renames the survivor to its adapter. The losers' keys are
discarded, which is why survivor selection is by liveness and not by age alone.

Two adjacent bugs fell out and are fixed here. `resolve_gateway_for_currency` read a single default
row and gave up if that gateway was disabled — but the uniqueness rule only clears the flag on
*enabled* gateways, so a switched-off gateway shadowed the live one. It now scans every default row
for the currency. And the webhook auto-registration test could never have passed: the test host is
always `*.local`, which the controller (correctly) refuses to register a callback for.

Supersedes the record shape assumed by
[#46](../../issues/46-multi-currency-gateway-config.md) and
[#49](../../issues/49-gateway-config-ui-multi-currency.md); the currency child table and the resolver
they introduced are unchanged.
