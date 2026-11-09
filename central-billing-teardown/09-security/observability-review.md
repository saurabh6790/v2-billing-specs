# Observability review

Snapshot `a95b491e`.

## What exists

| Signal | Implementation | Evidence |
|---|---|---|
| Audit trail of state changes | One immutable `Billing Event` per transition | `states.py`, `doctype/billing_event` |
| Change history | `track_changes` on money and catalog DocTypes | DocType JSON |
| Error log | Frappe Error Log for gateway errors, Billing Run failures, sync failures | `gateways/base.py:135`; `revenue/invoicing/run.py` |
| Metrics | JSON log lines via `platform/metrics.emit`, called from the run, webhooks and alerts | `platform/metrics.py` |
| Invariant audit | 7 money checks daily | `platform/invariants.py:82-382` |
| Readiness checks | Billing Run present, drafts collected in time, accounting setup | `platform/readiness.py`; ARCHITECTURE §3 (B5) |
| Operator alerts | Hourly digest to Raven, email, or both, with per-kind and per-alert mutes and an explanation per alert (6 Nov 2026 commits) | `platform/alerts.py`, `platform/kinds.py` |
| Customer activity | Invoice activity timeline; Wallet history; Refunds card | `api/dashboard/invoices.py`; console |
| Business dashboards | 7 Insights dashboards, 41 reports | workspace |
| Webhook lag | `webhook_lag` report | `report/webhook_lag` |

## Gaps

| ID | Gap | Impact | Severity | Recommendation |
|---|---|---|---|---|
| O-01 | No tracing across a payment (console click → attempt → gateway → webhook → invoice → ERPNext). Each hop is a separate record. | Support needs 4–5 lookups per "charged but unpaid" case | P2 | Put a correlation id (the attempt name already flows as the gateway receipt) on every related Billing Event and log line, and a Desk view that follows it |
| O-02 | Few jobs emit metrics (dunning, reconciliation, mandates, ERPNext sync, expiry do not) | No baseline for "normal" job duration or volume | P3 | Wrap each scheduled entry point in `metrics.timed` |
| O-03 | No owner or runbook per alert kind | Alerts are seen, not acted on | P2 | Add owner and runbook URL to `platform/kinds.py` |
| O-04 | No customer-side error reference | Support cannot find the Error Log for "I got an error" | P2 | Return the Error Log name with unknown errors and show it in the banner |
| O-05 | No Central vs ERPNext consistency signal | Drift found late | P2 | Daily cross-system check (R-05) |
| O-06 | Console load failures are silent to operators | A broken endpoint shows "Couldn't load" to every customer with no alert | P3 | Count 5xx per billing endpoint in the metrics log |
| O-07 | No view of failed post-payment restarts | Paid customer offline unnoticed | P2 | Alert kind for restore failures |

## Visibility for each audience

| Audience | Can they see what they need? |
|---|---|
| Customer | Mostly. Bill, breakdown, schedule, dunning ladder, invoices, refunds and wallet are visible. Missing: why a limit refused them in one number (F-01), and an error reference. |
| Support | Partly. Desk forms show raw records; no single team billing view in Desk (`get_team_billing` has no screen). |
| Finance | Reports and dashboards are rich (41 reports). No reconciliation report between Central and ERPNext. |
| Engineering | Error Log, Billing Events, invariant audit, metrics lines. No traces. |
