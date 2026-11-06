# 132 — Track a refund until the gateway finishes it

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/gateways/*_adapter.py` (`refund`), `central/billing/states.py`, `central/billing/payments/corrections.py`, `central/billing/payments/charges.py`

## Problem

All three adapters record a `pending` refund as Completed. A pending refund can still fail, and no handler reads `refund.failed`, `charge.refund.updated` or the PayPal refund events. `charge.refunded` is subscribed but ignored, so a refund made in the Stripe dashboard leaves no record in Central.

## TODO

- [ ] Add a `Pending` state to the Refund state machine and map gateway `pending` to it.
- [ ] Subscribe and handle `charge.refund.updated` (Stripe), `refund.processed` and `refund.failed` (Razorpay), and the PayPal refund events.
- [ ] Record a refund made outside Central against its Payment Attempt.
- [ ] Reconcile Refunds that stay `Pending` past a threshold.

## Acceptance criteria

- [ ] A pending refund that the gateway later fails ends `Failed` and appears in `failed_refunds`.
- [ ] A refund made in the Stripe dashboard appears on the invoice.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
