# Findings register

Snapshot central `a95b491e` (9 Nov 2026). Paths start at the central repo root.
**Verified** = read in code and follows from it. **Inferred** = follows from code,
not seen running. Complexity: S (under a day), M (days), L (a week or more).

No P0 was found. Rationale: every money write reviewed is idempotent and audited,
customer reads are scoped by capability, and no path was found that takes or loses
money without a record. The P1s below mislead customers about money or service, or
leave failures that only an engineer can clear.

## Index

| ID | Sev | Domain | Title |
|---|---|---|---|
| F-01 | P1 | UX / limits | The spending limit shown is not the limit enforced |
| F-02 | P1 | UX / payments | The last payment method can be removed with no warning |
| F-03 | P1 | UX / errors | Pause, resume and project toggle report success on failure |
| F-23 | P1 | UX / payments | "Prepaid" means different things in the console and the backend |
| F-24 | P1 | Integration | Razorpay calls have no timeout |
| F-25 | P1 | Operations | Failed webhooks and failed ERPNext syncs end in a console session |
| F-04 | P2 | UX / copy | "No charge today" contradicts the card check and the trial banner |
| F-05 | P2 | UX / payments | No control for collection mode; banner points to a page that does not exist |
| F-06 | P2 | UX / payments | Primary method disabled while any credit exists, but Move up works |
| F-07 | P2 | UX / top-up | Top-up quick amounts are INR-sized for every currency |
| F-08 | P2 | UX / data | Overview repeats the same figures on different bases and overloads the page |
| F-09 | P2 | UX / errors | Customer-reachable errors use internal words or give no next step |
| F-10 | P2 | UX / payments | Manual Checkout "Pay now" always opens Razorpay |
| F-11 | P2 | UX / IA | Three ways to stop a server, two of them under Billing |
| F-12 | P2 | Operations | Seven operator tasks have a backend function but no screen |
| F-20 | P2 | UX / flow | Outstanding banner's "Pay now" does not open the invoice |
| F-21 | P2 | Data | Team standing is stored per subscription and read three ways |
| F-22 | P2 | UX / copy | Console says "start servers yourself"; the system restarts them |
| F-26 | P2 | Finance | Tax computed by Central and again by ERPNext, with no cross-check |
| F-27 | P2 | Finance | One unpriced meter blocks the whole team invoice |
| F-28 | P2 | Finance | Usage reported after the period is drafted has no defined path |
| F-29 | P2 | Security | One operator role for all money operations; credit API takes no reason |
| F-30 | P2 | Security | No row-level permission hooks on billing DocTypes |
| F-32 | P2 | Observability | No error reference for customers, no correlation across a payment |
| F-13 | P3 | UX / UI | Controls that do nothing: Auto-recharge switch, Email invoice |
| F-14 | P3 | Code | `MeteredServicesCard.vue` is not used |
| F-15 | P3 | UX / copy | Invoice and Statement copy: internal type, missing filters, wrong hints |
| F-16 | P3 | UX / data | Refund Pending unexplained, raw ids and timestamps shown |
| F-17 | P3 | UX / data | The browser computes money figures the server owns |
| F-18 | P3 | UX / IA | Subscriptions empty state sends to Object Storage; terminated rows linger |
| F-19 | P3 | UX / copy | Amex note is hard-coded and ignores the server's note |
| F-31 | P3 | Data | Dead and duplicated fields: Entitlement Token, `trust_tier` copy, currency as Data |
| F-33 | P3 | UX / pricing | Plan menu does not say billing is hourly or that tax is extra |

---

## P1

### F-01 The spending limit shown is not the limit enforced

- **Evidence (verified):** The This cycle card compares the limit with the subtotal
  before tax (`dashboard/src/components/billing/EstimatedCard.vue:56-62`). The Limits
  card compares it with the projected total including tax
  (`dashboard/src/composables/useSpendingLimits.ts:38,56-60`). The chart compares it
  with the measured spend so far (`SpendCard.vue:63-65`). The server-create gate
  compares it with the sum of monthly run-rates of running resources
  (`central/billing/catalog/subscriptions.py:1066-1072`). The Tiers tray defines the
  limit as "The most your team can spend in one billing cycle" (`TiersPanel.vue:111-112`).
