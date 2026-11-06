# 124 — Keep the billing audit and dashboards off the hot path at scale

**Type:** AFK · **Milestone:** post · **Area:** `central/billing/platform/invariants.py`, `central/billing/platform/readiness.py`, `central/billing/platform/alerts.py`, `central/billing/insights_workbook/billing/`, `central/hooks.py` · **Branch where found:** `feat/billing-service-economics`

## Problem

Central will run 100+ bare metal machines, 10-15 services and thousands of teams. These teams create, resize, terminate and move servers all day. The billing audit and the dashboards must not slow that down.

A long `SELECT` takes no row locks in InnoDB, so it does not block a write. But it competes for CPU, disk and the buffer pool, and it holds back undo purge. A read replica does not fix this. Reports, list views and the audit all read the same tables there, and we may not have a replica.

Today:

- The hourly operator alert (`alerts.invariant_violations`, `alerts.readiness_gaps`) runs all ~25 audit checks again. The "daily" audit runs 25 times a day.
- C2, C4, I1, I5 and P2 read all history on every run. C4 loads every Credit Ledger Entry into memory. P2 limits invoices to 90 days, but sums every payment attempt.
- One audit run builds `active_segments` 4 times (B3, T1, W1, S1) and loads all Billing Profiles 6 times (B1, B2, B3, T1, T2, T3).
- R3 calls Grove and reads the full month of invoice lines on every run, so 25 times a day.
- The Insights dashboards run live SQL over full months on every page view (`use_live_connection: 1`).
- The audit runs on the `default` queue.

Estimated rows after one year (thousands of teams × 12 months):

| Table | Rows |
|---|---|
| Credit Ledger Entry | ~100k to 1M |
| Invoice Line Item | ~360k (~10 lines per invoice) |
| Invoice | ~36k |
| Subscription Change | ~50k |

## Approach

Do not run long reads. Read only what changed, compute a closed month once, and keep shared data in Redis only for the length of one run.

```text
month close (after the billing run)
  build Billing Month Summary for the closed month   -> closed-month dashboard tiles read this

daily, on daily_long
  run_invariant_audit
    shared data built once per run (Redis, TTL = one run)
    checks read only rows changed after their watermark, in pages
    findings -> Billing Red Flag rows (open / resolved, first seen, last seen)

hourly
  run_operator_alerts
    read the open Billing Red Flag rows (no recompute)
    + live: B5 run stalled, P4 stuck payments, failed webhooks, held invoices, failed refunds

weekly, on long, at a quiet hour
  full paged pass of C2 and C4   -> catches what a watermark misses
```

## TODO — compute a closed month once

- [ ] Add `Billing Month Summary`. Key it on month, region, service and who pays (team class). Store revenue, machine cost, provider cost, gross profit, yield inputs and usage not billed.
- [ ] Write it after the monthly billing run completes. Recompute one month only when a rerating run or a late invoice changes that month.
- [ ] Point the closed-month tiles on P&L, Unit Economics, Bare Metal Yield, Services and Cloud Overview at the summary. Only the current month reads live tables, and only that month's rows.

## TODO — incremental checks

- [ ] Store a watermark per check: the last `creation` or `modified` it verified.
- [ ] C4: check only the entries after the watermark, each against the entry before it, with one `LAG` query per page.
- [ ] C2, I1, I5, P2: check only the wallets, invoices and attempts changed after the watermark. Limit P2's captured sum to those invoices.
- [ ] Read in pages of ~500 rows by an indexed key. Use one short transaction per page, with a short pause between pages.
- [ ] Add the indexes the watermarks need in each controller's `on_doctype_update`.

## TODO — build shared data once per run

- [ ] Build Billing Profiles, run rates and active segments once per audit run, and pass them to the checks. Hold them in `frappe.cache` with a TTL of one run, keyed by run id.
- [ ] Do not keep this data alive across runs through doc events. That would add a second source of truth that can drift.

## TODO — store findings instead of recomputing them

- [ ] Add `Billing Red Flag`: check, team, subject, detail, expected, actual, status (Open, Resolved), first seen, last seen. Index status and check. Give the list status and check filters, and a team link.
- [ ] The audit opens new flags, updates last seen on open ones, and resolves the flags that no longer appear.
- [ ] Replace `open_red_flags` and `red_flags_checked_at` on Billing Settings with a count of open Billing Red Flag rows. Add a patch that removes the two fields.
- [ ] The hourly alert reads the open flags. Only B5, P4, failed webhooks, held invoices and failed refunds stay live. Each is a small query with a limit.
- [ ] The Open red flags tile and the Billing Invariant Violations report read Billing Red Flag.

## TODO — schedule and protect the jobs

- [ ] Move `run_invariant_audit` to `daily_long`.
- [ ] Run R3 once a day only. A closed month barely changes.
- [ ] Add a weekly full pass of C2 and C4 on `long`, paged, at a quiet hour. It catches changes that skip `modified`, for example `db.set_value(..., update_modified=False)`.
- [ ] Log how long each check takes. Give each check a time limit, so a slow check stops instead of holding a worker.

## Later, if report load still grows

Feed the billing tables into a separate analytics store, such as ClickHouse or DuckDB, which Insights can read. Point the reports and dashboards at it. Do this only if the steps above are not enough, because it adds infrastructure and a sync to operate.

## Acceptance criteria

- [ ] No audit or dashboard query reads more than one month of rows, except the weekly paged pass.
- [ ] The hourly alert finishes in under 1 second.
- [ ] Each audit check logs its duration. None takes over 30 seconds on a site with 10k servers and 1M ledger entries.
- [ ] Tests cover the watermark advance, a break the incremental pass misses and the weekly pass finds, and a flag that resolves.

## Blocked by

None.
