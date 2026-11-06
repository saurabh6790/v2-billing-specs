# 141 — Record a Payment Attempt for hosted-checkout invoice payments

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/api/billing_api.py` (`create_invoice_checkout`), `central/billing/payments/charges.py`

## Problem

Still open from the review and audit of 15 Oct (#3, #4, D1). An invoice paid through hosted checkout has no Payment Attempt. Cancel-and-refund refunds nothing, reconciliation does not see it, and a hosted checkout can open while an auto-charge is in flight.

## TODO

- [ ] Create an Initiated attempt, with the session id, when a hosted invoice checkout opens.
- [ ] Apply the in-flight check from `create_invoice_payment_order`.
- [ ] Settle the attempt from the webhook (through issue 128) and reconcile it.

## Acceptance criteria

- [ ] Cancel-and-refund of a hosted-checkout invoice books a source refund.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

128
