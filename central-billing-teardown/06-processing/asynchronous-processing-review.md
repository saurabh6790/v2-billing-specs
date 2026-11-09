# Asynchronous processing review

Snapshot `a95b491e`.

## Practices present in code (not confirmed in operation)

| Practice | Evidence |
|---|---|
| The monthly run fans out page jobs instead of one job per team, so the scheduler tick finishes in seconds | `revenue/invoicing/run.py`; ARCHITECTURE §3 |
| One team = one transaction = one commit, so the `tabSeries` lock is held for milliseconds | same |
| Lock-wait and deadlock are retried with jitter before a team is recorded as failed | `draft_team_invoice` `CONTENTION_RETRIES` |
| A broken database connection re-raises instead of being contained, so an outage is not mistaken for a quiet run | ARCHITECTURE §3 |
| Isolated per-row processing in dunning, reconciliation, mandates, expiry, accounting retry, backfill | `platform/jobs.py` `each_isolated` and its callers |
| Webhooks are stored first and processed in a job, so a slow handler never makes the gateway retry | `payments/webhooks.py:122-162` |
| Invoice dates are set from the day the invoice opens, so a late run never shortens a customer's grace | ARCHITECTURE §3 |
| Explicit commits are few (21 outside tests, most in the run and projection) and documented | `frappe.db.commit` count |

## Weak points

| ID | Issue | Evidence | Severity | Proposed change (on hold) |
|---|---|---|---|---|
| AP-01 | **Retry exhaustion ends in a console session.** ERPNext sync (3 tries), webhooks (5 tries) and Billing Run failures each end in a Failed state with an alert, but only Billing Run failures are retried again automatically. Two of three need an engineer. | `ingester/erpnext_sync.py:100-131`; `payments/webhooks.py:217-237` | P1 | Long-tail automatic retry and a Desk action for each |
| AP-02 | **The billing worker count is the gateway rate limit.** There is no token bucket; doubling workers doubles charge rate. A Razorpay call with no timeout (IR-01) removes a worker for up to 3,000 s. | ARCHITECTURE §3; `gateways/razorpay_adapter.py:65` | P2 | Add a timeout; add a per-gateway rate limiter before raising worker counts |
| AP-03 | **The hourly job controls ERPNext backoff.** The 60/120/240 s backoff is only honoured at the next hourly tick. | `erpnext_sync.py:23,121-131` | P3 | Enqueue the retry at `erpnext_next_retry_at` instead of polling hourly, or drop the minute-level backoff |
| AP-04 | **No job owner, no runbook link.** Alerts go to one channel; nothing names who acts on each kind. | `platform/alerts.py`, Billing Settings | P2 | Add an owner and a runbook URL per alert kind (the kinds already exist in `platform/kinds.py`) |
| AP-05 | **Few processing metrics.** `platform/metrics.emit` writes JSON log lines, but only the run, webhooks and alerts call it. Dunning, reconciliation, mandates, ERPNext sync and expiry emit nothing about duration or row counts. | `platform/metrics.py`; callers: `revenue/invoicing/run.py`, `payments/webhooks.py`, `platform/alerts.py` | P3 | Emit row counts and duration per job run |
| AP-06 | **Monthly draft may have no catch-up if the monthly tick is missed (inferred).** Readiness check B5 flags a month with billing but no Billing Run, and alerts. No code path was found that starts the draft by itself afterwards. | ARCHITECTURE §3 (B5) | P2 | Let `collect_due_invoices` start the draft when the Billing Run row is missing after the 1st |

## Duplicate-execution protection by job

| Job | Can it run twice at once? | What stops a double effect |
|---|---|---|
| draft_monthly_invoices | Yes (manual run + tick) | `period_key` unique; page jobs deduplicated |
| collect_due_invoices | Yes | Settled drafts drop out; invoice lock and in-flight attempt check |
| collect_on_payment_date | Yes | In-flight check under invoice lock |
| run_dunning | Yes | Ladder state on the invoice; transition authority refuses repeats |
| retry_failed_webhooks | Yes | Unique event, `already_applied` |
| retry_failed_syncs | Yes | Per-key lock, marker on Sales Invoice |
| run_credit_expiry | Yes | Ledger booking keys (**inferred**; not traced) |
