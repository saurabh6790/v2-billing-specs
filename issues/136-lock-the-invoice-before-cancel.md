# 136 — Lock the invoice before cancel or an on-session order

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/revenue/invoicing/lifecycle.py` (`cancel_invoice`), `central/billing/payments/charges.py` (`create_invoice_payment_order`)

## Problem

`cancel_invoice` checks the status and the in-flight Payment Attempts without locking the invoice. A charge can claim an attempt and commit in between, so the invoice is cancelled while the card is charged. `reissue_invoice` and rerating use the same path. `waive_for_internal_team` already locks first.

`create_invoice_payment_order` calls the gateway while it holds the invoice lock, and inserts the attempt after the call.

## TODO

- [ ] Read the invoice with `for_update=True` in `cancel_invoice` before the checks.
- [ ] In `create_invoice_payment_order`, insert and commit the attempt first, call the gateway without the lock, then store the order id on the attempt.

## Acceptance criteria

- [ ] A test with a claimed attempt between read and cancel refuses the cancel.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
