# 123 — Fix what the 1 November billing day simulation found

**Type:** AFK · **Milestone:** post · **Area:** `central/billing/revenue/invoicing/`, `central/billing/platform/readiness.py`, `central/billing/insights_workbook/billing/` · **Branch where found:** `feat/billing-day-monitoring`

## Problem

On 22 Oct 2026 the October billing cycle ran on a copy of production (`prod-central-bck.local`, data 1–20 Oct) with the clock frozen at 1 Nov 2026 00:00. Outbound network was blocked, ERPNext sync was off and email was muted. The run drafted 11 invoices (₹95,786), waived 8 for our own teams (₹38,899) and left 3 open (₹56,887). There were no errors. The dashboard numbers matched the invoices. The run found the problems below.

## TODO — billing

- [ ] **The last partial day of a server is not billed.** A segment that runs a day or more bills whole days. The start is moved back to midnight, but the partial last day is dropped. Example: subscription `bbq1ve80sm` ran 16 Oct 00:00 to 17 Oct 10:06 (about 34 hours) and was billed 1 day. Bills come out about 2% below an exact calculation. Area: `revenue/invoicing/lines.py` (`_subscription_lines`, `_daily_line`).
- [ ] **A team with no Tax Profile is invoiced without GST, and nothing flags it.** Forge (TEAM-00033), India and INR, was billed ₹9,999.92 with no tax (about ₹1,800 short). Add a readiness check: a billed team has a Tax Profile. Decide whether an invoice for such a team is held.
- [ ] **Forge's billing profile is a placeholder.** The legal name is "Staging Trial" and the profile was never synced to the accounting system.
- [ ] **Three subscriptions bill nothing.** Readiness S1: plan `0p2f6ov2b1` has no locked rate and no INR rate (subscriptions `cpgcnl77ev` of TEAM-00003, `7m3c316r5e` of TEAM-00006, `apmvlgf1ka` of TEAM-00008).
- [ ] **No customer can be charged automatically.** All 46 billing profiles are Prepaid. The 3 open invoices have no active card, so ₹51,887 goes overdue on 8 Nov and enters dunning. Frappe Team (TEAM-00003) alone owes ₹43,298. Decide: mark it internal, or collect.
- [ ] **Frappe Team's welcome credit never expires.** Readiness W2 on ledger entry `613ftl6keu`.
- [ ] **Frappe Suite (TEAM-00038) got no welcome credit.** Welcome credit is now granted only when a payment method becomes active. Confirm this is the intended rule.

## TODO — monitoring and dashboards

- [ ] **Billing Day and P&L follow the database clock.** They read "the month that just closed" from `CURDATE()`, so they show September until 1 Nov and cannot show an older run. Read the latest Billing Run instead.
- [ ] **"Minutes since last progress" reports a stall after the run is complete** (299 at 06:00 on a run that finished at 01:00). Show 0 when the Billing Run is Complete.
- [ ] **"Invoices settled 11 / 11" counts unpaid invoices** (it means "out of Draft"). Rename it to Processed and show Paid separately. Add a "Credit applied" card; the ₹5,000 drawn is not visible on Billing Day.
- [ ] **"Run time" measures the gap between the two scheduler ticks** (1 hour), not the work (about 1 second). Show the work time, or say what the number means.
- [ ] **The revenue forecast draws a flat line with one month of history.** Hide it until 4 closed months exist, as its description says.
- [ ] **Readiness R2 sends one alert row per server** (31 rows while no Metal Server is linked to its Atlas host). Group it per region.
- [ ] **The Billing Run row says "drafted 0" between the ticks.** `draft_monthly_invoices` snapshots before the page jobs run. Snapshot again after drafting.
- [ ] **Unit Economics says "earned ₹0" while P&L shows ₹49,734 billed.** Both are right (earned counts paying customers only). Say so on the cards.

## Acceptance criteria

- [ ] Each billing item is fixed with a test, or closed with a recorded decision.
- [ ] A second simulated billing day on a fresh copy shows none of the monitoring items.

## Blocked by

None.
