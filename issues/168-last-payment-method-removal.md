# 168 — The last payment method can be removed while an invoice is owed, with a warning that does not say so

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:feature` `priority:p2` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-02](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-11 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

A customer can remove the only way an owed invoice would be collected, without being told.

## Current behaviour

- Confirm text: "Invoices will fall back to your other methods, if any." (`PaymentMethodsCard.vue:320-329`).
- Backend revokes and deletes with no check for owed invoices or remaining methods (`central/billing/payments/payments.py:326-349`).
- No team on Auto Charge in production today.

## What we want

The customer knows what is owed and what happens next before removing the last method.

**Who it affects:** Customer admins; finance.

**Why it matters:** Failed collection and suspension after a removal the customer did not understand.

## Options

- A. Block.
- B. Warn with amount owed and next steps.
- C. Replace-only flow.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

B now; C later.

## Acceptance criteria

- [ ] Removing the last active method with an invoice owed shows the amount, the due date and what happens next.
- [ ] With other methods present the current text stays.
- [ ] Server returns the facts the dialog needs.

## Dependencies

D-11.
