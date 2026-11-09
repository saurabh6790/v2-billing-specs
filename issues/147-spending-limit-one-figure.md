# 147 — The spending limit is compared with three figures on screen, and none is the one the server-create gate uses

**Type:** HITL · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:bug` `type:ux` `priority:p1` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-25](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-13 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

Customers cannot predict when a new server will be refused, because the limit is shown against different figures than the gate checks.

## Current behaviour

- This cycle card: bar and "over limit" use the subtotal before tax (`dashboard/src/components/billing/EstimatedCard.vue:50-62`).
- Limits card: "Spend per cycle" uses the projected total with tax (`useSpendingLimits.ts:38,56-60`, `LimitsCard.vue:78-85`).
- Spend chart: this cycle's bar is the measured amount (`SpendCard.vue:60-65`).
- Gate: monthly rates of running subscriptions (`central/billing/catalog/subscriptions.py:1066-1072`); refusal says "exceeds your remaining headroom" (`:1060`).
- 61 of 64 external teams are on Beginner: ₹8,300 / $100 per cycle (production backup).

## What we want

One figure means "spend against your limit" on every card, in the plan menu, in the gate and in the refusal.

**Who it affects:** Customers creating or resizing servers; support.

**Why it matters:** Frequent, unexplained refusals at the moment of purchase for nearly every team.

## Options

- A. Limit = monthly run-rate (today's gate); show it everywhere.
- B. Limit = projected cycle before tax; change the gate.
- C. Show two labelled limits.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A (decide D-13).

## Acceptance criteria

- [ ] This cycle card, Limits card and Tiers tray show the same figure against the limit, with its basis stated.
- [ ] The plan menu and the refusal use that figure and the words "spending limit".
- [ ] Refusal text: "This server adds {x} a month. Your limit is {limit} and your servers already run at {current}."
- [ ] A test covers the gate and the card figure agreeing.

## Dependencies

D-13.