- **Components:** Overview (3 cards), Tiers tray, plan menu, provision gate.
- **Business impact:** Support tickets ("it says I have room"); lost sales when the
  customer gives up.
- **Financial impact:** Indirect.
- **Customer impact:** Refused a server while the screen shows headroom, or the reverse.
- **Probability:** Certain for any team near its limit.
- **Severity rationale:** P1 because the customer is misled about whether they can
  buy, on the page meant to answer that.
- **Root cause:** Each card was built against the figure its endpoint already had.
- **Fix:** Return one `limit_used` figure from the server, computed by the gate's
  function, and use it in every card. Rename the tier text to "monthly run-rate of
  everything you have running".
- **Complexity:** M.

### F-02 The last payment method can be removed with no warning

- **Evidence (verified):** `delete_payment_method` deletes and re-densifies with no
  check for an outstanding invoice, collection mode or remaining methods
  (`central/billing/payments/payments.py:326-349`). The dialog says "Invoices will
  fall back to your other methods, if any."
  (`dashboard/src/components/billing/PaymentMethodsCard.vue:323`).
- **Business impact:** Avoidable dunning and suspension.
- **Financial impact:** Delayed collection.
- **Customer impact:** Servers stop two weeks later for a reason they did not see.
- **Probability:** Medium (customers swapping cards remove the old one first).
- **Severity rationale:** P1: leads to suspension without a warning at the moment of
  the action.
- **Fix:** When the method is the last chargeable one on Auto Charge, say so in the
  dialog ("Your next invoice of ~₹X on 3 Dec has nothing to charge") and offer "Add a
  new card first". Optionally block removal while an invoice is owed.
- **Complexity:** S.

### F-03 Pause, resume and project toggle report success on failure

- **Evidence (verified):** `usePayingFor.ts:99-100` and `useProjects.ts:25-26` call
  `submit()` and toast success without checking `.error`. The same codebase documents
  that `submit()` resolves on a server error (`GstStatusBanner.vue:36`,
  `useTopup.ts:112`).
- **Customer impact:** A customer who pauses billing is told it worked; the server
  keeps running and billing.
- **Financial impact:** Customer is charged for a server they think is paused; refund
  requests.
- **Probability:** Low per action; certain when the backend refuses (for example,
  Atlas cannot stop the server: `catalog/subscriptions.py:1137-1138`).
- **Severity rationale:** P1: false statement about billing state.
- **Fix:** Check `.error` after `submit()`; add a lint rule for the pattern across
  `dashboard/src`.
- **Complexity:** S.

### F-23 "Prepaid" means different things in the console and the backend

- **Evidence (verified):** Backend: Prepaid allows off-session debit of saved methods
  once credit runs out (`central/billing/payments/collection_mode.py:105-112`), and
  dunning retries Prepaid teams (`revenue/dunning.py:331-334`). Console: the Action
  Required dialog offers "Prepaid wallet: Add credits up front; your usage draws them
  down. Best for hands-off, predictable spending." (`CollectionActionBanner.vue:72-77`);
  the Payments card treats Prepaid as "credits charged first" and switches the team
  to Auto Charge when a card is made primary, because "a prepaid team comes off
  prepaid by asking for it" (`PaymentMethodsCard.vue:97-100,138-148`); its header
  comment says Prepaid means "don't auto-charge what the balance can't cover"
  (`:32-36`).
- **Customer impact:** A customer who chose Prepaid to avoid card charges can be
  charged. For an INR team that chose Prepaid at the ₹15,000 threshold, the debit
  then runs into the same mandate ceiling the choice was meant to avoid (inferred).
