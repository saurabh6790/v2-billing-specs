# Resilience review

Snapshot `a95b491e`. Summary of [failure-scenario-matrix.md](failure-scenario-matrix.md)
and of how failures reach people, including the customer
([error-message-audit.md](error-message-audit.md)).

## Verdict

The money core is resilient by construction: every idempotent write has a unique
key, status changes go through one authority, external calls are recorded before
the payer acts, webhooks are stored before work, and a daily audit checks the
ledger. The weak part is the **last mile of recovery**: when automatic retries run
out, the system alerts and stops, and the next step is an engineer in a console.
On the customer side, the weak part is **telling the truth about failure**: two
console actions report success on failure, and some backend errors reach the
customer in developer language.

## Strengths

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

## Weaknesses

| ID | Weakness | Evidence | Severity |
|---|---|---|---|
| RS-01 | Retry exhaustion for webhooks and ERPNext ends in a console replay | AP-01, IR-02, IR-03 | P1 |
| RS-02 | Razorpay calls have no timeout | IR-01 | P1 |
| RS-03 | Console shows success when pause/resume or project toggle fails | `usePayingFor.ts:99-100`, `useProjects.ts:25-26` | P1 (F-03) |
| RS-04 | A race between a customer action and a webhook surfaces "Invoice X: illegal transition Outstanding → Paid." | `states.py:229-230` | P2 |
| RS-05 | One unpriced meter blocks a team's whole invoice | R-03 | P2 |
| RS-06 | Paid customer's server may not restart after suspension; the customer is told to start it | `catalog/subscriptions.py:1214-1230`; F-22 | P2 |
| RS-07 | Removing the last payment method is allowed with an invoice owed | F-02 | P1 |
| RS-08 | Late usage after a period is drafted has no defined path | IR-10 | P2 |

## How a failure reaches each person

| Who | Channel | Quality |
|---|---|---|
| Customer | Alert / error banner with the server's sentence (`lib/feedback.ts`) | Good where the sentence was written for a customer; poor where it was not (see audit). No error reference id is shown, so support cannot find the log. |
| Customer | Email and in-app notices (payment scheduled, reminder, retry failed, overdue, refunded) | Good coverage of the dunning path |
| Operator | Hourly Raven/email digest by kind, with mutes | Good. Missing: owner and runbook per kind (AP-04) |
| Engineer | Error Log, billing JSON log lines | Adequate. Few jobs emit metrics (AP-05). |

## Recommendations

1. Add a timeout to the Razorpay client (one line, removes RS-02).
2. Add long-tail retries and Desk buttons for Failed webhooks and Failed ERPNext syncs.
3. Fix the two false-success paths in the console and add a lint rule: every
   `useCall` `submit()` is followed by an `.error` check, or the call has `onError`.
4. Catch `InvalidTransition` in `api/dashboard` and return "This changed while you
   were working. Refresh to see the latest."
5. Show an error reference (the Error Log name) in the customer error banner.
