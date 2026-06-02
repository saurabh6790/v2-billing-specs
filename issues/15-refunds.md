# 15 — Refunds — full→source, partial→wallet

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [invoicing.md](../invoicing.md)

## What to build

Post-payment corrections. A `Refund` DocType linked to the original `Payment Attempt`. **Full dispute** → refund the full amount to source via `adapter.refund()`; the invoice **stays `Paid`** with a linked `Refund` (no "refunded" state — preserves GST immutability). **Partial overcharge** → add the difference to the customer's **wallet** as a credit ledger entry (applied next cycle). Corrections originate in Cloud Billing; a matching credit note syncs down to ERPNext (#17). Symmetric across Stripe and Razorpay.

## Acceptance criteria

- [ ] `Refund` DocType (linked to Payment Attempt) with `destination` source/wallet, status, gateway_refund_id.
- [ ] Full dispute → gateway refund to source; invoice remains `Paid` + linked Refund.
- [ ] Partial overcharge → wallet credit ledger entry, applied next invoice.
- [ ] Refund works symmetrically for Stripe and Razorpay via the adapter.
- [ ] Pre-payment corrections use cancel + reissue (no mutation of issued line items).

## Blocked by

- #06
- #10
