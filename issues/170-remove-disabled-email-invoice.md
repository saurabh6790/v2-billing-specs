# 170 — Remove controls that never work: "Email invoice" and the "Auto-recharge" switch

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** XS · **Labels:** `type:ux` `priority:p3` `area:invoices` `area:wallet`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py` `dashboard/src/components/billing/WalletHistoryPanel.vue`, `dashboard/src/components/TopupDialog.vue`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-15](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

A control that never works is shown on every invoice.

## Current behaviour

- `BillingInvoicesPage.vue:195-201`: disabled, title "Email invoice (coming soon)".
- `WalletHistoryPanel.vue:25-31,51-57`: the switch flips back with "Auto-recharge isn't available yet"; no endpoint exists.

## What we want

Only working actions are shown.

**Who it affects:** Customers.

**Why it matters:** Noise; a promise not kept.

## Options

- A. Remove both now; track invoice email (MC-06) and auto-recharge (D-14) separately.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Both controls removed.
- [ ] Separate feature notes exist for invoice email and auto-recharge.

## Dependencies

D-14 decides whether auto-recharge is built later.
