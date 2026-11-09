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

- A. Remove both now; track invoice email (MC-06) separately. Auto-recharge will not be built (D-14).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Both controls removed.
- [ ] A separate feature note exists for invoice email.
- [ ] The `auto_recharge` setting, if stored, is removed with its reads.

## Dependencies

None. D-14 decided 9 Nov 2026: auto-recharge is not built.
