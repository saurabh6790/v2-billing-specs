# 134 — Receive and record disputes on every gateway

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/gateways/stripe_adapter.py` (`STRIPE_WEBHOOK_EVENTS`), `central/billing/payments/disputes.py`

## Problem

Central never learns about a chargeback. `charge.dispute.*` is handled but not in `STRIPE_WEBHOOK_EVENTS`, so webhook auto-registration never subscribes it. Razorpay and PayPal disputes have no handler. A lost dispute on an invoice that is no longer Paid is dropped, so money taken back twice leaves no record.

## TODO

- [ ] Subscribe `charge.dispute.created`, `charge.dispute.closed` and `charge.dispute.funds_withdrawn`, and re-register existing Stripe endpoints with a patch.
- [ ] Handle Razorpay `payment.dispute.*` and PayPal `CUSTOMER.DISPUTE.*`.
- [ ] Record a lost dispute on any invoice state, and alert the operator when one opens.

## Acceptance criteria

- [ ] An opened and a lost dispute on each gateway reach the invoice and the operator channel (issue 145).

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
