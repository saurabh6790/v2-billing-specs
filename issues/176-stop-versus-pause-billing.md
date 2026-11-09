# 176 — A stopped server should bill for its disk only; today it bills in full and nothing tells the customer

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** M · **Labels:** `type:ux` `priority:p2` `area:subscriptions`
**Area:** `central/billing/catalog/subscriptions.py`, `central/billing/revenue/invoicing/lines.py`, `central/infrastructure/doctype/virtual_machine/virtual_machine.py`, `dashboard/src/components/billing/StopAllServersRow.vue`, `dashboard/src/components/billing/SubscriptionRowActions.vue`, server Stop dialog, `docs/content/billing/index.md`
**Source:** [CB-35](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-16, a stopped server bills for its disk only. D-17, Pause billing stays its own action. D-19, a server stopped by dunning bills nothing while suspended.
>
> **Decided (provisional, business not final):** D-25, the Stop dialog offers **Stop** (keeps the disk, bills disk only) and **Snapshot and release** (snapshot, delete the server and disk, bill the snapshot; restore creates a new server with a new IP).

## Problem

Customers have two ways to turn a server off and are not told that one of them keeps billing.

## Current behaviour

- Stop (server page, "Stop all servers") writes no Subscription Change, so a stopped server bills at its full rate. Code reading (E2).
- Customer docs: "On the day a server is created, resized, or stopped, each plan is billed for the hours it ran on that day." (`docs/content/billing/index.md:26`). This reads as if stopping ends billing.
- "Stop all servers" says "Data is retained, and you can restart them." and nothing about charges (`StopAllServersRow.vue:69-97`; seen on the demo site).
- "Pause billing" also stops the server (`subscriptions.py:1134-1146`). Both actions stop the machine; only one is meant to stop the bill.
- Production backup: no external team has a stopped server with an open subscription today (the 10 external stopped servers are free trials).

## What we want

While a server is stopped, it bills only its disk: disk GB × the region's Disk component rate. Starting it returns to the full locked rate. Stop, Stop all and the docs say this. Pause billing stays a separate action (#175).

**Who it affects:** Customers; support; finance (revenue from stopped servers drops to disk).

**Why it matters:** Today a customer who stops servers to save money is billed in full, and the docs say otherwise.

## Options

- A. On a status change to Stopped, write a Subscription Change that opens a disk-only segment (rate = disk GB × Disk rate, locked at that moment); on Running, reopen the full locked rate. Rating reads both.
- B. Rate stopped hours at disk-only inside the line builder from VM status history, with no new change rows.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A. It keeps Subscription Change as the one billing ledger (ADR 0010), shows on the invoice as its own line, and needs no status history.

## Acceptance criteria

- [ ] The Stop dialog offers Stop and Snapshot and release, each with its monthly cost, and says that a restore creates a new server with a new IP.
- [ ] Snapshot and release takes the snapshot, waits for it to finish, then deletes the server; billing moves from the server to the snapshot subscription with no gap and no overlap.
- [ ] A server stopped for 7 days shows a suggestion to snapshot and release, with the saving.
- [ ] A server stopped mid-day bills its full rate for the hours it ran and the disk-only rate for the rest of the day; whole stopped days bill disk only.
- [ ] Start returns to the full locked rate, not a re-priced one.
- [ ] Stop on the server page and Stop all use the same rule. A server stopped by dunning bills nothing while suspended (D-19).
- [ ] The invoice shows the stopped period as its own line, for example "acme-prod, stopped: 40 GB disk, 12 days".
- [ ] Stop and Stop all say: "A stopped server is billed for its disk only ({rate}/month). Start it to return to {full}/month."
- [ ] `docs/content/billing/index.md` and `docs/content/servers/lifecycle.md` describe the rule.
- [ ] Headroom counts the disk-only rate while stopped.
- [ ] Tests cover stop, start, stop across month end, and a resize while stopped.

## Dependencies

#175 (pause segments) first, since both add non-rate change types to rating. D-25 is provisional: build the disk-only rule first and the snapshot choice after.
