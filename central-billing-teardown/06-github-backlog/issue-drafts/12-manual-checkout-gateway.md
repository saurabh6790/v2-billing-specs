# Manual Checkout always opens the Razorpay sheet whatever gateway the order was created on

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-10](../../04-problem-discovery/problem-register.md) |
| Labels | `type:bug`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
The client opens one provider's checkout regardless of the provider the server chose.

## Current behaviour
- `usePayInvoiceCheckout.ts:41` always calls `openRazorpayCheckout`.
- The server picks the gateway by currency (`central/billing/payments/charges.py:463-467`).
- No Manual Checkout teams in production yet.

## Expected outcome
The client opens the checkout of the gateway the server returned.

## Affected users
Manual Checkout customers.

## Evidence
See the current behaviour above; full detail in [CB-10](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Payment cannot complete for any team routed to another gateway.

## Solution options
- A. Server returns the gateway; client dispatches to the matching checkout.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] A Stripe-routed order opens Stripe; a Razorpay-routed order opens Razorpay.
- [ ] An e2e test covers both.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
