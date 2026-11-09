# 161 — Top-up quick amounts ignore currency and the forecast, and GST is computed in the browser

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:ux` `type:technical-debt` `priority:p2` `area:wallet`
**Area:** `dashboard/src/components/billing/WalletHistoryPanel.vue`, `dashboard/src/components/TopupDialog.vue`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-32](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The top-up dialog suggests amounts unrelated to the customer's currency or spend, and its GST figure can differ from what is charged.

## Current behaviour

- Presets 1,000 / 5,000 / 10,000 / 25,000 in every currency (`dashboard/src/components/TopupDialog.vue:42`); 12 USD teams with a $100 Beginner limit.
- GST computed as `round(amount × rate) / 100` in the dialog (`TopupDialog.vue:55-60`); the server stores its own split on the order (`create_topup_order`).

## What we want

Presets fit the currency and this cycle's forecast; GST and total come from the server.

**Who it affects:** Prepaid customers.

**Why it matters:** Unhelpful amounts; a possible total mismatch at the gateway.

## Options

- A. Forecast-based presets ("Cover this month", 2 months, 3 months) + server GST.
- B. Per-currency fixed presets.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] USD presets are in a USD range and include "Cover this month".
- [ ] The GST and total shown equal the order's stored split.

## Dependencies

None.
