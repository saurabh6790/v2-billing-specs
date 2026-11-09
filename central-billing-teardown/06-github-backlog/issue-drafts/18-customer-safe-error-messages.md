# Server error text reaches customers word for word in payment and invoice flows

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-20](../../04-problem-discovery/problem-register.md) |
| Labels | `type:reliability`, `type:ux`, `priority:p2`, `area:billing-setup`, `area:invoices` |
| Priority | P2 |
| Complexity | M |

## Problem
Customers see messages written for developers.

## Current behaviour
- The console shows the server's message (`dashboard/src/lib/feedback.ts`).
- Reachable examples: "illegal transition {a} → {b}" (`central/billing/states.py:230`) when Pay races a webhook; "Payment confirmation failed." (`central/billing/payments/charges.py:430,447`).
- Full list: `07-resilience/error-message-audit.md`.

## Expected outcome
Customer-facing endpoints map known errors to plain sentences with a next step, and unknown ones to a generic message with a reference.

## Affected users
Customers; support.

## Evidence
See the current behaviour above; full detail in [CB-20](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Confusion; tickets without enough detail.

## Solution options
- A. Typed domain errors mapped in `api/dashboard`.
- B. Rewrite messages in place.
- C. Generic message for all non-validation errors.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] The race case shows "This invoice changed while you were paying. Refresh to see its status."
- [ ] Unknown errors show a reference that finds the Error Log.
- [ ] A Guard rule flags internal words in customer messages.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
