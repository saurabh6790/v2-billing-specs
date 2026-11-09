# 171 — "Primary payment method" is disabled without a reason while "Move up" does the same thing

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** XS · **Labels:** `type:ux` `priority:p3` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-05](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Two controls change the charge order; one is disabled with no explanation and the wallet takes the Primary label.

## Current behaviour

- Wallet reads "Primary" whenever balance > 0 (`PaymentMethodsCard.vue:232`).
- "Primary payment method" disabled while credits remain (`PaymentMethodRowActions.vue:41-47`); "Move up" works (`PaymentMethodsCard.vue:179-196`).

## What we want

One clear way to choose what is charged first, with credit shown as used first.

**Who it affects:** Customer admins.

**Why it matters:** Confusion about which card pays.

## Options

- A. "Charge this first" + Move up/down; wallet row "Used first while you have credit".

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] No disabled menu item without a reason.
- [ ] The wallet row never reads "Primary".

## Dependencies

#148.
