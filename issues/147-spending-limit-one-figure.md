# 147 — The spending limit is compared with three figures on screen, and none is the one the server-create gate uses

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:bug` `type:ux` `priority:p1` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-25](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (D-13, 9 Nov 2026):** the limit is checked against base cost before tax, which is what the gate does today. The Overview shows cost with tax, so every place that compares cost with the limit must say taxes are added on top.

## Problem

Customers cannot predict when a new server will be refused, because the limit is shown against different figures than the gate checks.

## Current behaviour

- This cycle card: bar and "over limit" use the subtotal before tax (`dashboard/src/components/billing/EstimatedCard.vue:50-62`).
- Limits card: "Spend per cycle" uses the projected total with tax (`useSpendingLimits.ts:38,56-60`, `LimitsCard.vue:78-85`).
- Spend chart: this cycle's bar is the measured amount (`SpendCard.vue:60-65`).
- Gate: monthly rates of running subscriptions (`central/billing/catalog/subscriptions.py:1066-1072`); refusal says "exceeds your remaining headroom" (`:1060`).
- 61 of 64 external teams are on Beginner: ₹8,300 / $100 per cycle (production backup).

## What we want

One figure means "spend against your limit" on every card, in the plan menu, in the gate and in the refusal: the monthly base cost (before tax) of what runs. Every such place says that taxes are added on top.

**Who it affects:** Customers creating or resizing servers; support.

**Why it matters:** Frequent, unexplained refusals at the moment of purchase for nearly every team.

## Options

- A. Limit = monthly run-rate (today's gate); show it everywhere.
- B. Limit = projected cycle before tax; change the gate.
- C. Show two labelled limits.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A. Decided by D-13: base cost before tax; the gate does not change.

## Acceptance criteria

- [ ] This cycle card, Limits card and Tiers tray compare the limit with the monthly base cost of running servers (the gate's figure, from the server), not the subtotal, projected total or measured amount.
- [ ] Each of these places says "before tax" next to the figure and "Taxes are added on top" next to the limit.
- [ ] Where a figure with tax sits next to the limit (This cycle card), the two are labelled so they cannot be read as the same number.
- [ ] The plan menu and the refusal use that figure and the words "spending limit", never "headroom".
- [ ] Refusal text: "This server adds {x} a month before tax. Your spending limit is {limit} and your servers already run at {current}. Taxes are added on top."
- [ ] A test covers the gate and the card figure agreeing.

## Dependencies

None. #162 (one cost figure) follows.
