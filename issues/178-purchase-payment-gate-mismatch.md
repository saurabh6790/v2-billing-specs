# 178 — The New server page says no payment method is needed when the team has any credit, then the server refuses the create

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:purchase`
**Area:** `central/signups/credit.py`, `central/resource_actions.py`, `central/billing/payments/settlement.py`, `dashboard/src/pages/servers/NewServerPage.vue`, `PlanGroup.vue`
**Source:** [CB-39](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The console and the server use two rules for "can this team buy this server". The customer learns the real rule after clicking Create.

## Current behaviour

- Console: `payment_method_required` is false when the wallet balance is above zero (`central/signups/credit.py:51-56`).
- Server: credit is enough only when it covers the server's monthly rate (`resource_actions.py:536`, `settlement.py:179-187`); otherwise it needs a complete profile and an active method, and throws PAYMENT_METHOD_REQUIRED (`resource_actions.py:543-546`).
- The plan menu does not mark which plans the credit covers.
- Production backup: 2 external teams hold credit with no active method. Welcome credit is off (`grant_welcome_credits = 0`), so this grows when it is turned on.

## What we want

Before Create, the page says which plans the credit covers and asks for a payment method for the rest.

**Who it affects:** New teams with credit and no payment method.

**Why it matters:** A refusal after the customer has filled in the whole form, at the first purchase.

## Options

- A. Return the credit-funded headroom with the purchase state; the menu marks plans above it "Needs a payment method" and the alert shows when the selected plan is above it.
- B. Make the console rule match by checking the selected rate on change (extra call).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] `get_purchase_state` returns the credit-funded amount the server rule uses.
- [ ] Selecting a plan above it shows the "Add a payment method" alert before Create.
- [ ] The server rule is unchanged and stays authoritative.
- [ ] Tests cover credit below, equal to and above the rate.

## Dependencies

None.
