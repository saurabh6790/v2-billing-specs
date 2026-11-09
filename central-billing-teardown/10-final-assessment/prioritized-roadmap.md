# Prioritized roadmap

Rule 3 orders this roadmap: first establish what is broken, why, how often and at
what cost; only then change anything. So the roadmap has three stages, and a change
in stage C starts only when its stage A measurement and stage B decision are done.

No code was changed during the teardown.

## Stage A: verify and measure (read-only)

Run these against production (or a recent copy) as read-only queries or log searches.
Each row upgrades a finding from E1–E2 toward E4 and fills its frequency and cost.

| Order | Finding | Verify (is it real?) | Measure (how often, what cost) |
|---|---|---|---|
| A1 | F-03 | Read `useCall.submit` in the installed frappe-ui; reproduce a refused pause on a test site | Failed `pause_subscription` / `resume_subscription` / `set_project_enabled` requests in web logs |
| A2 | F-24 | Read the installed `razorpay` SDK for a default timeout | Billing job timeouts in Error Log; Razorpay attempts taking over 60 s |
| A3 | F-25 | — (E2 is enough to know the path exists) | Count and age of `Webhook Event` Failed with `retry_count >= 5`; `Invoice.erpnext_sync_status = Failed`; who cleared past ones (Version history) |
| A4 | F-02 | — | `Deleted Document` for Payment Method → teams left with zero Active methods and an Outstanding invoice → how many reached Overdue / Suspended |
| A5 | F-23 | Confirm intended meaning with product (no ADR found) | Off-session attempts for teams whose mode was Prepaid at the time |
| A6 | F-01 | — | Teams where a card shows headroom but `remaining_headroom` < cheapest plan; "limit" tickets |
| A7 | F-26 | — | `Invoice.total` vs ERPNext `grand_total` for every synced invoice: count and sum of differences |
| A8 | F-27 | — | `Billing Run Failure` Error Logs mentioning unpriced metered usage |
| A9 | F-28 | — | Usage Rollups created after their period's invoice |
| A10 | F-21 | — | Teams with mixed `account_standing` across subscriptions |
| A11 | All unique-key controls | `SHOW INDEX` on Invoice, Payment Attempt, Webhook Event, Usage Rollup, Credit Ledger Entry | Duplicate counts on each key column |
| A12 | Reconciliation, invariant audit, alerts | Scheduler run history for each job | Rows resolved by reconciliation; invariant violations raised and closed; alert-to-action time |
| A13 | F-12 | Ask ops which console snippets they run | Version rows on money DocTypes authored by Administrator from a console |
| A14 | F-08, F-05, F-06, F-07, F-20 | — | Product analytics or a 5-person usability test on the Overview and Payments pages |
| A15 | F-09 | — | Error messages shown to customers, by text, from web logs over 90 days |

Output of stage A: each finding updated with level, frequency and cost; severities
confirmed, raised or lowered; findings that did not reproduce closed.

## Stage B: decide

Product and finance decisions the changes depend on. See [open-questions.md](open-questions.md).

| Decision | Blocks |
|---|---|
| What Prepaid means (Q-01) | F-23, F-05 |
| What the limit caps: run-rate or monthly spend (Q-06) | F-01 |
| Late usage policy (Q-04) | F-28 |
| Remove last method while owed: warn or block (Q-05) | F-02 |
| Second approval threshold for credits and refunds (Q-11) | F-29 |
| Manual Checkout for USD and sub-threshold INR teams (Q-12) | F-05, F-10 |

## Stage C: change (on hold until A and B)

Proposed order **if stage A confirms frequency and cost**. Sizes: S under a day, M days,
L a week or more.

| Order | Change | Finding | Gate | Size |
|---|---|---|---|---|
| C1 | Check `.error` after `submit()`; lint rule | F-03 | A1 confirms resolve behaviour | S |
| C2 | Razorpay session timeout | F-24 | A2 shows no SDK default | S |
| C3 | Last-method warning (or block) | F-02 | A4 count, decision Q-05 | S |
| C4 | Align Prepaid copy and/or behaviour | F-23 | Q-01 | S/M |
| C5 | Long-tail retries and Desk actions for failed webhooks and syncs | F-25 | A3 counts non-zero | M |
| C6 | One server-computed `limit_used` | F-01 | A6, Q-06 | M |
| C7 | Copy fixes: card check, auto-restart, banner link, presets, fake controls | F-04, F-22, F-20, F-07, F-13 | None needed: behaviour fully determined by code; low risk | S each |
| C8 | Collection mode control | F-05 | Q-01, Q-12 | M |
| C9 | Customer error sentences and error reference | F-09, F-32 | A15 picks the messages that matter | M |
| C10 | Desk actions for console tasks | F-12 | A13 ranks them by use | M |
| C11 | Send tax rows to ERPNext; cross-system check | F-26 | A7 shows drift | M |
| C12 | Partial invoice when a meter is unpriced | F-27 | A8 non-zero | M |
| C13 | Team standing on Billing Profile | F-21 | A10 non-zero | M |
| C14 | Overview redesign | F-08, F-11, F-18 | A14 research | L |
| C15 | Finance role, reason, approval | F-29 | Q-11 | M |
| C16 | Permission hooks | F-30 | Q-10 | M |
| C17 | Polish and cleanup | F-14, F-15, F-16, F-17, F-19, F-31, F-33, F-10 | None (F-17 after its check) | S–M |

C7 and C17 are the only changes that need no measurement: the code fully determines
the behaviour, and the change is copy or removal of dead UI.
