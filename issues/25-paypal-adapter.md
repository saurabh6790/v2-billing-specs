# 25 — PayPal adapter

**Type:** AFK · **Milestone:** Gateway Integrations (post-launch / to-follow) · **Spec:** [payments.md](../payments.md)

## What to build

A PayPal `GatewayAdapter` (charge / refund / `verify_webhook_signature` / `parse_webhook_event`) passing the shared contract suite, with webhooks flowing through the signature-first receiver. The spec marks PayPal "to follow" — implement when customer demand justifies it. The value of the adapter pattern is that this requires **no changes** to invoicing, payment, or subscription logic.

## Acceptance criteria

- [ ] PayPal adapter passes the shared `GatewayAdapter` contract suite (charge, refund, valid/invalid signature).
- [ ] PayPal webhooks route through the signature-first receiver with idempotent event store.
- [ ] Adding PayPal requires **no changes** to invoicing/payment/subscription modules.
- [ ] Currency + account config managed via the `Payment Gateway` DocType.

## Blocked by

- #02
