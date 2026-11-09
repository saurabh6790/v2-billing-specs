# Overview "Pay now" opens the invoice list instead of the owed invoice

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-08](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | XS |

## Problem
The banner knows which invoice is owed but makes the customer find it.

## Current behaviour
- `OutstandingAlert.vue:85-92` pushes `{ name: 'BillingInvoices' }` without a query.
- The page already opens a panel from `?invoice=` (`BillingInvoicesPage.vue:73-80`).

## Expected outcome
One click from the banner shows the invoice and its Pay button.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-08](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Extra steps on the most important billing action.

## Solution options
- A. Deep-link to the oldest open issued invoice; with several, filter the list to open ones.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] With one open issued invoice, the banner opens its panel.
- [ ] With several, the list opens filtered to Outstanding and Overdue.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