- **Probability:** Medium for INR teams over the threshold.
- **Severity rationale:** P1: the customer's stated choice about how money is taken
  is not what happens.
- **Fix:** Decide the meaning (ADR), then make one side match. If Prepaid allows card
  fallback, say "Credit pays first; your card is charged only if credit runs out".
- **Complexity:** S for copy, M if behaviour changes.

### F-24 Razorpay calls have no timeout

- **Evidence (verified):** `razorpay.Client(auth=...)` with no session timeout
  (`central/billing/gateways/razorpay_adapter.py:65`); no `timeout` anywhere in the
  file. PayPal (30 s) and ERPNext (30 s) set one.
- **Impact:** A hung Razorpay connection holds a web worker (customer "Pay now"
  spinner) or a billing worker (up to the 3,000 s queue timeout) during the run.
- **Probability:** Low; real during Razorpay incidents.
- **Severity rationale:** P1: the worker count is the run's only rate control, so
  hung calls stall billing for INR teams.
- **Fix:** Set a timeout on the SDK session and map it to `GatewayTimeout`.
- **Complexity:** S.

### F-25 Failed webhooks and failed ERPNext syncs end in a console session

- **Evidence (verified):** Webhooks retry 5 times, then stay Failed
  (`payments/webhooks.py:20,217-237`); no Desk action exists. ERPNext sync tries 3
  times on the hourly tick, then marks Failed and alerts
  (`ingester/erpnext_sync.py:22-23,100-131`); `retry_failed_syncs` only picks Pending.
- **Business impact:** Engineer time per incident; finance chases missing tax invoices.
- **Customer impact:** Captured payment not applied (possible dunning); missing tax
  invoice.
- **Probability:** Medium: any ERPNext outage longer than ~3 hours.
- **Severity rationale:** P1: the recovery path needs code access and scales with
  the number of affected invoices.
- **Fix:** Long-tail automatic retry (hours, then daily) for both; Desk buttons
  "Reprocess" (Webhook Event) and "Retry accounting sync" (Invoice), with a bulk action.
- **Complexity:** M.

## P2

### F-04 "No charge today" contradicts the card check and the trial banner

