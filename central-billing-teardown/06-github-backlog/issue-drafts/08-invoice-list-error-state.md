# Invoice list shows "No invoices yet" when loading fails

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-06](../../04-problem-discovery/problem-register.md) |
| Labels | `type:bug`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | XS |

## Problem
A failed load is shown as an empty history.

## Current behaviour
- `useInvoices` exposes `error` (`dashboard/src/composables/useInvoices.ts:24-27`); `BillingInvoicesPage.vue:33-37` does not use it.
- Empty state: "No invoices yet. Your first invoice appears here at the end of the cycle." (`InvoiceListView.vue:117-120`).

## Expected outcome
A load failure shows an error with Retry; the empty state appears only after a successful empty load.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-06](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Contradicts the overdue banner; can cause tickets or missed payments.

## Solution options
- A. Red Alert with Retry, as on Payments (`BillingPaymentsPage.vue:28-34`).

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A.

## Acceptance criteria
- [ ] On error the list shows "Couldn't load your invoices" with Retry.
- [ ] Retry reloads the list.
- [ ] Empty state unchanged for a successful empty response.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
