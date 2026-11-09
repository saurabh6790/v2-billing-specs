# 183 — Revenue reports count waived internal invoices as revenue; the economics reports do not

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** S · **Labels:** `type:bug` `priority:p1` `area:operator-desk`
**Area:** `central/billing/report/_revenue.py`, `mrr_and_ytd_revenue`, `cluster_wise_revenue`, `services_revenue`, `atlas_based_revenue`, `central/billing/report/_economics.py`
**Source:** [CB-44](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Two definitions of revenue sit side by side in Desk. The MRR and revenue reports include invoices that were waived, so they overstate revenue.

## Current behaviour

- `billable_line_items` selects Billable invoices with any status except Cancelled (`central/billing/report/_revenue.py:20-40`). Waived invoices are included. MRR and YTD Revenue, Cluster-wise Revenue, Services Revenue and Atlas-based Revenue use it.
- The economics reports (Unit Economics, Customer, Service and Plan profitability) set revenue to 0 for Waived (`_economics.py:73-83`).
- Production backup: the revenue base is ₹69,719.75 across 13 invoices. ₹56,151.78 of it (11 invoices, 80 %) is waived internal usage; ₹13,567.97 is owed by external teams. No invoice is paid yet.
- These reports are listed first under Revenue Reports in the billing sidebar.

## What we want

Every revenue report uses one definition: Billable, not Cancelled, not Waived, external teams only. Internal usage has its own report (Internal Usage and Waivers already exists).

**Who it affects:** Finance, founders, anyone reading MRR.

**Why it matters:** MRR shown about 5 times the amount actually billed to customers.

## Options

- A. Exclude Waived (and internal teams) in `billable_line_items`; add a filter to include them on demand.
- B. Show a separate Waived column.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, sharing one helper with `_economics.py` so the two cannot drift again.

## Acceptance criteria

- [ ] MRR and YTD Revenue, Cluster-wise, Services and Atlas-based revenue exclude Waived invoices and internal teams by default.
- [ ] One helper defines the revenue base for both report families.
- [ ] A test with a waived internal invoice and a paid external one asserts the same revenue in MRR and Unit Economics.

## Dependencies

None.
