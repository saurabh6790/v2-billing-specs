# 163 — Server error text reaches customers word for word in payment and invoice flows

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** M · **Labels:** `type:reliability` `type:ux` `priority:p2` `area:billing-setup` `area:invoices`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/` `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-20](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Customers see messages written for developers.

## Current behaviour

- The console shows the server's message (`dashboard/src/lib/feedback.ts`).
- Reachable examples: "illegal transition {a} → {b}" (`central/billing/states.py:230`) when Pay races a webhook; "Payment confirmation failed." (`central/billing/payments/charges.py:430,447`).
- Full list: [error-message-audit.md](../central-billing-teardown/07-resilience/error-message-audit.md).

## What we want

Customer-facing endpoints map known errors to plain sentences with a next step, and unknown ones to a generic message with a reference.

**Who it affects:** Customers; support.

**Why it matters:** Confusion; tickets without enough detail.

## Options

- A. Typed domain errors mapped in `api/dashboard`.
- B. Rewrite messages in place.
- C. Generic message for all non-validation errors.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] The race case shows "This invoice changed while you were paying. Refresh to see its status."
- [ ] Unknown errors show a reference that finds the Error Log.
- [ ] A Guard rule flags internal words in customer messages.

## Dependencies

None.
