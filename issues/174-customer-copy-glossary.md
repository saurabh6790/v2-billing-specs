# 174 — Customer copy in payment and invoice screens uses internal words

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** S · **Labels:** `type:ux` `priority:p3` `area:billing-setup` `area:invoices`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/` `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-14](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Customers read terms like gateway, Billable and Cost Report.

## Current behaviour

- Examples in [problem-register.md](../central-billing-teardown/12-problem-discovery/problem-register.md) §CB-14 (panel subtitle, add row, pay toasts).
- Seen: the method picker says "Authorised on your bank's page. We never see your card details." and the next step is a Stripe card field inside the dialog.
- Seen: "90,000 Nos used", "0 Nos" (catalog unit) and internal VM ids on the invoice receipt.

## What we want

Copy follows the glossary in [visual-consistency-review.md](../central-billing-teardown/11-ui-ux/visual-consistency-review.md).

**Who it affects:** Customers.

**Why it matters:** Small confusion repeated on every visit.

## Options

- A. One copy pass + Guard rule for banned words.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] No customer string uses gateway, Billable, Cost Report, settlement, provision.
- [ ] Add row reads "Add payment method".

## Dependencies

#163 for server messages.
