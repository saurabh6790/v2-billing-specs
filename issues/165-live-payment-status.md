# 165 — After paying, "Waiting for your bank to confirm" never updates without a reload

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-07](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The customer cannot tell when a payment has gone through without reloading.

## Current behaviour

- Panel reloads once after Pay (`BillingInvoicesPage.vue:102-109`) and then shows a spinner with "Waiting for your bank…" (`:404-410`).
- No billing composable polls (`dashboard/src/composables`).

## What we want

The panel moves to Paid or Failed on its own.

**Who it affects:** Customers.

**Why it matters:** Repeat clicks, reloads, tickets. Frequency unknown: 0 payment attempts in production so far.

## Options

- A. Poll while in flight.
- B. Push over socket.io.
- C. Static text, no spinner.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A now, B later.

## Acceptance criteria

- [ ] While an attempt is in flight the panel refreshes every 5 s for 2 min, then every 30 s up to 15 min.
- [ ] On Paid or Failed the panel, list and banner update.
- [ ] After the window the text says it is taking longer and an email will follow.

## Dependencies

None.
