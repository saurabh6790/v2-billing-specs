# Resilience review

Snapshot `a95b491e`. Summary of [failure-scenario-matrix.md](failure-scenario-matrix.md)
and of how failures reach people, including the customer
([error-message-audit.md](error-message-audit.md)).

## Summary

What the code shows (E1–E2): every write that must not repeat has a unique key in
its DocType, status changes go through one function, external calls are recorded
before the payer acts, webhooks are stored before work, and a daily job audits the
ledger. None of these was confirmed in production (no E4): the unique indexes, job
run history and audit results still need checking (roadmap A11, A12).

Where the code stops: when the last automatic retry for a webhook or an ERPNext
sync fails, the row stays Failed and an alert is raised; no code retries it again
and no Desk action exists (F-25). On the customer side, two console actions show
success without checking for an error (F-03), and some backend errors reach the
customer unchanged in internal words (F-09). How often any of this happens is not
yet measured.

## Controls present in code (not confirmed in operation)

| Area | Evidence |
|---|---|
| Duplicate prevention on every money write | unique keys: Invoice `period_key`, Payment Attempt `idempotency_key`, Webhook Event `gateway_event_id`, Usage Rollup `idempotency_key`, Credit Ledger `gateway_payment_id` |
| Commit before the outside world acts | `payments/charges.py` `store_gateway_order`; `ensure_gateway_customer` |
| Revoke at the gateway before deleting locally | `payments/payments.py:326-344` |
| Transition authority + immutable event | `states.py` |
| Money records refuse manual edits | `platform/records.py`; `central/hooks.py:215-230` |
| Daily invariant audit + hourly alerts with mutes | `platform/invariants.py`; `platform/alerts.py` |
| Failure isolation in jobs | `platform/jobs.each_isolated` |
| Customer-facing gateway errors are generic; raw text to Error Log | `gateways/base.py:130-143` |

## Gaps found in code

| ID | Weakness | Evidence | Severity |
|---|---|---|---|
| RS-01 | Retry exhaustion for webhooks and ERPNext ends in a console replay | AP-01, IR-02, IR-03 | P1 |
| RS-02 | Central sets no timeout on Razorpay calls; SDK default not checked | IR-01 | P1 provisional |
| RS-03 | Console shows success when pause/resume or project toggle fails | `usePayingFor.ts:99-100`, `useProjects.ts:25-26` | P1 (F-03) |
| RS-04 | A race between a customer action and a webhook surfaces "Invoice X: illegal transition Outstanding → Paid." | `states.py:229-230` | P2 |
| RS-05 | One unpriced meter blocks a team's whole invoice | R-03 | P2 |
| RS-06 | Paid customer's server may not restart after suspension; the customer is told to start it | `catalog/subscriptions.py:1214-1230`; F-22 | P2 |
| RS-07 | Removing the last payment method is allowed with an invoice owed | F-02 | P1 |
| RS-08 | Late usage after a period is drafted has no defined path | IR-10 | P2 |

## How a failure reaches each person

| Who | Channel | Quality |
|---|---|---|
| Customer | Alert / error banner with the server's sentence (`lib/feedback.ts`) | Depends on the sentence: some are written for customers, some name internal concepts (see audit). No error reference id is shown. |
| Customer | Email and in-app notices (payment scheduled, reminder, retry failed, overdue, refunded) | Notices exist in code for each dunning step; delivery not checked |
| Operator | Hourly Raven/email digest by kind, with mutes | Exists in code; no owner or runbook per kind (AP-04); delivery and response time not checked |
| Engineer | Error Log, billing JSON log lines | Few jobs emit metrics (AP-05) |

## Proposed changes (on hold until measured)

1. Add a timeout to the Razorpay client, if the SDK has no default (RS-02).
2. Add long-tail retries and Desk buttons for Failed webhooks and Failed ERPNext syncs.
3. Fix the two false-success paths in the console and add a lint rule: every
   `useCall` `submit()` is followed by an `.error` check, or the call has `onError`.
4. Catch `InvalidTransition` in `api/dashboard` and return "This changed while you
   were working. Refresh to see the latest."
5. Show an error reference (the Error Log name) in the customer error banner.
