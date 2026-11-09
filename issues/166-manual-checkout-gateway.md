# 166 — Manual Checkout always opens the Razorpay sheet whatever gateway the order was created on

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-10](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The client opens one provider's checkout regardless of the provider the server chose.

## Current behaviour

- `usePayInvoiceCheckout.ts:41` always calls `openRazorpayCheckout`.
- The server picks the gateway by currency (`central/billing/payments/charges.py:463-467`).
- No Manual Checkout teams in production yet.

## What we want

The client opens the checkout of the gateway the server returned.

**Who it affects:** Manual Checkout customers.

**Why it matters:** Payment cannot complete for any team routed to another gateway.

## Options

- A. Server returns the gateway; client dispatches to the matching checkout.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A Stripe-routed order opens Stripe; a Razorpay-routed order opens Razorpay.
- [ ] An e2e test covers both.

## Dependencies

None.
