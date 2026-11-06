# 128 — Settle or credit a payment only when it matches the intent we stored

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/charges.py`, `central/billing/payments/reconciliation.py`, `central/billing/api/dashboard/invoices.py` (`confirm_topup`), `central/billing/api/billing_api.py` (`get_checkout_status`), `central/billing/gateways/`

## Problem

Some money paths act on a gateway payment without proving that it is the payment Central asked for. They take the purpose, the team, the invoice or the credit amount from fields that the payer or the caller can influence, or they accept a signed callback that proves a payment happened but not which one. The result is that an invoice can be settled, or a wallet credited, by a payment made for something else or for a smaller amount.

This is a security issue. The exact paths and the reproducing probes are in the bench-local audit report, not here, because this repository is public.

## Rule

A gateway payment moves money in Central only when all of these hold:

1. Central fetched it server-side from the gateway (or got it on a verified webhook).
2. Its order, PaymentIntent or session id matches a row Central stored before the payer acted.
3. Its amount and currency cover what that row says is due.
4. Purpose, team and invoice come from that stored row, never from payment fields.

## TODO

- [ ] Add `verify_payment(payment_id)` to each adapter. It returns status, amount, currency, order or session id, customer id and token id from a server-side fetch.
- [ ] Add one `bind(intent, verified)` check in `payments/`. The webhook, every confirm route, the pilot checkout poll and reconciliation call it before they settle or credit.
- [ ] Store the gateway order or session id on the intent row when it is created: Payment Attempt for invoice payments, a new top-up intent for wallet top-ups, the checkout row for hosted checkout.
- [ ] Stop reading gateway payment notes or metadata for purpose, team, invoice or credit. Read the order (Razorpay `order.fetch`) or our stored row instead.
- [ ] Settle an invoice only when the captured amount and currency cover `expected_collection`. Book any surplus to the wallet and alert on a shortfall.
- [ ] After the fix ships, check Paid invoices and paid-in ledger entries since launch for payments whose order or amount does not match, and report the result.

## Acceptance criteria

- [ ] A payment whose order id is not ours, or whose amount is less than due, settles nothing and credits nothing.
- [ ] A payment made for an invoice cannot be confirmed as a top-up, and the reverse.
- [ ] Tests cover each entry point, including the cross-team case.
- [ ] The probes in the audit report stop printing `BUG REPRODUCED`.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