- **Evidence:** `BillingStep.vue:46-47` ("No charge today. We save it and check that
  it works."); `AddMethodDialog.vue:263-268` (small temporary charge, shown only while
  submitting); `TrialBillingBanner.vue:45` ("Adding a payment method ends the free
  trial today… billing starts").
- **Impact:** Trust; "why was I charged" tickets. **Probability:** every card signup.
- **Rationale:** P2: wrong statement about money, small amount, refunded.
- **Fix:** "We place a small temporary charge to check the card and refund it at
  once." Show it before the customer presses Add card. On a trial team, lead with the
  trial ending.
- **Complexity:** S.

### F-05 No control for collection mode

- **Evidence:** Only callers of `setCollectionMode` are `CollectionActionBanner.vue:37`
  and `PaymentMethodsCard.vue:111-115`; the banner says "You can switch anytime in
  Billing settings." (`:135`), and no such screen exists. Making a card primary on a
  Prepaid team silently sets Auto Charge (`PaymentMethodsCard.vue:145-147`).
- **Impact:** One-way choice; operator work (M-17); hidden mode change.
- **Rationale:** P2: customer cannot undo a billing choice without support.
- **Fix:** A "How you pay" row on Payments with the three modes, their meaning
  (after F-23) and the rule for switching back. Confirm before a card change flips
  the mode.
- **Complexity:** M.

### F-06 Primary method disabled while any credit exists

- **Evidence:** `PaymentMethodsCard.vue:125-136` (`hasCredits` disables promotion, wallet
  labelled Primary at `:232`); `PaymentMethodRowActions.vue:41-59` (Move up still offered).
- **Impact:** Confusion; a disabled option with no reason. **Rationale:** P2: blocks a
  common task for almost every new team (welcome credit).
- **Fix:** Always allow choosing the first card; label the wallet "Used first" rather
  than "Primary"; drop the disabled state.
- **Complexity:** S.

### F-07 Top-up quick amounts are INR-sized for every currency

- **Evidence:** `const presets = [1000, 5000, 10000, 25000]` (`TopupDialog.vue:42`), used
  for every currency.
- **Impact:** USD teams see $1,000–$25,000 buttons. **Rationale:** P2: obvious wrong
  amounts on a money screen. **Fix:** presets per currency from the server (or from
  the team's monthly spend). **Complexity:** S.

### F-08 Overview repeats figures and overloads the page

- **Evidence:** see [../02-domain-model/duplicated-and-low-value-data.md](../02-domain-model/duplicated-and-low-value-data.md) §1:
  current cost shown 5 times on 3 bases; "Bills in N days" and "Next invoice" are the
  same date; up to 5 stacked banners (`BillingOverviewPage.vue:92-105`); 19 API calls
  on load; Statement tab repeats the invoice list.
- **Impact:** The page does not answer its three questions at a glance.
  **Rationale:** P2.
- **Fix:** One headline (amount, charge date, method), one "attention" slot that shows
  the most urgent banner, one limit figure (F-01); move Projects and Stop all out of
  the Subscriptions card; one overview endpoint.
- **Complexity:** L.

### F-09 Customer-reachable errors use internal words

- **Evidence:** [../07-resilience/error-message-audit.md](../07-resilience/error-message-audit.md):
  "remaining headroom" (`catalog/subscriptions.py:1060`), "illegal transition"
  (`states.py:230`), "settlement source" (`payments/settlement.py:67`), "Payment
  confirmation failed." (`payments/charges.py:430,447`), 10 untranslated throws.
- **Rationale:** P2: errors are the moment the customer most needs a next step.
- **Fix:** Typed domain errors mapped to customer sentences in `api/dashboard`; Guard
  rule for banned words and missing `_()`.
- **Complexity:** M.

### F-10 Manual Checkout "Pay now" always opens Razorpay

- **Evidence:** `usePayInvoiceCheckout.ts:41`; gateway from currency default
  (`payments/charges.py:463-467`). **Probability:** low today. **Rationale:** P2:
  latent break of the only payment path for that mode. **Fix:** branch on
  `adapter_key` like `useTopup.ts`. **Complexity:** S.

### F-11 Three ways to stop a server

- **Evidence:** "Pause billing" (`PayingForCard.vue:153-160` →
  `catalog/subscriptions.py:1134-1146`), "Stop all servers" (`StopAllServersRow.vue`),
  server Stop. **Rationale:** P2: same effect, three names, two inside Billing.
- **Fix:** Rename "Pause billing" to "Stop server (stops billing)"; move Stop all to
  Servers. **Complexity:** S.

### F-12 Seven operator tasks have no screen

- **Evidence:** [../08-operations/manual-intervention-register.md](../08-operations/manual-intervention-register.md)
  M-01, M-02, M-06, M-07, M-08, M-09, M-12. **Rationale:** P2: engineer time, slower
  customer outcomes. **Fix:** Desk buttons on Invoice (Reissue, Defer dunning, Retry
  accounting sync, Charge now), Webhook Event (Reprocess), a Rerating page with
  preview. **Complexity:** M.

### F-20 Outstanding banner's "Pay now" does not open the invoice

- **Evidence:** `OutstandingAlert.vue:90-92` pushes `BillingInvoices` without
  `?invoice=`; the page supports it (`BillingInvoicesPage.vue:73-80`).
- **Rationale:** P2: extra search on the most important payment path. **Fix:** pass
  the invoice (the oldest overdue one). **Complexity:** S.

### F-21 Team standing stored per subscription and read three ways

- **Evidence:** [../02-domain-model/entity-ownership.md](../02-domain-model/entity-ownership.md);
  `api/dashboard/account.py:291`, `revenue/dunning.py:391`, `payments/settlement.py:153-161`;
  new rows always Current (`catalog/subscriptions.py:120,328`).
- **Probability:** medium (inferred). **Rationale:** P2. **Fix:** standing on
  Billing Profile. **Complexity:** M.

### F-22 Console says "start servers yourself"; the system restarts them

- **Evidence:** `PaymentSchedulePanel.vue:174-177`, `lib/dunning.ts:27` vs
  `catalog/subscriptions.py:1214-1230`. **Rationale:** P2: wrong instruction at a
  stressful moment. **Fix:** "Your servers start again automatically once the bill is
  paid. Servers you stopped yourself stay stopped." **Complexity:** S.

### F-26 Tax computed twice, no cross-check

- **Evidence:** R-01 and R-05 in [../04-financial-integrity/calculation-risks.md](../04-financial-integrity/calculation-risks.md).
- **Rationale:** P2: silent paise drift between amount charged and legal invoice.
- **Fix:** send Central tax rows; add a cross-system invariant. **Complexity:** M.

### F-27 One unpriced meter blocks the whole team invoice

- **Evidence:** `central/billing/revenue/metering.py:477-482`. **Rationale:** P2:
  revenue delay for all of a team's usage. **Fix:** bill priced lines, hold the
  meter, alert. **Complexity:** M.

### F-28 Late usage has no defined path

- **Evidence:** IR-10. **Rationale:** P2: possible unbilled usage. **Fix:** decide
  carry-forward or refusal; document. **Complexity:** M.

### F-29 One operator role; credit API takes no reason

- **Evidence:** `authz.py:29-31,74`; `api/admin/teams.py:67-69`. **Rationale:** P2:
  no separation of duties on money. **Fix:** finance role; require note in the API;
  second approval above a threshold. **Complexity:** M.

### F-30 No row-level permission hooks

- **Evidence:** `central/hooks.py` has none for billing DocTypes; issue 140.
  **Rationale:** P2 defence in depth. **Fix:** issue 140. **Complexity:** M.

### F-32 No error reference, no correlation across a payment

- **Evidence:** O-01, O-04 in [../09-security/observability-review.md](../09-security/observability-review.md).
  **Rationale:** P2: support cannot find what failed. **Fix:** return Error Log name;
  correlation id on events. **Complexity:** M.

## P3

| ID | Evidence | Fix | Cx |
|---|---|---|---|
| F-13 | `WalletHistoryPanel.vue:27-31,51-57`; `BillingInvoicesPage.vue:195-201` | Remove until built | S |
| F-14 | No import of `MeteredServicesCard.vue` anywhere | Delete | S |
| F-15 | Invoice type in subtitle (`BillingInvoicesPage.vue:186`); filter lacks Waived/Cancelled (`InvoiceListView.vue:92-101`); "Tax invoices are issued separately" (`StatementCard.vue:49`); column order (`:27-32`); "Add a card" when UPI/netbanking offered (`PaymentMethodsCard.vue:307-314`); "Outstanding" badge on an unissued invoice | Fix each copy line | S |
| F-16 | `RefundsCard.vue:35-39,75-80`; `WalletHistoryPanel.vue:98` | Theme and explain Pending; hide refund id behind "Copy reference"; format dates | S |
| F-17 | `TopupDialog.vue:55-60`; `BillingOverviewPage.vue:31-38`; `OutstandingAlert.vue:17-22`; `CycleFacts.vue:81-89` | Return figures from the API | M |
| F-18 | `PayingForCard.vue:80-88`; `PayingForTable.vue:52,64-76` | "Create a server" as the empty action; hide terminated rows behind a toggle | S |
| F-19 | `AddMethodDialog.vue:350-357` | Show `options.data.note` | S |
| F-31 | `catalog/entitlements.py:193` (no caller), `doctype/entitlement_token`; `Billing Profile.trust_tier`; `Invoice.currency` Data | Remove dead code with a patch; fetch-from field; Link types | M |
| F-33 | `PlanGroup.vue:131-133` | "Billed by the hour. Prices exclude GST." under the menu | S |
