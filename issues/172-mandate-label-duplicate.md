# 172 — "UPI Autopay" is shown twice on a mandate row with no UPI ID

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** XS · **Labels:** `type:ux` `priority:p3` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-24](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

A payment-method row repeats its type.

## Current behaviour

- Seen: "UPI Autopay" / "UPI Autopay · up to ₹200,000.00 per debit".
- `_mandate_label` returns the method type when there is no UPI ID or card (`central/billing/payments/mandates.py:400-407`); `detail()` prefixes the type when a label exists (`PaymentMethodsCard.vue:81-84`).

## What we want

The type appears once; the UPI ID or card shows when known.

**Who it affects:** Customers with UPI mandates.

**Why it matters:** Noise.

## Options

- A. Leave `display_label` empty when it equals the type, or skip the prefix when equal.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A mandate without a UPI ID reads "UPI Autopay" / "Up to ₹200,000 per debit".

## Dependencies

None.
