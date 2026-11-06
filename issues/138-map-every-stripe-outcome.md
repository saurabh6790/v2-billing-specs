# 138 — Map every Stripe outcome and pin the API version

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/gateways/stripe_adapter.py`, `central/billing/payments/reconciliation.py`, `central/billing/revenue/dunning.py`, `central/billing/doctype/payment_attempt/payment_attempt.py`

## Problem

- `APIError`, `InvalidRequestError`, `IdempotencyError` and `AuthenticationError` are not mapped in `charge` and `refund`. The attempt stays Initiated, and reconciliation re-sends the same failing request.
- `requires_payment_method` and `requires_action` are in neither reconciliation set, so those attempts wait for the 24-hour alert.
- Dunning retries and suspends while a charge is inside Stripe's pre-debit hold.
- The adapter sets the module-global `stripe.api_key` and pins no API version.
- Idempotency keys carry no site prefix, so sites that share a Stripe test account collide.

## TODO

- [ ] Map 5xx to an unknown outcome, and the other errors to a terminal or operator-actionable failure.
- [ ] Add the missing statuses to reconciliation.
- [ ] Skip dunning retries and suspension during `gateway_hold_until`.
- [ ] Use a per-request `StripeClient` with a pinned API version.
- [ ] Prefix idempotency keys with the site.

## Acceptance criteria

- [ ] Each Stripe error class has a test that ends the attempt in a defined state.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
