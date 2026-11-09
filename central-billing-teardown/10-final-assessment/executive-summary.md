# Executive summary

Central Billing teardown, central `upstream/develop` at `a95b491e`, 9 Nov 2026.
The main question was UX: is each customer screen easy to use, is its data useful,
is anything repeated or worthless, and do errors say what to do. The other phases
(model, workflows, money, integrations, jobs, resilience, operations, security) were
covered as far as they affect that.

**What this is and is not.** A static review of code and documentation. Nothing was
run, changed or checked against production data. Every finding is at evidence level
E1 (code found) or E2 (code traced); none is E4 (seen in production). Frequencies
and costs are therefore **not yet established**, and severities are provisional.
Stage A of the [roadmap](prioritized-roadmap.md) is the measurement that settles them.

## 1. Overall assessment

| Area | What the code shows (level) | What is not established |
|---|---|---|
| Financial core | Unique keys on every write that must not repeat; one function for every status change, with an immutable event; append-only ledger; a daily audit of 7 money invariants; every invoice line carries its arithmetic. (E1–E2) | Whether the unique indexes exist in the production database; whether the audit and reconciliation run daily and hourly and what they have found |
| Customer UX | Several screens give clear, specific copy (outstanding banner, payment schedule, invoice receipt). The Overview shows the current cost five times from two endpoints; some copy contradicts the backend; two actions show success without checking for errors. (E2) | How customers actually use the pages; how often the contradictions cause tickets |
| Error messages | Gateway and card-decline messages are written for customers and keep raw gateway text out of the UI. Domain errors reach the customer unchanged, some naming internal concepts. (E1–E2) | Which messages customers actually see, and how often |
| Operations | 41 reports, 7 dashboards, hourly alerts with mutes. Ten operator functions have no Desk caller; failed webhooks and failed ERPNext syncs have no retry after their last attempt. (E1–E2) | How often operators run console fixes; how many rows sit in Failed today |
| Integrations | PayPal and ERPNext calls set a 30 s timeout; the Razorpay client is built without one. (E2) | Whether the installed Razorpay SDK has its own default; whether any call has hung |
| Security | Every customer endpoint reviewed checks a team capability; every guest endpoint checks a signature or pilot credential. One operator role does every money action; no row-level permission hooks. (E1–E2) | Who holds Desk access; whether credits without a note have been made |

No P0 is recorded. That means no path was found in the code that takes or loses
money without a record. It does not mean the protecting controls are confirmed in
operation.

## 2. Architectural observations

Each is an observation with its evidence; impact needs measuring.

1. **Two tax engines.** Central computes GST on the invoice (`revenue/tax.py:86`);
   ERPNext computes its own rows from a template (`ingester/gst.py:47-56`). No check
   compares the totals (F-26).
2. **Team standing is copied per subscription** and read three ways
   (`api/dashboard/account.py:291`, `revenue/dunning.py:391`, `payments/settlement.py:153-161`) (F-21).
3. **The billing worker count is the only gateway rate control**, and the Razorpay
   client has no timeout set (F-24).
4. **The browser recomputes money figures** the server also computes (F-17).
5. **Retired designs remain in code** (Entitlement Token; `issue_token` has no caller) (F-31).

## 3. Potential financial risks

Stated as mechanisms; none measured.

- Central and ERPNext invoice totals can differ when the two tax roundings differ (F-26). Measure: A7.
- One unpriced metered resource raises during a team's invoice generation, so no
  invoice is made for that team (F-27). Measure: A8.
- Usage reported after its period is drafted has no defined path (F-28). Measure: A9.
- A customer who chose "Prepaid" can still be charged on their card (F-23). Measure: A5.

## 4. Potential operational risks

- Failed webhooks (after 5 tries) and failed ERPNext syncs (after 3) stay Failed
  until someone acts in a console (F-25). Measure: A3.
- Ten operator functions, including invoice reissue, rerating and deferring dunning,
  have no Desk caller (F-12). Measure: A13.
- One operator role for all money actions; the credit API accepts no note (F-29).

## 5. Manual operational dependencies

18 manual tasks are listed in
[../08-operations/manual-intervention-register.md](../08-operations/manual-intervention-register.md).
Seven appear to need a console (M-01, M-02, M-06, M-07, M-08, M-09, M-12), based on
the absence of a Desk caller (E1). How often each is done is unknown (A13).

## 6. Customer experience observations

| Observation (E2) | Finding |
|---|---|
| The limit is compared with three different spend figures on three cards; the gate uses a fourth | F-01 |
| Removing a payment method has no check for owed invoices or remaining methods | F-02 |
| Pause/resume and project toggle show success without checking for an error | F-03 |
| Onboarding says "No charge today"; card setup places a temporary charge | F-04 |
| The how-to-pay banner points to a settings page that does not exist; there is no control to switch back | F-05 |
| The primary-card option is disabled while any credit exists | F-06 |
| Top-up quick amounts are the same numbers in every currency | F-07 |
| This month's cost appears five times on the Overview | F-08 |
| Some backend errors reach customers in internal words | F-09 |
| The overdue banner's "Pay now" opens the list, not the invoice | F-20 |
| Copy says customers restart their servers after paying; the code restarts them | F-22 |
| Two controls have no effect (Auto-recharge, Email invoice) | F-13 |

## 7. Top 10 next steps

Measurement first, then the changes that need none.

| # | Step | Kind | Finding |
|---|---|---|---|
| 1 | Confirm `useCall.submit` behaviour; count failed pause/resume calls | Verify + measure | F-03 |
| 2 | Check the Razorpay SDK for a default timeout; search for hung calls | Verify + measure | F-24 |
| 3 | Count Failed webhooks and Failed ERPNext syncs, and how they were cleared | Measure | F-25 |
| 4 | Count teams left with no chargeable method and an owed invoice | Measure | F-02 |
| 5 | Decide what Prepaid means; count off-session charges to Prepaid teams | Decide + measure | F-23 |
| 6 | Compare Central and ERPNext invoice totals | Measure | F-26 |
| 7 | Confirm unique indexes and job run history in production | Verify | Controls |
| 8 | Usability test of Overview and Payments (5 people) | Measure | F-08, F-05, F-06 |
| 9 | Copy fixes whose behaviour is fully determined by code | Change (no measurement needed) | F-04, F-07, F-13, F-20, F-22 |
| 10 | Rank console tasks by how often ops run them | Measure | F-12 |

## 8. Unresolved questions

The five that most change the plan (all 15 are in [open-questions.md](open-questions.md)):

1. What should Prepaid mean? (Q-01)
2. Is the limit a cap on run-rate or on monthly spend? (Q-06)
3. How big is the Central vs ERPNext tax difference? (Q-02)
4. What happens to late usage? (Q-04)
5. How often do webhooks and ERPNext syncs end Failed today? (Q-08, Q-09)

## Diagrams

| Diagram | Where |
|---|---|
| High-level architecture | [../01-discovery/system-overview.md](../01-discovery/system-overview.md) |
| Customer-to-cash lifecycle | [../03-workflows/customer-to-cash.md](../03-workflows/customer-to-cash.md) |
| Subscription, invoice, payment, refund, payment method, top-up, webhook lifecycles | [../03-workflows/lifecycle-diagrams.md](../03-workflows/lifecycle-diagrams.md) |
| Integration and data flow | [../03-workflows/lifecycle-diagrams.md](../03-workflows/lifecycle-diagrams.md#integration-data-flow) |
| Screen map | [../01-discovery/screen-map.md](../01-discovery/screen-map.md) |
