# 160 — Wallet history shows raw timestamps, internal notes, no expiry per grant, and only the latest 50 entries

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:wallet`
**Area:** `dashboard/src/components/billing/WalletHistoryPanel.vue`, `dashboard/src/components/TopupDialog.vue`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-29](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Customers cannot read their credit history clearly or see when credit expires, and they see notes written for operators.

## Current behaviour

- Seen: "Welcome credits · 2026-01-01 00:00:00".
- Entries show `note || entry_type` and raw `created_at` (`WalletHistoryPanel.vue:94-98`).
- Production notes include a gateway payment id and operator wording (backup, 3 Nov 2026).
- Expiry appears only as one hint for the soonest grant (`CycleFacts.vue:91-99`); 32 promotional grants carry an expiry.
- `credit_ledger(limit=50)` with no paging (`central/billing/api/dashboard/invoices.py:572-591`).

## What we want

Each entry has a customer description, a formatted date, and for grants the expiry and remaining amount; all history is reachable and exportable.

**Who it affects:** Customers; support.

**Why it matters:** Confusion over credit; operator notes exposed.

## Options

- A. Customer description per entry type + formatted dates + expiry per grant + paging and CSV.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] Entries read e.g. "Welcome credit", "Top-up", "Used for October 2026 invoice", "Expired".
- [ ] Operator notes are not shown to customers.
- [ ] Dates use `formatDate`.
- [ ] Promotional grants show expiry and remaining amount.
- [ ] "Show more" loads older entries; CSV export available.

## Dependencies

None.
