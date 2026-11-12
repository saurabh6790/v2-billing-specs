# 150 — Prepaid copy assumes credits only, and adding or promoting a method silently turns Prepaid into Auto Charge

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `type:ux` `priority:p2` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-04](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (12 Nov 2026):** one rule: the wallet pays first; when it is short, the added method (card or UPI) is charged. `start_auto_charge` is removed; a team keeps the mode it has. Production backup: all 143 Billing Profiles are Prepaid, so no team was ever moved and none needs a data change.

## Problem

The console was written for a meaning of Prepaid the product does not use. Customers choosing Prepaid are not told their method is charged when credit runs out.

## Current behaviour

- Decided rule (9 Nov 2026): a top-up is an advance that settles invoices; when credit is not enough and a method is saved, the method is charged for the rest. The engine matches (`central/billing/payments/collection_mode.py:105-126`).
- `PaymentMethodsCard.vue:19-36` describes Prepaid rows as "not charged"; promoting a card on Prepaid switches the team to Auto Charge on that premise (`:138-157`).
- The INR Action-required option "Prepaid wallet: Add credits up front; your usage draws them down." does not mention the method (`CollectionActionBanner.vue:71-77`).
- The Overview already states the rule: "Covers N% of this cycle, card pays the rest" (`CycleFacts.vue:81-89`).
- The engine also merges the modes: `PaymentMethod.on_update` calls `start_auto_charge`, which moves a Prepaid team to Auto Charge when its first method becomes active (`central/billing/doctype/payment_method/payment_method.py:15-18`, `central/billing/payments/collection_mode.py:115-126`).
- Decided (D-12, 9 Nov 2026): Prepaid stays a separate mode. The wallet pays dues; only when it is short is the alternative method (card or UPI) charged.

## What we want

Every surface that names Prepaid states the decided rule in the same sentence, and no action changes the mode as a side effect: not promoting a method in the console, and not the first method becoming active in the engine.

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
- [ ] A Prepaid team whose first method becomes active stays Prepaid (`start_auto_charge` removed or limited to teams that asked for Auto Charge). Signed off 12 Nov 2026.
- [ ] Teams already moved from Prepaid to Auto Charge by `start_auto_charge` are listed for product to decide; no data is changed by this issue.
- [ ] A Prepaid INR team whose remainder after the wallet is above ₹15,000 gets the same Action Required prompt as an Auto Charge team (pay on-session). Today `charges.py:118-128` skips the charge and moves only Auto Charge teams (H-06).
- [ ] The comment block in `PaymentMethodsCard.vue` describes the decided rule.
- [ ] A test asserts a Prepaid team with a method is debited for the remainder (engine behaviour, already true).

## Dependencies

D-12 decided; sign-off given 12 Nov 2026.
