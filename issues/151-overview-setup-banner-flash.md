# 151 — Overview shows "Add your billing details" on every load, even for teams with complete details

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** XS · **Labels:** `type:bug` `priority:p2` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-27](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Every paying customer is briefly told billing is not set up.

## Current behaviour

- Seen on `demo-billing.localhost` on two loads for a complete team.
- `BillingOverviewPage.vue:97` shows the banner when `!complete`, which is false until the profile loads.
- The Payments page fixed the same case (`BillingPaymentsPage.vue:17-18`).

## What we want

The banner shows only when a loaded profile is incomplete.

**Who it affects:** All customers.

**Why it matters:** Alarm and doubt on the most visited billing page.

## Options

- A. Use the Payments page rule: `!!profile && !complete`.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A complete team never sees the banner, including during load.
- [ ] An incomplete team still sees it after load.

## Dependencies

None.
