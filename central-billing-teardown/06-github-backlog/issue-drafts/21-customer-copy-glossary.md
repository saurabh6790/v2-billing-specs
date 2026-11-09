# Customer copy in payment and invoice screens uses internal words

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-14](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p3`, `area:billing-setup`, `area:invoices` |
| Priority | P3 |
| Complexity | S |

## Problem
Customers read terms like gateway, Billable and Cost Report.

## Current behaviour
- Examples in `04-problem-discovery/problem-register.md` §CB-14 (panel subtitle, add row, pay toasts).

## Expected outcome
Copy follows the glossary in `03-ui-ux/visual-consistency-review.md`.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-14](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Small confusion repeated on every visit.

## Solution options
- A. One copy pass + Guard rule for banned words.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] No customer string uses gateway, Billable, Cost Report, settlement, provision.
- [ ] Add row reads "Add payment method".

## Dependencies
#18 for server messages. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
