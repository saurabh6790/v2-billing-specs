# 130 — Make Razorpay recurring charges and refunds safe to retry

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/gateways/razorpay_adapter.py`, `central/billing/payments/reconciliation.py`, `central/billing/doctype/payment_attempt/payment_attempt.py`

## Problem

The Razorpay adapter passes our idempotency key as the order `receipt`. Razorpay caps `receipt` at 40 characters and our key is a 64-character SHA-256 hex, so an off-session Razorpay charge is most likely rejected every time. No Razorpay off-session attempt exists on the test or dev site to confirm it.

Even with a short key, Razorpay does not dedupe on `receipt`. Reconciliation re-sends an attempt whose answer was lost and expects a replay. On Razorpay that creates a second order and a second payment. Refunds send `receipt` too, although Razorpay supports the `X-Refund-Idempotency` header for refunds.

## TODO

- [ ] Persist the Razorpay order id on the Payment Attempt, and commit it, before `payment.createRecurring`.
- [ ] Before a re-send, fetch the payments of the stored order. Re-send only when the order has none.
- [ ] Use a receipt of 40 characters or less.
- [ ] Send `X-Refund-Idempotency` on refunds, keyed on the Refund name and attempt count.

## Acceptance criteria

- [ ] A test where the first `createRecurring` times out and reconciliation runs ends with one payment at the gateway stub.
- [ ] A test where a refund step crashes after the gateway call ends with one refund.
- [ ] One Razorpay test-mode off-session charge succeeds end to end.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
