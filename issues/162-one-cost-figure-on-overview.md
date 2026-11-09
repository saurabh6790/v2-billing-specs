# 162 — This cycle's cost appears five times on the Overview, from two sources and two tax bases

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** M · **Labels:** `type:ux` `priority:p2` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-26](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Customers see several different numbers for what this month costs.

## Current behaviour

- Headline with tax (`EstimatedCard.vue:196`); Subscriptions header before tax (`PayingForCard.vue:67-70`); Limits "Spend per cycle" (`LimitsCard.vue:78-85`); chart's last bar measured (`SpendCard.vue:60-65`); breakdown total (`CycleBreakdownPanel.vue:80-83`).
- "Bills in N days" and "Next invoice" are the same date (`EstimatedCard.vue:201-204`, `CycleFacts.vue:106`).

## What we want

One figure for this cycle, with its tax basis stated; other places link to it or say what they differ by.

**Who it affects:** Customers; finance contacts.

**Why it matters:** Doubt about the bill; support questions.

## Options

- A. One headline; others link to the breakdown.
- B. Keep all, label each basis.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] The page shows at most one "this cycle" total.
- [ ] Every other money figure states its basis (before tax, with tax, so far).
- [ ] One name for the cycle-end date.
- [ ] Next to the spending limit, the figure is the base cost before tax with "Taxes are added on top" (D-13, #147).

## Dependencies

#147 (limit basis).
