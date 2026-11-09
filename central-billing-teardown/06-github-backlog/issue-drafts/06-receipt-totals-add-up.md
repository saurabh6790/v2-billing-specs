# Invoice receipt shows deductions above a Total that ignores them, hides TDS, and the Pay amount differs from Total

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-01](../../04-problem-discovery/problem-register.md) |
| Labels | `type:bug`, `type:ux`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
When credits, top-up GST or TDS apply, the receipt's figures do not add up and the amount to pay is not explained.

## Current behaviour
- Panel order: Subtotal, Tax, −Credits applied, −GST paid with top-ups, **Total** (= `total`, before deductions) (`BillingInvoicesPage.vue:243-295`).
- Button: "Pay {expected_collection} now" (`:400`); `expected_collection = total − tds_amount`, credits at open (`central/billing/revenue/invoicing/generate.py:205-208`). No TDS line.
- No affected invoices yet in production.

## Expected outcome
Every figure is the sum of the lines above it, and the button equals Amount due.

## Affected users
Customers; customer accounts teams.

## Evidence
See the current behaviour above; full detail in [CB-01](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Distrust of the bill and support questions once credits or TDS apply.

## Solution options
- A. Invoice total → deductions → Amount due.
- B. Amount due only, breakdown on expand.
- C. Rename and reorder only.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] Panel shows Invoice total, then each deduction including TDS, then Amount due.
- [ ] Pay button amount equals Amount due.
- [ ] List column label matches the figure shown (D-10).
- [ ] A unit test of the panel covers credits, top-up GST and TDS.

## Dependencies
D-10. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
