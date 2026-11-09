# After paying, "Waiting for your bank to confirm" never updates without a reload

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-07](../../04-problem-discovery/problem-register.md) |
| Labels | `type:ux`, `priority:p2`, `area:invoices` |
| Priority | P2 |
| Complexity | S |

## Problem
The customer cannot tell when a payment has gone through without reloading.

## Current behaviour
- Panel reloads once after Pay (`BillingInvoicesPage.vue:102-109`) and then shows a spinner with "Waiting for your bank…" (`:404-410`).
- No billing composable polls (`dashboard/src/composables`).

## Expected outcome
The panel moves to Paid or Failed on its own.

## Affected users
Customers.

## Evidence
See the current behaviour above; full detail in [CB-07](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Repeat clicks, reloads, tickets. Frequency unknown: 0 payment attempts in production so far.

## Solution options
- A. Poll while in flight.
- B. Push over socket.io.
- C. Static text, no spinner.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
A now, B later.

## Acceptance criteria
- [ ] While an attempt is in flight the panel refreshes every 5 s for 2 min, then every 30 s up to 15 min.
- [ ] On Paid or Failed the panel, list and banner update.
- [ ] After the window the text says it is taking longer and an email will follow.

## Dependencies
None. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
