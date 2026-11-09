# 164 — "Pay ₹X now" charges immediately without naming the payment method

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-09](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The customer does not know which method will be charged when they press Pay.

## Current behaviour

- The button calls `pay_invoice` on click (`BillingInvoicesPage.vue:395-403`, `usePayInvoice.ts:37-41`).
- No method is named.

## What we want

The button names the method that will be tried first and offers another.

**Who it affects:** Customers.

**Why it matters:** Charges to an unexpected card; frequency unknown (0 attempts yet).

## Options

- A. Name the method on the button + "Use another method".
- B. Confirm dialog.
- C. Both.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Button reads "Pay ₹X with {method}".
- [ ] "Use another method" opens a one-time payment or add-method path.
- [ ] With no usable method, the button says so and offers Add method.

## Dependencies

None.
