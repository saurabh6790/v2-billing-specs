# Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-16](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
Customers cannot filter to most of their invoices, and the Statement tab sends them looking for a document they already have.

## Current behaviour
- Filter: Outstanding, Paid, Overdue (`InvoiceListView.vue:92-101`); statuses include Waived and Cancelled.
- 4 of 6 external invoices are Cancelled (two of them ₹0.01 and ₹0.26).
- Statement says "Tax invoices are issued separately" (`StatementCard.vue:49`).

## Expected outcome
Every status can be filtered; the statement is an export of the list.

## Affected users
Customers; accounts teams.

## Evidence
See the current behaviour above; full detail in [CB-16](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Confusion; noise from tiny cancelled invoices.

## Solution options
- A. All statuses in the filter; Statement becomes an export action.
- B. Hide Cancelled by default with a toggle.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A; decide D-07 about tiny invoices.

## Acceptance criteria
- [ ] Filter offers every status present.
- [ ] "Export statement (CSV)" replaces the Statement tab.
- [ ] The "issued separately" text is gone.

## Dependencies
D-07. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
