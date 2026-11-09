# "Primary payment method" is disabled without a reason while "Move up" does the same thing

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-05](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p3`, `area:billing-setup` |
| Priority | P3 |
| Complexity | XS |

## Problem
Two controls change the charge order; one is disabled with no explanation and the wallet takes the Primary label.

## Current behaviour
- Wallet reads "Primary" whenever balance > 0 (`PaymentMethodsCard.vue:232`).
- "Primary payment method" disabled while credits remain (`PaymentMethodRowActions.vue:41-47`); "Move up" works (`PaymentMethodsCard.vue:179-196`).

## Expected outcome
One clear way to choose what is charged first, with credit shown as used first.

## Affected users
Customer admins.

## Evidence
See the current behaviour above; full detail in [CB-05](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Confusion about which card pays.

## Solution options
- A. "Charge this first" + Move up/down; wallet row "Used first while you have credit".

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] No disabled menu item without a reason.
- [ ] The wallet row never reads "Primary".

## Dependencies
#3. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
