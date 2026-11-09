# 153 — Overview "Pay now" opens the invoice list instead of the owed invoice

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-08](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The banner knows which invoice is owed but makes the customer find it.

## Current behaviour

- `OutstandingAlert.vue:85-92` pushes `{ name: 'BillingInvoices' }` without a query.
- The page already opens a panel from `?invoice=` (`BillingInvoicesPage.vue:73-80`).

## What we want

One click from the banner shows the invoice and its Pay button.

**Who it affects:** Customers.

**Why it matters:** Extra steps on the most important billing action.

## Options

- A. Deep-link to the oldest open issued invoice; with several, filter the list to open ones.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] With one open issued invoice, the banner opens its panel.
- [ ] With several, the list opens filtered to Outstanding and Overdue.

## Dependencies

None.
