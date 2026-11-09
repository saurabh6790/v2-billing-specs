# 156 — Budget alerts are saved but never sent

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-23](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-15 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

Customers can set a budget alert that the product promises to send, and nothing sends it.

## Current behaviour

- Dialog: "We'll notify the team once projected spend before tax crosses this." (`EstimatedCard.vue:296-299`).
- `spend_alert_threshold` is read only by `get_billing_settings` and written by `save_billing_settings` (`central/billing/api/dashboard/account.py:203-235`); no other reader in the repository.
- Placeholder "20000" in every currency (`EstimatedCard.vue:294`); toast "Billing alert saved" vs button "Budget alerts" (`:145,175`).
- 0 of 64 external teams have set one (production backup).

## What we want

An alert set by a customer is delivered once per cycle when the forecast crosses it, or the control is hidden until it can be.

**Who it affects:** Customer admins and finance contacts.

**Why it matters:** A broken promise about money, found only after an unexpected bill.

## Options

- A. Daily job + email and in-app notice.
- B. Console banner only.
- C. Hide the dialog until A ships.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

C now if A is more than a sprint away, then A (D-15).

## Acceptance criteria

- [ ] When the forecast before tax crosses the threshold, billing-capable members get one email and one in-app notice per cycle.
- [ ] The notice states the threshold, the forecast and a link to the breakdown.
- [ ] Placeholder and labels use the team currency and one name: "Budget alert".
- [ ] Tests cover crossing, not crossing, and once per cycle.

## Dependencies

D-15.
