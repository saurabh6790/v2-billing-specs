# Failure scenario matrix

The 15 scenarios from the source prompt, answered from code at `a95b491e`. No
destructive test was run. Paths under `central/billing/`.

| # | Scenario | Can it occur? | What prevents harm | How detected | State left | Auto recovery | Manual work | Impact |
|---|---|---|---|---|---|---|---|---|
| 1 | Duplicate payment callback | Yes (gateways retry) | `Webhook Event.gateway_event_id` unique; duplicate insert treated as stored; `already_applied` in handler | Event row | One Processed event | Yes | None | None |
| 2 | Delayed payment callback | Yes | Attempt stays Initiated and holds the invoice (no second charge); reconciliation asks the gateway hourly; checkout attempts failed after 24 h; late capture on a Paid invoice is refunded; on Cancelled/Waived goes to wallet | Hourly reconciliation; stale-attempt alert; `check_no_stuck_attempts` | Attempt Initiated until resolved | Yes | Operator told on Cancelled/Waived capture | Customer sees "Payment processing since…"; dunning holds Overdue while a charge is in flight |
| 3 | Payment gateway timeout | Yes | Timeout raised as `GatewayTimeout` → unknown outcome, attempt kept; Stripe SDK retries twice; customer sees "We could not reach the payment provider" (`gateways/base.py:137`) | Error Log; reconciliation | Attempt Initiated | Yes, by reconciliation | None | **Razorpay has no timeout** (IR-01): the request can hang instead |
| 4 | Duplicate invoice generation | Yes (re-run) | `Invoice.period_key` unique; `check_one_live_invoice_per_period` | Insert fails; invariant | One invoice | Yes | None | None |
| 5 | Failed invoice generation | Yes | Per-team savepoint; Billing Run Team Failed; retried hourly; DB loss re-raises | Billing Run counts; Error Log `Billing Run Failure`; readiness alerts | No invoice for that team | Yes, hourly | Fix the cause (for example, a missing rate) | Late invoice. One unpriced meter blocks the team (R-03) |
| 6 | Duplicate usage event | Yes | `Usage Rollup.idempotency_key` unique; totals model (a resend of the same total changes nothing); totals can only rise (`metering.py:287`) | Insert refused | One rollup per sequence | Yes | None | None |
| 7 | Missing usage data | Yes | Totals model means a late report catches up within the period. After the invoice is drafted, only rerating corrects it. | None automatic | Under-billed period | No | Operator rerating with no Desk screen | Revenue loss or late correction (IR-10) |
| 8 | Failed subscription activation | Yes (VM Running, subscription insert failed) | Daily `backfill_missing_subscriptions`; unique active subscription per server | Backfill result | VM runs unbilled until next daily pass | Yes, within a day | None | Up to a day unbilled |
| 9 | Concurrent subscription changes | Yes | Create holds the Team row, pending Resource Actions and the wallet `FOR UPDATE` in a fixed order | — | Serialized | Yes | None | None |
| 10 | Failed refund | Yes | Refund Failed state; Pending reconciled hourly; completed refunds rechecked daily for 30 days | Operator alert (failed refunds) | Refund Failed | No | Operator presses "Retry Failed Refunds" | Customer waits; refund visible as Failed in their Refunds card with no explanation |
| 11 | Partial database transaction | Yes | One team = one transaction; gateway order id committed before the payer acts (`charges.py` `store_gateway_order`); webhook stored before processing; mandate revoked at gateway before row deleted | Invariant audit | Consistent per unit | Yes | None | None found |
| 12 | Worker crash | Yes | Received webhooks re-enqueued after 15 min; page jobs re-run safely; Billing Run snapshot | Alerts | Unprocessed rows | Yes | None | Delay only |
| 13 | Retry exhaustion | Yes | Webhook: 5 tries then Failed. ERPNext: 3 tries then Failed. Dunning: retries then suspension. | Operator alerts | Failed rows | **No** for webhooks and ERPNext | Engineer replays in console | Unsettled paid invoice (webhook) or missing tax invoice (ERPNext) |
| 14 | External API outage | Yes | Gateways: wrapped customer message. ERPNext: invoice stays Paid, sync retried. Atlas: pause rolls back if stop fails; restore queues a start. Raven: email can be the channel. | Error Log, alerts | Pending syncs; paused-pause | Partly | ERPNext > ~3 h outage needs manual resync (IR-02) | See IR-01, IR-02, IR-06 |
| 15 | Inconsistent invoice/payment states | Yes | Single transition authority; invariant audit (7 checks) daily; hourly alerts | Invariant violations | Flagged | No | Operator investigates | Depends; no Central vs ERPNext check (R-05) |

## Scenarios the prompt did not list but the code shows

| Scenario | Evidence | Handling |
|---|---|---|
| Customer removes the last payment method with an invoice owed | `payments/payments.py:326-349` | Allowed; collection fails on the payment date and dunning starts (F-02) |
| Console action fails but shows success | `dashboard/src/composables/usePayingFor.ts:99-100`, `useProjects.ts:25-26` | Customer believes the server is paused (F-03) |
| Customer pays while a webhook settles the same invoice | `states.py:229-230` | `InvalidTransition` with a developer message reaches the customer (error audit) |
| Server does not restart after payment | `catalog/subscriptions.py:1230` | Failure title logged; customer told they can start it themselves |
