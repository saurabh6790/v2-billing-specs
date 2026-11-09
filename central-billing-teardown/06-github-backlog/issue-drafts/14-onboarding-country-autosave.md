# Onboarding saves a billing country from the browser time zone without the user choosing it

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-12](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:billing-setup` |
| Priority | P2 |
| Complexity | XS |

## Problem
Opening a screen writes the billing country and currency.

## Current behaviour
- `BillingCountryField.vue:57-61` calls `onChange('India')` on mount for Asia/Kolkata, which saves via `save_billing_profile` (`:38-48`).
- 43 of 55 incomplete external profiles hold only country = India (fits; cause not proven).

## Expected outcome
Country is pre-selected but saved only when the user continues.

## Affected users
New customers.

## Evidence
See the current behaviour above; full detail in [CB-12](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Wrong currency for foreign companies with Indian staff; locked after money moves.

## Solution options
- A. Pre-select, save on Continue.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Opening onboarding makes no write.
- [ ] The guess shows as the selected value.
- [ ] Saving happens on the user's action.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
