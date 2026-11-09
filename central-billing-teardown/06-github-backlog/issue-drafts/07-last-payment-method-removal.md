# The last payment method can be removed while an invoice is owed, with a warning that does not say so

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-02](../../04-problem-discovery/problem-register.md) |
| Labels | `type:feature`, `priority:p2`, `area:billing-setup` |
| Priority | P2 |
| Complexity | S |

## Problem
A customer can remove the only way an owed invoice would be collected, without being told.

## Current behaviour
- Confirm text: "Invoices will fall back to your other methods, if any." (`PaymentMethodsCard.vue:320-329`).
- Backend revokes and deletes with no check for owed invoices or remaining methods (`central/billing/payments/payments.py:326-349`).
- No team on Auto Charge in production today.

## Expected outcome
The customer knows what is owed and what happens next before removing the last method.

## Affected users
Customer admins; finance.

## Evidence
See the current behaviour above; full detail in [CB-02](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Failed collection and suspension after a removal the customer did not understand.

## Solution options
- A. Block.
- B. Warn with amount owed and next steps.
- C. Replace-only flow.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
B now; C later.

## Acceptance criteria
- [ ] Removing the last active method with an invoice owed shows the amount, the due date and what happens next.
- [ ] With other methods present the current text stays.
- [ ] Server returns the facts the dialog needs.

## Dependencies
D-11. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
