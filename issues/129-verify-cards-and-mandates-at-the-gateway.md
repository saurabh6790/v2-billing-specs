# 129 — Activate a card or mandate only from what the gateway says

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/mandates.py` (`confirm_mandate`), `central/billing/payments/payments.py` (`confirm_payment_method`), `central/billing/gateways/stripe_adapter.py`, `central/billing/api/dashboard/methods.py`, `central/billing/api/billing_api.py`

## Problem

When a customer saves a card or authorises a mandate, Central stores the token or payment method id that the browser sends back. It checks a callback signature, but that signature does not cover the token. A Payment Method can become Active on a token that is not real, and an Active method lets a team provision servers on credit. The card path also takes the card label and expiry from the request.

This is a security issue. Details and the probe are in the bench-local audit report.

## TODO

- [ ] Razorpay: fetch the payment server-side. Require its `order_id` to equal `method.setup_reference`, its customer to equal `method.gateway_customer_id`, and a captured or authorised recurring payment. Store the `token_id` from that payment.
- [ ] Stripe: read the PaymentMethod from the stored SetupIntent (`setup_reference`). Ignore the id, label and expiry from the request.
- [ ] Replace the 0.50 off-session validation charge with the SetupIntent result. If a charge stays, send an idempotency key, record a failed auto-refund, and cancel an intent left in `requires_action`. Issue 126 covers the INR 3-D Secure part of this charge.
- [ ] Handle `payment_method.automatically_updated` and `payment_method.detached`, so `expire_payment_methods` does not expire a card the network renewed.
- [ ] Detach the PaymentMethod at Stripe when a card is removed.
- [ ] List Active Razorpay methods whose token never paid a charge, and check them at Razorpay.

## Acceptance criteria

- [ ] A method becomes Active only with a token or payment method that the gateway returned for that method's own setup.
- [ ] Tests cover a mismatched order, a foreign customer and a token the gateway does not know.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
