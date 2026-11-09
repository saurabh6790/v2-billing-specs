# Executive summary

Central Billing teardown, central `upstream/develop` at `a95b491e`, 9 Nov 2026.
Static review of code and documentation; nothing was run or changed. The user's
main question was UX: is each customer screen easy to use, is its data useful, is
anything repeated or worthless, and do errors say what to do. The other phases
(model, workflows, money, integrations, jobs, resilience, operations, security)
were covered as far as they affect that.

## 1. Overall assessment

**The billing engine is solid; the surfaces around it are not yet as good.**

The backend is built for correctness: an append-only ledger, one authority for every
status change, a unique key on every write that must not repeat, records stored
before money moves, webhooks stored before work, and a daily invariant audit. No P0
was found.

The customer console is more uneven. Single screens are often well written. The
outstanding banner, the payment schedule and the invoice receipt are good examples.
But the Overview says the same thing several times in different numbers. A few
labels promise things the system does not do, and two actions report success when
they failed. Operators have strong reports, but seven routine fixes still need an
engineer at a console.

| Area | Rating | One line |
|---|---|---|
| Financial core | Strong | Idempotent, audited, explainable lines |
| Customer UX | Mixed | Good pieces; repeated figures, contradictions, one-way choices |
| Error messages | Mixed | Gateway and decline copy good; domain errors leak internal words |
| Operations | Weak at recovery | Alerts are good; recovery after retries run out is manual |
| Integrations | Good, two gaps | Razorpay has no timeout; ERPNext and webhook retries give up |
| Security | Good structure | Capability checks everywhere; one operator role; no row-level hooks |

## 2. Critical architectural observations

1. **ERPNext is the tax authority, but Central computes the tax it charges.** Two
   engines compute GST and nothing compares them (F-26).
2. **Team standing has no home.** It is copied onto every subscription and read
   three different ways (F-21).
3. **The worker count is the gateway rate limit**, and one gateway client has no
   timeout (F-24).
4. **The browser computes money figures** that the server also owns (F-17).
5. **Leftovers from retired designs** (Entitlement Token) and duplicate fields
   remain (F-31).

## 3. Major financial risks

- Paise drift between the amount charged and the ERPNext tax invoice (F-26).
- One unpriced meter blocks a team's whole invoice (F-27).
- Usage reported after the period is drafted has no defined path (F-28).
- Customers on "Prepaid" can be charged on their card, against what the console
  told them (F-23).

## 4. Major operational risks

- Failed webhooks (after 5 tries) and failed ERPNext syncs (after 3) wait for an
  engineer (F-25).
- Invoice correction, rerating, rollup fixes and giving a customer more time before
  suspension all need a console session (F-12).
- One operator role does every money action; credits need no reason through the
  API and nothing needs a second approval (F-29).

## 5. Manual operational dependencies

18 manual tasks are listed in
[../08-operations/manual-intervention-register.md](../08-operations/manual-intervention-register.md).
Seven need an engineer (M-01, M-02, M-06, M-07, M-08, M-09, M-12). Each already has a
backend function; what is missing is a Desk action. One task (M-17, change collection
mode) exists only because the customer console has no control for it.

## 6. Customer experience issues

| Issue | Finding |
|---|---|
| The spending limit shown on three cards is compared with three different figures, and none is the one that decides if you can buy | F-01 |
| You can remove your only card with an invoice owed, and nothing warns you | F-02 |
| "Pause billing" and project on/off say they worked even when they failed | F-03 |
| "No charge today", then a temporary charge on the card | F-04 |
| A choice of how to pay, with a pointer to a settings page that does not exist, and no way back | F-05 |
| You can't choose your primary card while you have welcome credit | F-06 |
| $1,000–$25,000 quick top-up buttons for USD teams | F-07 |
| This month's cost appears five times on one page, in three different amounts | F-08 |
| "Exceeds your remaining headroom", "illegal transition" | F-09 |
| "Pay now" on the overdue banner lands on the invoice list, not the invoice | F-20 |
| "You can start your servers again" when they restart by themselves | F-22 |
| Controls that do nothing: Auto-recharge, Email invoice | F-13 |

## 7. Top 10 recommendations

| # | Recommendation | Finding | Size |
|---|---|---|---|
| 1 | Check `.error` after every `submit()`; lint for it | F-03 | S |
| 2 | Warn before removing the last chargeable payment method | F-02 | S |
| 3 | Decide what Prepaid means; make console and backend agree | F-23 | S/M |
| 4 | Add a timeout to the Razorpay client | F-24 | S |
| 5 | Long-tail retries and Desk buttons for failed webhooks and ERPNext syncs | F-25 | M |
| 6 | One server-computed "limit used" figure, used by every card and the gate | F-01 | M |
| 7 | A "How you pay" control on Payments | F-05 | M |
| 8 | Map domain errors to customer sentences; show an error reference | F-09, F-32 | M |
| 9 | Simplify the Overview: one headline, one attention slot, one limit figure, one endpoint | F-08 | L |
| 10 | Desk actions for reissue, defer dunning, charge now, rerating | F-12 | M |

The full order is in [prioritized-roadmap.md](prioritized-roadmap.md).

## 8. Unresolved questions

The five that most change the plan (all 15 are in [open-questions.md](open-questions.md)):

1. What should Prepaid mean? (Q-01)
2. Is the limit a cap on run-rate or on monthly spend? (Q-06)
3. How big is the Central vs ERPNext tax drift? (Q-02)
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
