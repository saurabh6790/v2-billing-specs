# "Pay ₹X now" charges immediately without naming the payment method

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-09](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
The customer does not know which method will be charged when they press Pay.

## Current behaviour
- The button calls `pay_invoice` on click (`BillingInvoicesPage.vue:395-403`, `usePayInvoice.ts:37-41`).
- No method is named.

## Expected outcome
The button names the method that will be tried first and offers another.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-09](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Charges to an unexpected card; frequency unknown (0 attempts yet).

## Solution options
- A. Name the method on the button + "Use another method".
- B. Confirm dialog.
- C. Both.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Button reads "Pay ₹X with {method}".
- [ ] "Use another method" opens a one-time payment or add-method path.
- [ ] With no usable method, the button says so and offers Add method.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
