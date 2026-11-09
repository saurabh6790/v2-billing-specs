# 175 — "Pause billing" stops the server but not the charges, and a paused server that is later terminated bills on

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:bug` `priority:p1` `area:subscriptions`
**Area:** `central/billing/catalog/subscriptions.py`, `central/billing/revenue/invoicing/lines.py`, `central/infrastructure/doctype/virtual_machine/virtual_machine.py`, `central/billing/platform/readiness.py`, `dashboard/src/components/billing/PayingForCard.vue`
**Source:** [CB-34](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The console promises that pausing stops charges. The invoice engine ignores the pause, so a paused server is billed at its full rate until the period ends.

## Current behaviour

- `pause_billing` sets `enabled = 0`, writes a `Paused` Subscription Change and stops the server (`central/billing/catalog/subscriptions.py:1134-1146`). Its docstring says this is so the subscription is "not left running and accruing".
- Invoice lines are built only from `Created`, `Plan Changed` and `Cancelled` rows (`central/billing/revenue/invoicing/lines.py:317`, `subscriptions.py:894`), and `team_line_items` does not filter on `enabled` (`lines.py:85-89`). The `Created` segment runs on through the pause.
- Production backup: the one paused subscription (paused 24 Oct 2026, ₹710/month) was invoiced for 13 whole days, 19 Oct to 1 Nov, so about 7 days after the pause. It is an internal team and the invoice was waived, so no money moved.
- Pause, then terminate: `disable_active_subscription` looks only for `enabled = 1` (`virtual_machine.py:293-303`), so the segment is never cancelled and the terminated server keeps billing. Readiness check S3 also looks only at `enabled = 1` (`readiness.py:313-334`), so it does not catch this. Code reading only; no case found in the backup.
- Headroom counts a paused server (`active_segments` has no `enabled` filter, `subscriptions.py:937-983`); the project run-rate does not (`subscriptions.py:1075-1085`).
- Dialog copy (seen on the demo site): "This stops the server/VM and the site(s)/services running on it, and stops charges until you resume." (`PayingForCard.vue:156`).

## What we want

A paused subscription accrues nothing from the moment of the pause. Resume reopens billing at the locked rate (ADR 0010: stop/start carries the locked rate). Termination always closes billing, paused or not.

**Who it affects:** Customers who pause servers to save money; finance.

**Why it matters:** A wrong charge on every pause, against a written promise. Low frequency today (1 pause in production), but the control is on every server row.

## Options

- A. Treat `Paused` as closing the segment and `Resumed` as opening one at the last locked rate; include both in the segment change types.
- B. Make pause write `Cancelled` and resume write `Created` at the old rate.
- C. Remove "Pause billing" and keep only Stop (see #176).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A. It keeps the history readable and matches ADR 0010. Ship with the terminate fix. D-17 (9 Nov 2026) keeps Pause billing as its own action. D-18 (9 Nov 2026): a paused server bills nothing, disk included.

## Acceptance criteria

- [ ] A subscription paused mid-day bills the hours before the pause on that date and nothing after it until resumed.
- [ ] Nothing is billed for a paused server: no compute, disk, IPv4 or other line for it.
- [ ] Resume opens billing at the locked rate from before the pause.
- [ ] Terminating a server with a paused subscription records `Cancelled` and closes billing.
- [ ] Readiness S3 flags any terminated server whose subscription still has an open segment, whatever `enabled` is.
- [ ] Team headroom and project run-rate agree on whether a paused server counts.
- [ ] Tests cover pause, resume, pause-then-terminate and a pause that spans the month end.
- [ ] Dialog copy: "Pause {name}? The server stops and you are not charged for it until you resume."

## Dependencies

None. Ship before or with #176.
