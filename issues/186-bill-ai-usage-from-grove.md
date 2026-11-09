# 186 — AI usage is never billed: Central thinks Grove is prepaid, Grove expects Central to bill in arrears

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:bug` `priority:p1` `area:metering`
**Area:** central/services/doctype/team_service/team_service.py, central/integrations/grove.py, central/billing/revenue/metering.py, catalog (AI Tokens plan)
**Source:** [CB-46](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-20, Grove's USD price. D-21, converted at the billing day's rate. D-26, one rate per month: the billing day's rate (1st, ERPNext Currency Exchange) is fixed for the month that starts and used by the Overview, the AI price list and that month's invoice.

## Problem

Customers use AI and no invoice ever includes it. Grove holds no money and expects Central to bill; Central skips AI on the belief that Grove is prepaid.

## Current behaviour

- Central: “AI is prepaid at Grove, so it has no subscription here.” (team_service.py:123).
- Grove README: “AI is billed in arrears by Central … Central bills what landed since its last invoice from api.usage.usage(pulled_after=, pulled_until=) … Grove holds no money.”
- GroveClient.get_usage takes pulled_after and pulled_until (central/integrations/grove.py:150-170); no billing code calls it.
- The AI Tokens Plan Category exists (Authoritative, Postpaid Overage) with no plan in production.
- Production backup: 8 active AI services (1 external since 30 Oct, 7 internal since 8 Oct), 0 AI subscriptions, 0 AI usage rows; 51 AI trial keys.
- Grove purges Usage Records after 90 days: usage from 8 Oct is gone from Grove from about 6 Jan 2027.

## What we want

Each AI team has a subscription; an hourly job stores Grove's landed usage as Usage Days (#187); the monthly invoice bills it, wallet first.

**Who it affects:** AI customers; finance.

**Why it matters:** Unbilled AI usage, a vendor cost Frappe pays with no revenue against it, and a source that deletes the evidence after 90 days.

## Options

- A. Bill Grove's USD cost per model and day (Grove rates), converted for INR (D-21).
- B. Central rates token counters with catalog rates (needs Grove to return per-counter totals).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A (D-20 decided). For INR, one rate per month (D-26 decided). First, export Grove's Revenue report per team since 8 Oct so nothing is lost to the 90-day purge, whatever is decided.

## Acceptance criteria

- [ ] Grove usage per team is stored as Usage Days by an hourly landing-window pull, at least daily, idempotent on drain id + key + day.
- [ ] Every active AI Team Service has a subscription on an AI plan; the “prepaid at Grove” rule and comment are gone.
- [ ] The monthly invoice has one AI line per model with quantity and amount, in the team currency, with the conversion rate when converted.
- [ ] An INR team's Overview shows AI usage in INR at the month's rate with the rate shown ("Rate for November: ₹84.10 per US$1"), and that month's invoice uses the same rate.
- [ ] Grove's Usage Corrections arrive as negative Usage Days.
- [ ] Usage since the first AI service is reconciled against Grove's Revenue report before the first AI invoice.

## Dependencies

#187.
