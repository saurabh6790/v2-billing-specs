# 176 — Stopping a server keeps full billing, while the docs say billing follows the hours it ran, and "Stop" and "Pause billing" look like the same action

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `priority:p2` `area:subscriptions`
**Area:** `dashboard/src/components/billing/StopAllServersRow.vue`, `dashboard/src/components/billing/SubscriptionRowActions.vue`, server Stop dialog, `docs/content/billing/index.md`
**Source:** [CB-35](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-16, D-17 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

Customers have two ways to turn a server off and are not told that one of them keeps billing.

## Current behaviour

- Stop (server page, "Stop all servers") writes no Subscription Change, so a stopped server bills at its full rate. Code reading (E2).
- Customer docs: "On the day a server is created, resized, or stopped, each plan is billed for the hours it ran on that day." (`docs/content/billing/index.md:26`). This reads as if stopping ends billing.
- "Stop all servers" says "Data is retained, and you can restart them." and nothing about charges (`StopAllServersRow.vue:69-97`; seen on the demo site).
- "Pause billing" also stops the server (`subscriptions.py:1134-1146`). Both actions stop the machine; only one is meant to stop the bill.
- Production backup: no external team has a stopped server with an open subscription today (the 10 external stopped servers are free trials).

## What we want

Each way of turning a server off says what happens to the bill, and the docs match the engine.

**Who it affects:** Customers; support.

**Why it matters:** A customer who stops servers to save money is billed in full and finds out on the invoice.

## Options

- A. Stopped servers are billed (capacity is held); say so on Stop and Stop all, fix the docs; keep Pause as the way to stop billing.
- B. Stopped servers are not billed; merge Pause into Stop.
- C. Stopped servers bill disk only.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

Decide D-16 and D-17 first. A is the smallest change if capacity is reserved while stopped.

## Acceptance criteria

- [ ] Stop and Stop all state the billing effect in one sentence.
- [ ] `docs/content/billing/index.md` describes what stopping does to the bill, matching the engine.
- [ ] If Pause stays, its row action and dialog say how it differs from Stop.

## Dependencies

D-16 (is a stopped server billed?), D-17 (keep Pause as a separate action?). #175 first.
