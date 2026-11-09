# 157 — Overview facts card labels shrink to single letters when a side panel is open

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:ux` `priority:p2` `area:limits` `area:wallet`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py` `dashboard/src/components/billing/WalletHistoryPanel.vue`, `dashboard/src/components/TopupDialog.vue`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-28](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The facts card becomes unreadable when Wallet history or another panel is open.

## Current behaviour

- Seen at 1440 px: "Payment met…", "Next paymen…"; with Wallet history open: "W.", "P.", "N.", "N.".
- Labels use `truncate` in a narrow grid column (`CycleFacts.vue:136-137`); the panel takes 24 rem (`SidePanel.vue:23`).

## What we want

Labels stay readable at every width the page supports.

**Who it affects:** All customers.

**Why it matters:** The four facts customers check most are lost exactly when they look at the wallet.

## Options

- A. Stack label over value below a container width.
- B. Overlay the panel instead of docking it.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] At 1440 px with a panel open, every label shows in full.
- [ ] At 1024 px without a panel, every label shows in full.

## Dependencies

None.
