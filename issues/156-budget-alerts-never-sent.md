# 156 — Budget alerts are saved but never sent

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:limits`
**Area:** `dashboard/src/components/billing/` (Overview cards), `central/billing/catalog/subscriptions.py`
**Source:** [CB-23](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (D-15, 9 Nov 2026):** budget alerts are needed. Build the sender; do not hide the setting.

## Problem

Customers can set a budget alert that the product promises to send, and nothing sends it.

## Current behaviour

- Dialog: "We'll notify the team once projected spend before tax crosses this." (`EstimatedCard.vue:296-299`).
- `spend_alert_threshold` is read only by `get_billing_settings` and written by `save_billing_settings` (`central/billing/api/dashboard/account.py:203-235`); no other reader in the repository.
- Placeholder "20000" in every currency (`EstimatedCard.vue:294`); toast "Billing alert saved" vs button "Budget alerts" (`:145,175`).
- 0 of 64 external teams have set one (production backup).

## What we want

An alert set by a customer is delivered once per cycle when the forecast crosses it.

**Who it affects:** Customer admins and finance contacts.

**Why it matters:** A broken promise about money, found only after an unexpected bill.

## Options

- A. Daily job + email and in-app notice.
- B. Console banner only.
- C. Hide the dialog until A ships. Rejected by None. Reads the forecast #147 and #162 settle on; can ship before them using today's before-tax forecast.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, using the Team Notification feed (in-app) and the billing email sender. Compare the threshold with the same before-tax forecast the dialog names.

## Acceptance criteria

- [ ] When the forecast before tax crosses the threshold, billing-capable members get one email and one in-app notice per cycle.
- [ ] The notice states the threshold, the forecast and a link to the breakdown.
- [ ] Placeholder and labels use the team currency and one name: "Budget alert".
- [ ] Tests cover crossing, not crossing, and once per cycle.

## Dependencies

D-15.
