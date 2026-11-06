# 135 — Page and isolate the daily and hourly money jobs

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/revenue/dunning.py`, `central/billing/payments/reconciliation.py`, `central/billing/payments/emandate.py`, `central/billing/revenue/credits.py` (`run_credit_expiry`), `central/billing/ingester/erpnext_sync.py`, `central/billing/ingester/advance.py`

## Problem

The monthly run pages its work and isolates each unit. These jobs do not: `run_dunning`, `run_reconciliation`, `run_emandate_cycle`, `run_credit_expiry`, `retry_failed_syncs`, `sync_pending_advances`. Each loops in one job on the default queue with no savepoint and no per-item error handling, and makes gateway calls inline. One bad record stops the job for every record after it, and the same record fails first again the next day. At about 2 seconds per gateway call, the 300-second cron timeout stops dunning after about 150 invoices.

## TODO

- [ ] Reuse the page-job pattern from `revenue/invoicing/run.py`: keyset pages, one job per slice on the `billing` queue.
- [ ] Savepoint, commit, and log-and-continue per item, with a readable error on the record.
- [ ] Re-raise only when the database connection is gone, as the monthly run does.

## Acceptance criteria

- [ ] When item 2 of 3 raises, items 1 and 3 complete and item 2 carries the error.
- [ ] Dunning 5,000 invoices finishes without a cron timeout.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
