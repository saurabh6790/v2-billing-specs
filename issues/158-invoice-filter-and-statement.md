# 158 — Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-16](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-07, an amount below the gateway's minimum charge is waived and booked as a loss.

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

A. Tiny amounts follow D-07 (decided).

## Acceptance criteria

- [ ] The wallet pays first, whatever the amount. Only what the payment method would have to charge is compared with the gateway minimum.
- [ ] Billing Settings minimums equal the gateway minimum charge per currency (code seeds ₹1 and $1, `settings.py:76`; the production backup has INR ₹50 and no USD row).
- [ ] A waived amount is booked as a loss in accounting (write-off account checked, not created, by Central), not only recorded as a Team Event.
- [ ] Filter offers every status present.
- [ ] "Export statement (CSV)" replaces the Statement tab.
- [ ] The "issued separately" text is gone.

## Dependencies

D-07 decided. Write-off account from finance.
