# Manual intervention register

Every place where billing needs a person, at `a95b491e`. "Console" means a bench
console or `bench execute` by an engineer. Frequency is estimated from code paths
only; no production data was read.

| ID | Task | Trigger | Who | Tool | Est. frequency | Complexity | Risk if not done | Recommendation |
|---|---|---|---|---|---|---|---|---|
| M-01 | Replay a webhook that failed 5 times | Operator alert: failed webhooks | Engineer | Console | Rare; spikes with gateway incidents | High | Captured payment never settles the invoice; customer may be dunned | Desk "Reprocess" action (issue 131) |
| M-02 | Re-push an invoice to ERPNext after 3 failed syncs | Operator alert: failed accounting syncs | Engineer | Console `sync_invoice` | Every ERPNext outage over ~3 h; per invoice | High | No tax invoice for a paid customer | Long-tail auto retry + button + bulk action |
| M-03 | Refund (full or part) | Customer asks; dispute decision | Operator | Invoice buttons | Weekly | Low | — | Fine. Add a finance role (issue 137) |
| M-04 | Retry a failed refund | Operator alert: failed refunds | Operator | Invoice button | Rare | Low | Customer not refunded | Fine |
| M-05 | Goodwill or corrective credit | Support decision | Operator | Team › Grant / Adjust Credit | Weekly | Low | — | Add amount limits or second approval above a threshold |
| M-06 | Correct an invoice before payment | Wrong price or usage | Engineer | Console `reissue_invoice` | Monthly | High | Customer charged the wrong amount on the payment date | Invoice button "Reissue" while Outstanding and unpaid |
| M-07 | Re-rate a past period | Wrong rate discovered | Engineer | Console `preview_rerating` / `apply_rerating` | Rare | High | Revenue or overcharge stays wrong | Desk page with preview |
| M-08 | Correct a usage rollup's terms | Wrong allowance or rate | Engineer | Console `correct_rollup_terms` | Rare | High | Wrong metered line | Button on Usage Rollup with reason |
| M-09 | Give a customer more time before suspension | Support decision | Engineer | Console `defer_dunning` | Weekly at scale | High | Customer suspended despite agreement | Invoice button "Defer dunning" with reason and date |
| M-10 | Decide termination after suspension | `termination_due` alert | Operator | Manual | Per suspended team | Medium | Unpaid resources kept forever | Fine as a human decision; add a queue view |
| M-11 | Add a missing rate when an unpriced meter blocks an invoice | Billing Run Failure | Operator | Catalog Rate | Rare | Medium | Team not invoiced | Bill the rest, hold only the meter (R-03) |
| M-12 | Start the monthly draft if the tick was missed | Readiness B5 alert | Engineer | Console | Rare | Medium | Month not billed | Auto catch-up (AP-06) |
| M-13 | Restart a server that did not come back after payment | Error Log title "Could not start server…" | Operator / customer | Server page | Rare | Low | Paying customer offline | Customer banner + ops alert |
| M-14 | Raise a spending limit | Customer asks | Operator | Billing Profile override (reason required) | Weekly | Low | Lost sales | Fine |
| M-15 | Mark a team internal | Internal team | Operator | Billing Profile (reason required) | Rare | Low | — | Fine |
| M-16 | Fix accounting setup gaps | Setup-needed block, "Check Accounting Setup" | Finance | ERPNext | One-off per company | Medium | Sync fails | Fine (consume-only by design) |
| M-17 | Switch a customer's collection mode back to Auto Charge | Customer asks; no console control | Operator | Billing Profile field | Weekly at scale | Low | Customer stuck in Manual Checkout | Customer control on Payments (F-05) |
| M-18 | Investigate a failed card setup | Customer reports | Operator | Payment Method, Billing Event | Daily at scale | Medium | Lost signups | Issue 125 |

## Summary

- **Seven tasks need an engineer in a console** (M-01, M-02, M-06, M-07, M-08, M-09,
  M-12). Each has the backend function already; what is missing is a Desk action.
- **Two tasks exist only because the customer console lacks a control** (M-17
  collection mode, and part of M-13).
- **No task needs a second approval**, including credits of any size (M-05).
