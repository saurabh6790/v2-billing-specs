# 148 — Customers cannot see or change how they pay, and making a card primary silently changes it

**Type:** HITL · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:feature` `type:ux` `priority:p1` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-03](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-02, D-12 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

The collection mode decides whether a team is charged, but customers cannot see it, cannot change it outside one INR case, and can change it by accident.

## Current behaviour

- No control sets Auto Charge / Manual Checkout / Prepaid except the INR Action-required dialog, which says "You can switch anytime in Billing settings" (`dashboard/src/components/billing/CollectionActionBanner.vue:134-136`). No such screen exists.
- "Primary payment method" on a Prepaid team also sets Auto Charge; the toast says only "{card} is charged first" (`dashboard/src/components/billing/PaymentMethodsCard.vue:138-157`).
- All 64 external teams are Prepaid (production backup).

## What we want

Payments shows how the team pays in one sentence, with a Change control that states the consequence. No other action changes the mode.

**Who it affects:** Customer admins; support; finance.

**Why it matters:** Customers are billed in a way they cannot see; one click changes it.

## Options

- A. "How you pay" card on Payments with Change.
- B. Mode selector in the Payment methods header.
- C. A separate Billing settings page.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, after D-01.

## Acceptance criteria

- [ ] Payments shows the current mode and what happens when credit runs out.
- [ ] Change opens a chooser that explains each mode and confirms the effect before saving.
- [ ] Promoting a payment method never changes the mode.
- [ ] The "Billing settings" sentence points to the new control.
- [ ] Viewers without manage rights see the mode but no Change.

## Dependencies

D-02 (who may change mode), D-12. Ships with the Prepaid copy fix.
