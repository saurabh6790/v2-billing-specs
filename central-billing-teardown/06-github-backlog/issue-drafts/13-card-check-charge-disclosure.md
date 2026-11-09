# Onboarding says "No charge today" but adding a card makes a small refunded charge

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-11](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:billing-setup` |
| Priority | P2 |
| Complexity | XS |

## Problem
The customer is told nothing will be charged, then sees a charge.

## Current behaviour
- "No charge today. We save it and check that it works." (`BillingStep.vue:46-47`).
- "Validating your card with a small temporary charge that's refunded right away." appears only after Add card (`AddMethodDialog.vue:263-268`).

## Expected outcome
The check charge is disclosed before the first click, in the same words everywhere.

## Affected users
New customers.

## Evidence
See the current behaviour above; full detail in [CB-11](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Surprise bank notifications; distrust at sign-up.

## Solution options
- A. Rewrite both texts and show the note above the card field.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Onboarding and the card dialog both say a small charge is made and refunded.
- [ ] The note is visible before Add card is pressed.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
