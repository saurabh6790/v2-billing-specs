# 148 — Customers cannot see or change how they pay, and making a card primary silently changes it

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:feature` `type:ux` `priority:p1` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-03](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-02, the team owner or a member with billing rights can change how the team pays. One rule for collection: the wallet pays first; when the wallet is empty or short, the payment method is charged directly.

## Problem

The collection mode decides whether a team is charged, but customers cannot see it, cannot change it outside one INR case, and can change it by accident.

## Current behaviour

- No control sets Auto Charge / Manual Checkout / Prepaid except the INR Action-required dialog, which says "You can switch anytime in Billing settings" (`dashboard/src/components/billing/CollectionActionBanner.vue:134-136`). No such screen exists.
- "Primary payment method" on a Prepaid team also sets Auto Charge; the toast says only "{card} is charged first" (`dashboard/src/components/billing/PaymentMethodsCard.vue:138-157`).
- All 64 external teams are Prepaid (production backup).

Decided (D-12, 9 Nov 2026): Prepaid stays separate from Auto Charge. Prepaid = the wallet pays dues; only when the wallet is short is the alternative method (card or UPI) charged.

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

A. One sentence per mode, used by the console, emails and support:
- Prepaid: "Your wallet pays your invoices. If it runs short, {method} pays the rest."
- Auto Charge: "{method} is charged for each invoice."
- Manual Checkout: "You pay each invoice yourself."
Check the Auto Charge sentence against the credit draw before shipping: if credit is applied first in every mode, say so.

## Acceptance criteria

- [ ] Only the team owner or a member with billing rights sees and can use the control; others see the current setting read only.
- [ ] Every surface states one rule: "Your wallet pays first. When it is short, we charge {method}."
- [ ] Payments shows the current mode and what happens when credit runs out.
- [ ] Change opens a chooser that explains each mode and confirms the effect before saving.
- [ ] Promoting or adding a payment method never changes the mode (see #150 for the first-method switch).
- [ ] The "Billing settings" sentence points to the new control.
- [ ] Viewers without manage rights see the mode but no Change.

## Dependencies

D-02 decided. Ships with or after #150.
