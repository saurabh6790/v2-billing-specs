# Remove the permanently disabled "Email invoice" button

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-15](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p3`, `area:invoices` |
| Priority | P3 |
| Complexity | XS |

## Problem
A control that never works is shown on every invoice.

## Current behaviour
- `BillingInvoicesPage.vue:195-201`: disabled, title "Email invoice (coming soon)".

## Expected outcome
Only working actions are shown.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-15](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Noise; a promise not kept.

## Solution options
- A. Remove now; track invoice email as a feature (MC-06).

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Button removed.
- [ ] Feature request for invoice email filed separately.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
