# 189 — Every server promises 1 TB of transfer a month, and nothing measures transfer

**Type:** HITL · **Milestone:** TD · **Priority:** P3 · **Size:** S · **Labels:** `type:feature` `priority:p3` `area:metering`
**Area:** dashboard/src/components/servers/PlanGroup.vue, Central Settings included_transfer_gb, Atlas
**Source:** [CB-49](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-22 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

An included amount with no meter can be neither enforced nor shown.

## Current behaviour

- “Every server includes 1 TB of transfer a month.” (PlanGroup.vue:222-226), from Central Settings included_transfer_gb = 1024.
- No transfer reading reaches Central: no Usage Rollup, no Usage Day source, no overage rate.

## What we want

Either transfer is measured per server per day into Usage Days and shown against the 1 TB, or the copy says it is fair use with no meter.

**Who it affects:** Customers; finance; infrastructure.

**Why it matters:** Low today; grows with egress-heavy customers.

## Options

- A. Read per-VM egress from Atlas daily into Usage Days; show usage; no overage charge until priced.
- B. Reword as fair use.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

B now, A when Atlas exposes per-VM egress (D-22).

## Acceptance criteria

- [ ] The plan menu copy matches whichever is chosen.
- [ ] If A: a daily Usage Day per server and a “used of included” figure on the server page.

## Dependencies

D-22. #187 for A.
