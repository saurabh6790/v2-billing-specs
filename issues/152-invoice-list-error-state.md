# 152 — Invoice list shows "No invoices yet" when loading fails

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:bug` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-06](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

A failed load is shown as an empty history.

## Current behaviour

- `useInvoices` exposes `error` (`dashboard/src/composables/useInvoices.ts:24-27`); `BillingInvoicesPage.vue:33-37` does not use it.
- Empty state: "No invoices yet. Your first invoice appears here at the end of the cycle." (`InvoiceListView.vue:117-120`).

## What we want

A load failure shows an error with Retry; the empty state appears only after a successful empty load.

**Who it affects:** Customers.

**Why it matters:** Contradicts the overdue banner; can cause tickets or missed payments.

## Options

- A. Red Alert with Retry, as on Payments (`BillingPaymentsPage.vue:28-34`).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] On error the list shows "Couldn't load your invoices" with Retry.
- [ ] Retry reloads the list.
- [ ] Empty state unchanged for a successful empty response.

## Dependencies

None.
