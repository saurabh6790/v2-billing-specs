# 155 — Onboarding says "No charge today" but adding a card makes a small refunded charge

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:ux` `priority:p2` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-11](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The customer is told nothing will be charged, then sees a charge.

## Current behaviour

- "No charge today. We save it and check that it works." (`BillingStep.vue:46-47`).
- "Validating your card with a small temporary charge that's refunded right away." appears only after Add card (`AddMethodDialog.vue:263-268`).

## What we want

The check charge is disclosed before the first click, in the same words everywhere.

**Who it affects:** New customers.

**Why it matters:** Surprise bank notifications; distrust at sign-up.

## Options

- A. Rewrite both texts and show the note above the card field.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Onboarding and the card dialog both say a small charge is made and refunded.
- [ ] The note is visible before Add card is pressed.

## Dependencies

None.
