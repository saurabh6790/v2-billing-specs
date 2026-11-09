# 169 — Accessibility gaps in payment-method and invoice screens

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:billing-setup` `area:invoices`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/` `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-17](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Selections, reasons and errors in D1/D2 screens are not exposed to assistive technology.

## Current behaviour

- See [accessibility-review.md](../central-billing-teardown/11-ui-ux/accessibility-review.md) A-01 to A-09 (role-less group label, colour-only selection, title-only reasons, `role="alert"` on a persistent banner, unlinked email error, side panel focus).

## What we want

Each item meets the listed WCAG 2.2 criterion when tested with a screen reader and keyboard.

**Who it affects:** Customers using assistive technology.

**Why it matters:** Tasks that cannot be completed without sight or a mouse.

## Options

- A. Fix A-01 to A-09 as listed.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, then test (D-09).

## Acceptance criteria

- [ ] Each A-item fixed as listed.
- [ ] Keyboard-only run of add method and pay invoice passes.
- [ ] VoiceOver announces selected tiles and errors.

## Dependencies

D-09 for testing.
