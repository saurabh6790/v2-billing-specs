# Findings register

Snapshot central `a95b491e` (9 Nov 2026). Paths start at the central repo root.

## How to read a finding

The teardown follows three rules (see [../README.md](../README.md#rules)):

1. **Evidence before conclusions.** Each finding states what was observed and where,
   then the mechanism, then how to verify it. The title is a short label, not a verdict.
2. **Code is not operation.** Each finding carries an evidence level. No finding here
   reached E4: nothing was checked against production data, logs or a running system.
3. **Measure before changing.** Each finding records what is still unknown about how
   often it happens and what it costs, with a read-only way to measure it. Proposed
   changes are listed last and are **on hold** until that measurement is done.
   Severities are **provisional** where frequency is unknown.

| Evidence level | Meaning |
|---|---|
| E1 | Code present: found by search; not traced end to end |
| E2 | Code traced: read the full path; the behaviour follows from the code |
| E3 | Test-backed: an existing automated test asserts the behaviour (not checked in this pass unless stated) |
| E4 | Operational: seen in production data, logs, or a running system. **None in this pass.** |

No P0 is recorded. This is a statement about what was observed, not a clean bill:
no path was found in the code that takes or loses money without a record, but the
controls that prevent it (unique indexes, the invariant audit, reconciliation) were
read in code (E1–E2) and not confirmed in the database or in production (E4).

## Index

| ID | Prov. sev | Level | Title |
|---|---|---|---|
| F-01 | P1 | E2 | Three spend figures are compared with the limit; the gate uses a fourth |
| F-02 | P1 | E2 | Payment method removal has no check for owed invoices or remaining methods |
| F-03 | P1 | E2 | Two console actions show success without checking for a server error |
| F-23 | P1 | E2 | "Prepaid" is described as credit-only in the console; the backend debits the card |
| F-24 | P1 | E2 | Razorpay client is built without a request timeout |
| F-25 | P1 | E2 | Webhook and ERPNext retries stop at a fixed count with no later retry or Desk action |
| F-04 | P2 | E2 | Onboarding says "No charge today"; card setup places a temporary charge |
| F-05 | P2 | E2 | No customer control for collection mode; banner points to a page that does not exist |
| F-06 | P2 | E2 | Primary-method option disabled while any credit exists; Move up still offered |
| F-07 | P2 | E2 | Top-up quick amounts are fixed numbers for every currency |
| F-08 | P2 | E2 | Overview shows current-cycle cost five times from two endpoints |
| F-09 | P2 | E1–E2 | Backend error sentences reach customers unchanged, some in internal words |
| F-10 | P2 | E2 | Manual Checkout "Pay now" always opens the Razorpay sheet |
| F-11 | P2 | E2 | Three controls stop a server, two inside Billing |
| F-12 | P2 | E1 | Ten operator functions have no Desk caller |
| F-20 | P2 | E2 | Outstanding banner navigates to the invoice list without selecting the invoice |
| F-21 | P2 | E2 | Team standing is stored per subscription and read three ways |
| F-22 | P2 | E2 | Console copy says the customer restarts servers; code restarts them |
| F-26 | P2 | E2 | Central and ERPNext each compute GST; no check compares them |
| F-27 | P2 | E2 | One unpriced metered resource raises during team invoice generation |
| F-28 | P2 | E1 | No defined handling for usage reported after its period is drafted |
| F-29 | P2 | E2 | One operator role for all money actions; credit API accepts no note |
| F-30 | P2 | E1 | No row-level permission hooks on billing DocTypes |
| F-32 | P2 | E1 | No customer-visible error reference; no correlation id across a payment |
| F-13 | P3 | E2 | Auto-recharge switch and Email invoice button have no effect |
| F-14 | P3 | E1 | `MeteredServicesCard.vue` has no importer |
| F-15 | P3 | E2 | Invoice and Statement copy issues |
| F-16 | P3 | E2 | Refund Pending unexplained; raw ids and timestamps shown |
| F-17 | P3 | E2 | Browser computes money figures the server also computes |
| F-18 | P3 | E2 | Subscriptions empty state and terminated rows |
| F-19 | P3 | E2 | Amex note hard-coded |
| F-31 | P3 | E1–E2 | Dead and duplicated fields |
| F-33 | P3 | E2 | Plan menu does not state hourly billing or tax |

---

## P1 (provisional)

### F-01 Three spend figures are compared with the limit; the gate uses a fourth

- **Observed (E2):**
  - This cycle card: limit vs subtotal before tax (`dashboard/src/components/billing/EstimatedCard.vue:56-62`).
  - Limits card: limit vs projected total with tax (`dashboard/src/composables/useSpendingLimits.ts:38,56-60`).
  - Spend chart: limit vs measured-so-far (`SpendCard.vue:63-65`).
  - Server-create gate: limit vs sum of monthly run-rates of running resources (`central/billing/catalog/subscriptions.py:1066-1072`).
  - Tiers tray text: "The most your team can spend in one billing cycle" (`TiersPanel.vue:111-112`).
- **Mechanism:** each card reads the figure its endpoint returns; nothing forces them
  to the gate's figure.
- **Potential effect:** a customer near the limit can see headroom and be refused, or
  the reverse.
- **Not established:** how many teams are near enough to the limit for the figures to
  disagree in a way that matters; whether customers have complained.
- **Measure (read-only):** for each team, compute the four figures from the same APIs
  and count teams where any card shows headroom and `remaining_headroom` is below the
  cheapest plan. Search support tickets for "limit".
- **Cost:** unknown. Support time and abandoned purchases, if it occurs.
- **Severity rationale:** P1 if the measured count is non-trivial, because the page
  meant to answer "can I buy?" answers differently from the gate.
- **Proposed change (on hold):** one server-computed `limit_used` from the gate's
  function, used by every card.

### F-02 Payment method removal has no check for owed invoices or remaining methods

- **Observed (E2):** `delete_payment_method` deletes, re-densifies priorities and
  returns; no check of outstanding invoices, collection mode or remaining methods
  (`central/billing/payments/payments.py:326-349`). The dialog text: "Invoices will
  fall back to your other methods, if any." (`PaymentMethodsCard.vue:323`).
- **Mechanism:** removal succeeds; on the payment date `collect_invoice` finds no
  chargeable method; dunning starts.
- **Not established:** whether this has happened, and how often removal leaves a team
  on Auto Charge with zero active methods.
- **Measure:** `Deleted Document` rows with `deleted_doctype = "Payment Method"`;
  for each team, check whether it had zero Active methods afterwards and an
  Outstanding Billable invoice. Then count those teams that reached Overdue.
- **Cost:** unknown. Per occurrence: dunning notices, possible suspension, a ticket.
- **Severity rationale:** P1 if any occurrence led to suspension; the warning is
  missing at the moment of the action.
- **Proposed change (on hold):** state the consequence in the dialog; optionally block
  while an invoice is owed.

### F-03 Two console actions show success without checking for a server error

- **Observed (E2):** `usePayingFor.ts:99-100` and `useProjects.ts:25-26` await
  `submit()` and call `successToast` with no `.error` check. Elsewhere the codebase
  notes that `submit()` resolves on a server error and checks `.error`
  (`GstStatusBanner.vue:36`, `useTopup.ts:112`).
- **Mechanism:** a refused pause (for example, `pause_billing` rolls back when the
  server cannot be stopped, `catalog/subscriptions.py:1137-1138`) still shows success.
- **Not established:** that frappe-ui `useCall.submit()` at the version in use
  resolves rather than rejects on error. Two code comments say so; the library source
  was not read. How often pause or project toggles fail.
- **Verify:** read `useCall.submit` in the installed frappe-ui; call
  `pause_subscription` with a subscription the user cannot manage and watch the toast.
- **Measure:** count failed `pause_subscription`, `resume_subscription`,
  `set_project_enabled` requests in web logs.
- **Cost:** per occurrence, a customer charged for a server they believe is paused.
- **Severity rationale:** P1 if verification confirms the resolve behaviour: the
  console states a false billing state.
- **Proposed change (on hold):** check `.error`; lint for the pattern.

### F-23 "Prepaid" is described as credit-only in the console; the backend debits the card

- **Observed (E2):**
  - Backend: `is_debit_allowed` returns true for Prepaid; only Manual Checkout and
    Action Required hold debits (`central/billing/payments/collection_mode.py:105-112`).
    Dunning retries Prepaid (`revenue/dunning.py:331-334`).
  - Console: "Prepaid wallet: Add credits up front; your usage draws them down"
    (`CollectionActionBanner.vue:72-77`); the Payments card comment says Prepaid means
    "don't auto-charge what the balance can't cover" (`PaymentMethodsCard.vue:32-36`) and
    making a card primary switches Prepaid to Auto Charge (`:138-148`).
- **Mechanism:** the two sides were written to different definitions.
- **Not established:** which definition is intended (no ADR found); whether any Prepaid
  team has been charged off-session.
- **Measure:** Payment Attempts with an off-session origin for teams whose
  `collection_mode` was Prepaid at the time (`Billing Event` history of the profile).
- **Cost:** unknown; per occurrence a charge the customer did not expect.
- **Severity rationale:** P1 because the customer's stated choice about how money is
  taken may not be honoured.
- **Proposed change (on hold):** decide the meaning, then align one side.

### F-24 Razorpay client is built without a request timeout

- **Observed (E2):** `razorpay.Client(auth=(...))` at
  `central/billing/gateways/razorpay_adapter.py:65`; the string `timeout` does not
  appear in the file. PayPal and ERPNext calls pass 30 s.
- **Mechanism (inferred):** the `razorpay` SDK uses `requests`; without a timeout a
  stalled connection waits until the job or request is killed.
- **Not established:** whether the installed SDK version sets its own default timeout;
  whether any Razorpay call has hung in production.
- **Verify:** read the installed `razorpay` package's request code for a timeout.
- **Measure:** Error Log for job timeouts in billing jobs that call Razorpay; Payment
  Attempts on Razorpay with `completed_at − initiated_at` over 60 s.
- **Cost:** unknown; a hung call removes one billing worker for up to the queue
  timeout (3,000 s).
- **Severity rationale:** P1 only if verification shows no SDK default; otherwise P3.
- **Proposed change (on hold):** a session timeout.

### F-25 Webhook and ERPNext retries stop at a fixed count with no later retry or Desk action

- **Observed (E2):** webhooks retried while `retry_count < 5` (`payments/webhooks.py:20,217-237`);
  ERPNext sync marks `Failed` at 3 attempts and alerts (`ingester/erpnext_sync.py:22-23,100-117`);
  `retry_failed_syncs` selects only `Pending` (`:121-131`). No JS for Webhook Event;
  Invoice JS has no sync button.
- **Mechanism:** after the last try, the row stays Failed until someone acts in a console.
- **Code is not operation:** the hourly retry jobs exist (E2). Whether they run on
  schedule and succeed in production was not checked (no E4).
- **Not established:** how many webhooks or syncs end Failed; how long they stay Failed;
  how they are cleared today.
- **Measure:** `Webhook Event` with `status = Failed and retry_count >= 5`;
  `Invoice` with `erpnext_sync_status = Failed`; for both, age distribution and how
  many later became Processed / Synced (and by whom, from Version history).
- **Cost:** engineer time per row; for webhooks, a captured payment not applied.
- **Severity rationale:** P1 if counts are non-zero and clearing needs code access.
- **Proposed change (on hold):** long-tail retry and Desk actions.

## P2 (provisional)

Each entry: observed (with level), mechanism, what is not established, how to measure,
and the change held until then.

| ID | Observed | Mechanism | Not established / measure | Change on hold |
|---|---|---|---|---|
| F-04 | `BillingStep.vue:46-47` "No charge today"; `AddMethodDialog.vue:263-268` temporary charge shown only while submitting; `TrialBillingBanner.vue:45` "billing starts". (E2) | Copy written per component | Ticket count for "charged" at signup; card-check charge volume from Stripe/Razorpay dashboards | Copy before submit |
| F-05 | Only callers of `setCollectionMode`: `CollectionActionBanner.vue:37`, `PaymentMethodsCard.vue:111-115`; banner "You can switch anytime in Billing settings" (`:135`); no such route in `router/index.ts`. (E2) | Control never built | Count teams in Manual Checkout / Prepaid / Action Required and how they got there (`Billing Event`); tickets asking to switch | Mode control |
| F-06 | `PaymentMethodsCard.vue:125-136,232`; `PaymentMethodRowActions.vue:41-59`. (E2) | `hasCredits` gates promotion | Teams with balance > 0 and ≥ 2 methods | Allow choice |
| F-07 | `TopupDialog.vue:42` `[1000, 5000, 10000, 25000]` for all currencies. (E2) | Constant | USD `Top-up Order` amounts: share equal to a preset vs typed | Per-currency presets |
| F-08 | Current cost shown in `EstimatedCard.vue:196`, `PayingForCard.vue:67-70`, `LimitsCard.vue:78-85`, `SpendCard.vue:63-78`, `CycleBreakdownPanel.vue:80-83`; 5 banners `BillingOverviewPage.vue:92-105`; 19 calls on load. (E2) | Cards built separately | Customer behaviour needs research (session recordings or a usability test); load time from browser timings | Redesign after research |
| F-09 | See [error audit](../07-resilience/error-message-audit.md); 185 throws, 10 untranslated. (E1 for reachability of each message, E2 for the text) | Server text shown as is (`lib/feedback.ts`) | Which messages customers actually see: count by message text in web/Error logs | Typed errors, mapping |
| F-10 | `usePayInvoiceCheckout.ts:41`; gateway from currency `payments/charges.py:463-467`. (E2) | Frontend assumes Razorpay | Manual Checkout teams by currency, and the default gateway per currency | Branch on adapter |
| F-11 | `PayingForCard.vue:153-160`, `StopAllServersRow.vue`, server Stop; `catalog/subscriptions.py:1134-1146`. (E2) | Separate features | Usage counts of each control | Rename / move |
| F-12 | No JS/TS/Vue/JSON caller for `preview_rerating`, `apply_rerating`, `correct_rollup_terms`, `get_team_billing`, `subscribe_team_service`, `set_default_gateway`, `reissue_invoice`, `defer_dunning`, `sync_invoice`, `retry_payment`. (E1: search only) | Backend before UI | How often each is run from a console (ask ops; Version author = Administrator on affected rows) | Desk actions |
| F-20 | `OutstandingAlert.vue:90-92` vs `BillingInvoicesPage.vue:73-80`. (E2) | Query param not passed | Click-through from banner to payment | Pass invoice |
| F-21 | `api/dashboard/account.py:291` (first row), `revenue/dunning.py:391` (anchor), `payments/settlement.py:153-161` (any row); new rows Current (`catalog/subscriptions.py:120,328`). (E2) | Standing copied per row | Teams whose subscriptions have mixed `account_standing` | Standing on profile |
| F-22 | `PaymentSchedulePanel.vue:174-177`, `lib/dunning.ts:27` vs `catalog/subscriptions.py:1214-1230`. (E2) | Copy predates auto-restart | Tickets after reactivation | Copy |
| F-26 | Central tax `revenue/tax.py:86`; ERPNext rows from template `ingester/gst.py:47-56`; payment entry `min(...)` `ingester/erpnext_sync.py:323`. (E2) | Two engines | Compare `Invoice.total` with Sales Invoice `grand_total` for all synced invoices | Send tax rows; cross-check |
| F-27 | `revenue/metering.py:477-482` throws on any unpriced meter. (E2) | All-or-nothing | Error Log `Billing Run Failure` with "unpriced metered usage" | Partial billing |
| F-28 | Totals only rise (`revenue/metering.py:287`); rerating is the only correction (`api/admin/rerating.py`). (E1: no path for late reports found by search) | Policy not defined | Usage Rollups created after their period's invoice `creation` | Policy |
| F-29 | `authz.py:29-31,74`; `api/admin/teams.py:67-69` `note=None` accepted. (E2) | Single operator role | Credit adjustments with empty note; size distribution | Finance role, reason, approval |
| F-30 | No billing entries in `central/hooks.py` permission hooks. (E1) | API-only model | Users with Desk access and a team (Q-10) | Hooks (issue 140) |
| F-32 | `lib/feedback.ts` shows message only; no correlation field on Billing Event found. (E1) | Not built | Ticket time-to-resolve for payment issues | Error reference, correlation id |

## P3 (provisional)

| ID | Observed (level) | Measure first? | Change on hold |
|---|---|---|---|
| F-13 | `WalletHistoryPanel.vue:27-31,51-57`; `BillingInvoicesPage.vue:195-201` (E2) | No: behaviour is fully determined by code | Remove |
| F-14 | No importer of `MeteredServicesCard.vue` (E1) | No | Delete |
| F-15 | `BillingInvoicesPage.vue:186`; `InvoiceListView.vue:92-101`; `StatementCard.vue:27-32,49`; `PaymentMethodsCard.vue:307-314` (E2) | No | Copy |
| F-16 | `RefundsCard.vue:35-39,75-80`; `WalletHistoryPanel.vue:98` (E2) | No | Copy, formatting |
| F-17 | `TopupDialog.vue:55-60`; `BillingOverviewPage.vue:31-38`; `OutstandingAlert.vue:17-22`; `CycleFacts.vue:81-89` (E2) | Yes: compare browser top-up total with gateway amount on recent top-ups | Return from API |
| F-18 | `PayingForCard.vue:80-88`; `PayingForTable.vue:52,64-76` (E2) | No | Copy, filter |
| F-19 | `AddMethodDialog.vue:350-357` (E2) | No | Use server note |
| F-31 | `catalog/entitlements.py:193` no caller outside tests/demo (E1); `Billing Profile.trust_tier`; `Invoice.currency` Data (E2) | No | Cleanup patch |
| F-33 | `PlanGroup.vue:131-133` (E2) | No | Copy |

## Controls read but not confirmed

Rule 2 applies to the strengths too. These controls exist in code; none was confirmed
in the database or in production.

| Control | Code evidence (level) | How to confirm it is effective |
|---|---|---|
| Unique `Invoice.period_key`, `Payment Attempt.idempotency_key`, `Webhook Event.gateway_event_id`, `Usage Rollup.idempotency_key`, `Credit Ledger Entry.gateway_payment_id` | DocType JSON `unique: 1` (E1) | `SHOW INDEX` on each table on production confirms a unique index exists; count duplicates on the column |
| Webhook signature check before processing | `payments/webhooks.py:80` (E2) | Count `Webhook Event` rows created without a valid signature (should be zero; invalid ones are not stored) and gateway dashboard delivery failures |
| Hourly reconciliation | `payments/reconciliation.py` (E1) | Scheduler logs show it ran each hour; count attempts it resolved (`resolved_by = Reconciliation`) |
| Daily invariant audit | `platform/invariants.py` (E2) | Scheduler logs; history of violations raised and how each was closed |
| Hourly operator alerts | `platform/alerts.py` (E1) | Raven channel history; time from alert to action |
| Money records refuse manual edits | `platform/records.py`, `central/hooks.py:215-230` (E2) | A test exists? (check `tests/`); Version rows on money DocTypes authored by a person |
| Per-team isolation in the monthly run | `revenue/invoicing/run.py` (E2, from ARCHITECTURE and code) | Billing Run Team Failed rows per month and whether they later succeeded |
