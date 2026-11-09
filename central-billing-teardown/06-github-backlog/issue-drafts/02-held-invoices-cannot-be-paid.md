# Owed invoices held for accounting sync cannot be paid, and the customer is not told when they will be

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-22](../../04-problem-discovery/problem-register.md) |
| Labels | `type:operations`, `type:ux`, `priority:p1`, `area:invoices` |
| Priority | P1 |
| Complexity | S |

## Problem
Invoices a customer owes cannot be paid because they have not been issued, and the screen gives no time or reason.

## Current behaviour
- Both external Outstanding invoices in the production backup (₹11,367.17, ₹2,200.80) have `hold_reason = Accounting Sync`, `erpnext_sync_status = Pending`, no ERPNext invoice.
- The panel shows only "This invoice is being prepared. You can pay it once it is issued." (`dashboard/src/pages/billing/BillingInvoicesPage.vue:389-393`).
- No Desk action releases or retries the hold from the invoice (`central/billing/doctype/invoice/invoice.js`).

## Expected outcome
Held invoices are noticed by operators within hours, can be retried from Desk, and the customer sees when the invoice will be ready.

## Affected users
Customers; finance; billing on-call.

## Evidence
See the current behaviour above; full detail in [CB-22](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Cash not collected; customers cannot act.

## Solution options
- A. Alert on holds older than N hours + Desk "Retry sync".
- B. Allow paying before issue (conflicts with ADR 0019).
- C. Customer copy: expected date + email when issued.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
First confirm the state in live production and why sync is Pending. Then A + C.

## Acceptance criteria
- [ ] An invoice held longer than N hours raises one operator alert naming the hold reason.
- [ ] The Invoice form shows the hold reason and a Retry sync action for Accounting Sync holds.
- [ ] The customer panel states the expected issue date and that an email follows.
- [ ] When the hold clears, the customer can pay without reloading more than once.

## Dependencies
D-06. Confirm production state first. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
