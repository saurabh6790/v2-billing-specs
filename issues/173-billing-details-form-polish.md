# 173 — Billing details form: country editable after currency lock, vague lock text, address field order

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** XS · **Labels:** `type:ux` `priority:p3` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-13](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The form lets a customer try a change that will fail and orders the address oddly.

## Current behaviour

- Country editable after lock (`BillingProfileForm.vue:181-188`) but disabled in onboarding (`BillingCountryField.vue:71`).
- Lock text "locked by billing activity" (`:190-192`).
- City before Address line 1 (`:195-212`); Indian phone placeholder for all (`:225`).

## What we want

Locked fields are disabled with the reason; address follows reading order.

**Who it affects:** Customer admins.

**Why it matters:** Avoidable errors.

## Options

- A. As expected.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Country disabled after lock with the server's reason.
- [ ] Address fields in reading order.
- [ ] Phone placeholder neutral.

## Dependencies

None.
