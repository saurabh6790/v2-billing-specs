# Operators cannot charge again, send a payment link or release a hold from an invoice; Cancel shows no effects

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-19](../../04-problem-discovery/problem-register.md) |
| Labels | `type:operations`, `priority:p2`, `area:operator-desk` |
| Priority | P2 |
| Complexity | M |

## Problem
Common collection tasks need engineering because Desk has no action for them.

## Current behaviour
- Invoice form actions: Cancel, Refund Part, Cancel and Refund, Retry Failed Refunds (`central/billing/doctype/invoice/invoice.js:6-42`).
- Cancel asks only for a reason (`:44-61`).

## Expected outcome
Operators can retry collection, send a payment link and retry a held sync from the invoice, and see what Cancel will do before confirming.

## Affected users
Support; finance.

## Evidence
See the current behaviour above; full detail in [CB-19](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Escalations; slower cash.

## Solution options
- A. Add the three actions + an effects summary on Cancel.
- B. Put actions on the team view (#5) only.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A, scoped by D-03.

## Acceptance criteria
- [ ] Each action requires operator permission and a reason, and writes a Billing Event.
- [ ] Cancel lists effects (credit note, dunning stop, refunds) before Confirm.

## Dependencies
D-03; #5. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
