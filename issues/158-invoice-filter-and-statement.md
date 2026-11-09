# 158 — Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-16](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Customers cannot filter to most of their invoices, and the Statement tab sends them looking for a document they already have.

## Current behaviour

- Filter: Outstanding, Paid, Overdue (`InvoiceListView.vue:92-101`); statuses include Waived and Cancelled.
- 4 of 6 external invoices are Cancelled (two of them ₹0.01 and ₹0.26).
- Statement says "Tax invoices are issued separately" (`StatementCard.vue:49`).

## What we want

Every status can be filtered; the statement is an export of the list.

**Who it affects:** Customers; accounts teams.

**Why it matters:** Confusion; noise from tiny cancelled invoices.

## Options

- A. All statuses in the filter; Statement becomes an export action.
- B. Hide Cancelled by default with a toggle.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A; decide D-07 about tiny invoices.

## Acceptance criteria

- [ ] Filter offers every status present.
- [ ] "Export statement (CSV)" replaces the Statement tab.
- [ ] The "issued separately" text is gone.

## Dependencies

D-07.
