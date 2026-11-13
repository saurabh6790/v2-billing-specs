# 194 — The forecast's credits-only spend cap counts promotional credit at face value

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** S · **Labels:** `type:bug` `priority:p3` `area:projection`
**Area:** central/billing/payments/settlement.py (`effective_spend_cap`), central/billing/projection/events.py
**Source:** review of #193 part A (13 Nov 2026).

## Problem

`settlement.effective_spend_cap` gives a credits-only team `min(tier cap, wallet)` and counts promotional credit at face value. Promotional credit also pays the GST on what it covers, so it funds less pre-tax spend than its face value. The live gate (`credit_funded_headroom`) now counts it net of GST (#193 A). Only the projection simulation (`projection/events.py:184`) uses `effective_spend_cap`, so the forecast's "the platform would refuse" can differ from what the live gate does.

## What we want

`effective_spend_cap` counts promotional credit the way `credit_funded_headroom` does, so the forecast and the live gate agree.

## Acceptance criteria

- [ ] For a credits-only team with promotional credit, the forecast refuses exactly the spend the live gate refuses.
