# 184 — At phone width the invoice list hides Status and Amount off to the right, and the invoice panel keeps focus behind it

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/components/billing/InvoiceListView.vue`, `dashboard/src/components/common/list-view/ListView.vue`, `dashboard/src/components/common/SidePanel.vue`
**Source:** [CB-43](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

On a phone the invoice list shows only the period and number. What each invoice cost and whether it is paid needs a sideways scroll nobody is told about.

## Current behaviour

- Seen at 390 px (central.local, console in a 390 px frame): the list is 720 px wide inside a 362 px scroller; Status sits at x = 500 and Amount at x = 619, off screen. Columns have fixed widths (`InvoiceListView.vue:64-90`).
- Opening an invoice covers the list (`SidePanel.vue`, `absolute inset-0` below `md`). It has a visible Close button, so the user is not trapped (H-03 partly refuted).
- Focus stays on the row button behind the panel; the panel is an `aside` with no role or label; Escape does not close it (synthetic key event, and no key handler in `SidePanel.vue`).

## What we want

On a phone each invoice row shows period, amount and status without sideways scrolling. Opening an invoice moves focus into the panel; Escape and Close return focus to the row.

**Who it affects:** Customers on phones; keyboard and screen-reader users.

**Why it matters:** The most common billing question (what do I owe) needs a hidden gesture on a phone.

## Options

- A. Stacked row below `md`: period and number on line 1, amount and status badge on line 2.
- B. Hide the number column below `md` and keep a table.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, in the shared ListView so other lists gain it.

## Acceptance criteria

- [ ] At 390 px each row shows amount and status with no horizontal scroll.
- [ ] Opening an invoice moves focus to the panel heading; Escape closes it; focus returns to the row.
- [ ] The panel has `role=dialog` (below `md`) or a labelled region (above).
- [ ] Check the Payments and Overview pages at 390 px in the same pass.

## Dependencies

Part of #169's accessibility scope; can ship alone.
