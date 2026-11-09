# 150 — Prepaid copy and console logic assume credits only; the decided rule is credits first, then the saved method

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `type:ux` `priority:p2` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-04](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The console was written for a meaning of Prepaid the product does not use. Customers choosing Prepaid are not told their method is charged when credit runs out.

## Current behaviour

- Decided rule (9 Nov 2026): a top-up is an advance that settles invoices; when credit is not enough and a method is saved, the method is charged for the rest. The engine matches (`central/billing/payments/collection_mode.py:105-126`).
- `PaymentMethodsCard.vue:19-36` describes Prepaid rows as "not charged"; promoting a card on Prepaid switches the team to Auto Charge on that premise (`:138-157`).
- The INR Action-required option "Prepaid wallet: Add credits up front; your usage draws them down." does not mention the method (`CollectionActionBanner.vue:71-77`).
- The Overview already states the rule: "Covers N% of this cycle, card pays the rest" (`CycleFacts.vue:81-89`).

## What we want

Every surface that names Prepaid states the decided rule in the same sentence, and no action changes the mode as a side effect.

**Who it affects:** Prepaid customers (all 64 external teams in production); INR customers at the Action-required step.

**Why it matters:** A customer who picks "Prepaid wallet" to avoid card debits is debited anyway.

## Options

- A. Copy fix on every Prepaid surface + remove the side-effect mode switch.
- B. A plus the "How you pay" card (#148).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A now; B with the collection-mode card.

## Acceptance criteria

- [ ] The Action-required Prepaid option says credit pays first and the saved method pays the rest.
- [ ] Promoting a payment method no longer calls `setCollectionMode`.
- [ ] The comment block in `PaymentMethodsCard.vue` describes the decided rule.
- [ ] A test asserts a Prepaid team with a method is debited for the remainder (engine behaviour, already true).

## Dependencies

D-12 (keep Prepaid separate from Auto Charge?) does not block the copy fix.
