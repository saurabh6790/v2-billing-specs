# Billing details form: country editable after currency lock, vague lock text, address field order

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-13](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p3`, `area:billing-setup` |
| Priority | P3 |
| Complexity | XS |

## Problem
The form lets a customer try a change that will fail and orders the address oddly.

## Current behaviour
- Country editable after lock (`BillingProfileForm.vue:181-188`) but disabled in onboarding (`BillingCountryField.vue:71`).
- Lock text "locked by billing activity" (`:190-192`).
- City before Address line 1 (`:195-212`); Indian phone placeholder for all (`:225`).

## Expected outcome
Locked fields are disabled with the reason; address follows reading order.

## Affected users
Customer admins.

## Evidence
See the current behaviour above; full detail in [CB-13](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Avoidable errors.

## Solution options
- A. As expected.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Country disabled after lock with the server's reason.
- [ ] Address fields in reading order.
- [ ] Phone placeholder neutral.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
