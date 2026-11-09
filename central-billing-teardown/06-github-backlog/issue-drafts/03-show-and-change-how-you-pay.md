# Customers cannot see or change how they pay, and making a card primary silently changes it

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-03](../../04-problem-discovery/problem-register.md) |
| Labels | `type:feature`, `type:ux`, `priority:p1`, `area:billing-setup` |
| Priority | P1 |
| Complexity | M |

## Problem
The collection mode decides whether a team is charged, but customers cannot see it, cannot change it outside one INR case, and can change it by accident.

## Current behaviour
- No control sets Auto Charge / Manual Checkout / Prepaid except the INR Action-required dialog, which says "You can switch anytime in Billing settings" (`dashboard/src/components/billing/CollectionActionBanner.vue:134-136`). No such screen exists.
- "Primary payment method" on a Prepaid team also sets Auto Charge; the toast says only "{card} is charged first" (`dashboard/src/components/billing/PaymentMethodsCard.vue:138-157`).
- All 64 external teams are Prepaid (production backup).

## Expected outcome
Payments shows how the team pays in one sentence, with a Change control that states the consequence. No other action changes the mode.

## Affected users
Customer admins; support; finance.

## Evidence
See the current behaviour above; full detail in [CB-03](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Customers are billed in a way they cannot see; one click changes it.

## Solution options
- A. "How you pay" card on Payments with Change.
- B. Mode selector in the Payment methods header.
- C. A separate Billing settings page.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A, after D-01.

## Acceptance criteria
- [ ] Payments shows the current mode and what happens when credit runs out.
- [ ] Change opens a chooser that explains each mode and confirms the effect before saving.
- [ ] Promoting a payment method never changes the mode.
- [ ] The "Billing settings" sentence points to the new control.
- [ ] Viewers without manage rights see the mode but no Change.

## Dependencies
D-01, D-02. Ships with #4. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
