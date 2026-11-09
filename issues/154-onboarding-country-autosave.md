# 154 — Onboarding saves a billing country from the browser time zone without the user choosing it

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:ux` `priority:p2` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-12](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Opening a screen writes the billing country and currency.

## Current behaviour

- `BillingCountryField.vue:57-61` calls `onChange('India')` on mount for Asia/Kolkata, which saves via `save_billing_profile` (`:38-48`).
- 43 of 55 incomplete external profiles hold only country = India (fits; cause not proven).

## What we want

Country is pre-selected but saved only when the user continues.

**Who it affects:** New customers.

**Why it matters:** Wrong currency for foreign companies with Indian staff; locked after money moves.

## Options

- A. Pre-select, save on Continue.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Opening onboarding makes no write.
- [ ] The guess shows as the selected value.
- [ ] Saving happens on the user's action.

## Dependencies

None.
