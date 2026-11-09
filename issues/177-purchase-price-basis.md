# 177 — The server price at purchase does not say it is before tax, leaves out the IPv4 charge, and says servers are billed to the payment method

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:purchase`
**Area:** `dashboard/src/composables/useServerCreation.ts`, `dashboard/src/components/servers/ServerSummary.vue`, `dashboard/src/components/servers/PlanGroup.vue`, `dashboard/src/pages/servers/NewServerPage.vue`, `ResizeServerDialog.vue`
**Source:** [CB-38](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

At the moment of purchase the customer sees one price that is not the amount they will pay.

## Current behaviour

- The summary shows the plan's monthly rate only, as "₹X /mo" (`useServerCreation.ts:313-323`, `ServerSummary.vue:37-40`). No "before tax". GST is 18 % for Indian customers (Billing Settings `default_gst_rate`).
- A public IPv4 shows as a tag, "Public IPv4 · ₹Y/mo" (`useServerCreation.ts:366`), and is not in the price.
- Plans over the limit show "Over your spending limit" (`PlanGroup.vue:149-152`), on the same pre-tax basis as the gate. That is right under D-13, but nothing says taxes are added on top.
- The payment alert says "Servers are billed monthly to your payment method." (`NewServerPage.vue:158-159`). All 64 external teams are Prepaid, where the wallet pays first.
- Not seen in the browser: the demo site cannot load images or plans (schema behind the code).

## What we want

The purchase summary shows the monthly price before tax, the IPv4 charge when selected, the total, and "Taxes are added on top". The plan menu and the resize dialog use the same words.

**Who it affects:** Customers creating or resizing servers.

**Why it matters:** The first invoice is higher than the price the customer accepted (18 % GST for India), which reads as a hidden charge.

## Options

- A. Price block: plan + IPv4 = monthly total before tax; one line "Taxes are added on top"; estimated tax for INR.
- B. A only, with no tax estimate.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

B now (D-13 decides the basis); add the INR estimate later if support asks.

## Acceptance criteria

- [ ] Summary shows plan price, IPv4 price when selected, and the monthly total, each marked before tax.
- [ ] "Taxes are added on top" appears on the summary, the plan menu and the resize dialog.
- [ ] The payment alert describes the team's mode: wallet first for Prepaid.
- [ ] The spending-limit message on the plan menu uses the same figure and words as #147.

## Dependencies

#147 for the shared wording. D-13 decided.
