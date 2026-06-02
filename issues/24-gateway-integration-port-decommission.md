# 24 — Port & decommission existing gateway integrations

**Type:** AFK · **Milestone:** Gateway Integrations (Phase 1 foundation) · **Spec:** [payments.md](../payments.md), [misc.md](../misc.md)

## What to build

Rewrite the existing v1 / `frappe-payments` Stripe & Razorpay integration logic into the new `GatewayAdapter` model and **retire the old path**, so there is a single integration surface. The gateway *knowledge* (charge/refund flows, webhook event shapes, gateway quirks) is ported from the working implementations rather than reinvented; the *structure* is the new one — adapter isolation, signature-first webhooks, per-attempt idempotency. Core billing must import no gateway SDK code directly. This is the concrete consequence of the "why not frappe-payments" decision in [misc.md](../misc.md).

## Acceptance criteria

- [ ] Existing Stripe & Razorpay behaviors reimplemented as `GatewayAdapter` classes passing the shared contract suite.
- [ ] **No core billing module imports a gateway SDK directly** (adapter isolation verified by test/static check).
- [ ] Webhooks for both gateways route through the signature-first receiver with the idempotent event store (#02).
- [ ] The old `frappe-payments`-based gateway path is removed/disabled — one integration surface remains.
- [ ] Parity check: every behavior the old integration covered (charge, refund, webhook event types) is covered by the new adapters.

## Blocked by

- #02
