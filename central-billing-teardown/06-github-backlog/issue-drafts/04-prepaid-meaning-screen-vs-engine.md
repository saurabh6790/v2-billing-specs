# The console says Prepaid charges nothing else, but the engine debits a Prepaid team's saved method

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-04](../../04-problem-discovery/problem-register.md) |
| Labels | `type:bug`, `priority:p1`, `area:billing-setup` |
| Priority | P1 |
| Complexity | S |

## Problem
What the customer is told about Prepaid and what the billing engine does differ.

## Current behaviour
- `PaymentMethodsCard.vue:19-36` treats Prepaid as credits first and nothing else charged.
- `is_debit_allowed` holds debits only for Manual Checkout and Action Required (`central/billing/payments/collection_mode.py:105-112`); dunning retries Prepaid off-session (`central/billing/revenue/dunning.py:326-339`).
- 4 Prepaid teams hold an active card or UPI method (production backup).

## Expected outcome
Screen and engine agree on one meaning of Prepaid.

## Affected users
Prepaid customers (all 64 external teams); finance.

## Evidence
See the current behaviour above; full detail in [CB-04](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
A customer can be charged after being told they would not be.

## Solution options
- A. Engine: Prepaid never debits a method.
- B. Screen: say credit first, then the method.
- C. Two modes: credits only, credits then method.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
Decide D-01; implement A or B; notify the 4 affected teams if B.

## Acceptance criteria
- [ ] A test asserts the chosen Prepaid behaviour when credit is short.
- [ ] Payments copy states that behaviour in one sentence.
- [ ] Method rows on Prepaid read accordingly ("Not charged" or "Charged when credit runs out").

## Dependencies
D-01. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
