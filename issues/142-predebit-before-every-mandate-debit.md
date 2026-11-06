# 142 — Send the pre-debit notice before every mandate debit

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/collection.py`, `central/billing/revenue/invoicing/lifecycle.py`, `central/billing/gateways/capabilities.py`

## Problem

Still open from the audit of 15 Oct (B3). A Razorpay INR mandate is debited at once by the collection run and by each dunning retry, without the RBI pre-debit notice. Separately, `capabilities.silent_charge_ceiling` returns a stored ceiling over the RBI one. Only `PaymentGateway.validate` clamps it.

## TODO

- [ ] Gate `collection.collect_invoice` on `predebit_charge_after` for every rail with `requires_predebit_notice`.
- [ ] Return the lower of the configured and the regulatory ceiling at read time.

## Acceptance criteria

- [ ] No mandate debit leaves without a notice sent at least 24 hours earlier. A test covers the dunning retry.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
