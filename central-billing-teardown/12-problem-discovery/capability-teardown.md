# Capability teardown (Workstream A)

Business capabilities in D1 and D2, each with the nine points the brief asks for.
"Current behaviour" is from code (E2); numbers are from the production backup at
3 Nov 2026 (E4, [measurements.md](measurements.md)). This file is an addition to the
requested set: Workstream A had no named file.

---

## D1 Billing setup and payment methods

### A1. Billing identity (legal name, address, country, currency, GSTIN)

1. **Purpose.** Tax-correct invoices (ERPNext issues them), a fixed billing currency,
   GST input credit for Indian businesses.
2. **Users.** Customer admin; support (corrections); finance (tax).
3. **Current behaviour.** One form in a dialog (`BillingProfileForm.vue`). Country sets
   currency until money moves, then the currency locks (`account.py:114-130`). India
   needs a GST state; GSTIN is checked against it (`billing_profile.py:461-480`).
   Completing the profile assigns a trust tier, tax profile and welcome credit
   (`account.py`, `save_billing_profile` → `provision_billing_profile`). Onboarding
   asks country first and may save it from the browser time zone (`BillingCountryField.vue:57-61`).
4. **Works well.** Partial saves name missing fields (ST-05). GSTIN state rule is
   explained before saving. India ⇔ INR is enforced on the server.
5. **Inefficient or broken.** Country saved with no user action (CB-12). Country
   still editable after lock (CB-13). Vague lock text (CB-13, CB-14).
6. **Missing.** Nothing structural for D1.
7. **Impact.** 9 of 64 external profiles are complete. 43 of the 55 incomplete rows
   hold only country = India. Whether low completion is a problem depends on
   D-08: the product asks for details only when credit runs out.
8. **Recommend.** Save country only on an explicit choice; disable country after
   lock everywhere, with the server's reason. See solution-alternatives §CB-12.
9. **Evidence.** CB-12, CB-13; measurements §D1.

### A2. Payment methods and their order

1. **Purpose.** Collect off-session without the customer, and fall back when one
   method fails so a decline does not end in suspension.
2. **Users.** Customer admin; support.
3. **Current behaviour.** Payments page lists credits, then methods in charge order,
   with Primary / Fallback labels (`PaymentMethodsCard.vue`). Add: tile picker →
   Stripe card field in the dialog, or Razorpay sheet for UPI/RuPay
   (`AddMethodDialog.vue`). Card check is a small refunded charge (`:263-268`).
   Remove asks for confirmation, with no check for owed invoices (CB-02).
4. **Works well.** ST-01, ST-02, ST-07, ST-08, ST-16.
5. **Inefficient or broken.** **Setups mostly do not finish, and the failures vanish
   (CB-21):** 6 external teams tried, 2 finished; 13 of 18 rows are Pending
   Validation. Two controls for one effect (CB-05). "Add a card" label for a
   UPI-capable dialog (CB-14). "No charge today" contradicted (CB-11).
6. **Missing.** See a failed setup and retry (MC-02); clean-up of old pending rows
   (MC-09); expiry warning (MC-08).
7. **Impact.** No active method means no welcome credit and no paid servers. This is
   where new customers are lost, on the numbers available.
8. **Recommend.** Measure why setups stop (abandon vs decline vs lost confirmation)
   per gateway; show failed or unfinished setups on the Payments page with a
   retry; resolve ignored failure events to Failed. See solution-alternatives §CB-21.
9. **Evidence.** CB-21, CB-02, CB-05, CB-11, CB-14; measurements §D1.

### A3. Collection mode (how a team pays)

1. **Purpose.** Decide whether invoices are charged automatically, paid by hand, or
   drawn from prepaid credit; INR e-mandates above ₹15,000 need a customer choice.
2. **Users.** Customer admin; finance (cash timing); support.
3. **Current behaviour.** Stored on Billing Profile (`collection_mode`). Customers see
   it only through the INR Action-required dialog. Making a card primary on Prepaid
   switches to Auto Charge silently (`PaymentMethodsCard.vue:138-157`). The engine
   debits Prepaid teams' methods when credit runs short (`collection_mode.py:105-112`).
4. **Works well.** The Action-required dialog explains each option in plain words
   with who it suits (`CollectionActionBanner.vue:63-78`).
5. **Inefficient or broken.** No place to see or change it (CB-03). Screen and engine
   disagree on Prepaid (CB-04).
6. **Missing.** MC-01.
7. **Impact.** All 64 external teams are Prepaid. 4 of them hold a method the engine
   may charge while the screen says it will not.
8. **Recommend.** First decide what Prepaid means (D-01). Then show the mode on the
   Payments page with a change control that states the consequence, as the
   payment-day form does (ST-13).
9. **Evidence.** CB-03, CB-04; measurements §Who is billed.

### A4. Payment day

1. **Purpose.** Let a customer align the charge with their cash cycle (day 1–7).
2. **Users.** Customer admin.
3. **Current behaviour.** A select in the Payment schedule tray; changes per cycle are
   capped; days after the retry window get one retry, stated before saving
   (`PaymentDayForm.vue`).
4. **Works well.** ST-13, ST-14.
5. **Inefficient.** Reached only from a calendar icon on the Overview, not from Payments
   (navigation-audit).
6. **Missing.** —
7. **Impact.** Not measured (payment_day distribution not queried).
8. **Recommend.** List it on the Payments page with collection mode (CB-03).
9. **Evidence.** navigation-audit §Discoverability.

---

## D2 Invoices and collection

### B1. Invoice history and documents

1. **Purpose.** Let customers find, check and download what they were billed;
   give finance a statement.
2. **Users.** Customer admin, customer accounts team; finance.
3. **Current behaviour.** Invoices page: list (period, status, amount, PDF) with
   search, status filter, date presets; Statement tab with CSV; Refunds card.
   Receipt side panel with lines, tax, credits, total, activity.
4. **Works well.** ST-10, ST-12; the receipt groups lines by server.
5. **Inefficient or broken.** Load failure shows "No invoices yet" (CB-06). Totals do
   not add up when credits or TDS apply (CB-01). Filter misses Cancelled and
   Waived (CB-16). Statement repeats the list and misstates tax invoices (CB-16).
   Internal type names (CB-14). Dead Email button (CB-15).
6. **Missing.** Email or forward; extra recipients (MC-06).
7. **Impact.** 4 of 6 external invoices are Cancelled and cannot be filtered. Two
   are ₹0.01 and ₹0.26: noise the customer has to read past (D-07).
8. **Recommend.** Fix the list error state; make the receipt add up line by line;
   filter all statuses; fold Statement into the list as an export.
9. **Evidence.** CB-01, CB-06, CB-14, CB-15, CB-16.

### B2. Paying an invoice

1. **Purpose.** Collect what automatic collection did not: overdue, Manual Checkout,
   above the mandate limit.
2. **Users.** Customer admin; finance (cash).
3. **Current behaviour.** Banner "Pay now" → Invoices list → panel → "Pay ₹X now".
   Auto/Prepaid teams: immediate off-session charge. Manual Checkout: Razorpay
   sheet. Then "Waiting for your bank…" until a manual reload.
4. **Works well.** ST-09, ST-11; the button names the amount.
5. **Inefficient or broken.** Banner does not open the invoice (CB-08). No confirmation
   naming the method (CB-09). Waiting state never updates (CB-07). Manual Checkout
   always uses Razorpay (CB-10). Race errors in internal words (CB-20).
6. **Missing.** Live status (MC-05).
7. **Impact.** Not yet measured in use: 0 payment attempts in the backup. Both
   external owed invoices were held for accounting sync, so no one could pay (CB-22).
8. **Recommend.** Deep-link the banner, add a one-step confirm that names the method,
   poll while in flight. Resolve the accounting hold first: until invoices are
   issued, none of this is reachable.
9. **Evidence.** CB-07–CB-10, CB-20, CB-22.

### B3. Operator corrections and collections support

1. **Purpose.** Fix billing mistakes and help a customer pay.
2. **Users.** Support, finance.
3. **Current behaviour.** Invoice form: Cancel, Refund Part, Cancel and Refund, Retry
   Failed Refunds. Team form: Grant / Adjust Credit, Suspend, Archive, Impersonate.
   No team billing page.
4. **Works well.** ST-15.
5. **Inefficient.** Lists by DocType; no team view (CB-18). Cancel without a summary of
   effects (CB-19).
6. **Missing.** MC-03, MC-04.
7. **Impact.** Support cannot see CB-21 or CB-22 cases without querying lists by hand.
8. **Recommend.** A Desk "Team billing" page built on `get_team_billing`; Invoice
   actions for charge again, payment link, release hold.
9. **Evidence.** CB-18, CB-19.

---

## D3 Cost visibility and limits (checkpoint 2)

### C1. This cycle's cost and forecast

1. **Purpose.** Tell the customer what this month will cost and when they pay.
2. **Users.** Customer admin, finance contact.
3. **Current behaviour.** Overview: This cycle card (headline with tax, subtotal + tax,
   "Bills in N days", bar against the limit), facts card (wallet, method, next
   invoice, next payment), Subscriptions with "this cycle before tax", Spend chart,
   Breakdown tray (`EstimatedCard.vue`, `CycleFacts.vue`, `PayingForCard.vue`,
   `SpendCard.vue`, `CycleBreakdownPanel.vue`).
4. **Works well.** ST-17, ST-18, ST-20.
5. **Inefficient or broken.** Five places, two sources, with and without tax (CB-26).
   Setup banner on every load (CB-27). Facts labels collapse beside a panel (CB-28).
6. **Missing.** —
7. **Impact.** Every Overview visit. In production most teams show ₹0 so far (E4).
8. **Recommend.** One cost figure with one tax basis on the page; the others link to it.
9. **Evidence.** CB-26, CB-27, CB-28.

### C2. Spending limits and tiers

1. **Purpose.** Cap exposure for new customers; raise the cap as they pay.
2. **Users.** Customer; support (overrides); finance (risk).
3. **Current behaviour.** Limit shown on two cards and a tray, compared with different
   figures; the gate checks a run-rate (CB-25). Tier progress shows paid invoices and
   amount paid against the next tier.
4. **Works well.** ST-21.
5. **Inefficient or broken.** Three bases, plus "headroom" in the refusal (CB-25).
6. **Missing.** MC-14.
7. **Impact.** 61 of 64 teams on Beginner (₹8,300 / $100). Refusals will be common
   and the screen will not explain them.
8. **Recommend.** Decide the one figure the limit means (D-13), use it in the gate,
   the cards and the refusal text.
9. **Evidence.** CB-25; measurements §D3.

### C3. Budget alerts

1. **Purpose.** Warn before spend surprises the customer.
2. **Users.** Customer admin, finance contact.
3. **Current behaviour.** A dialog saves a threshold; the button tints near and over.
   Nothing sends a notification (CB-23).
4. **Works well.** ST-24 (state on the button).
5. **Inefficient or broken.** The promise in the dialog is not kept.
6. **Missing.** MC-10.
7. **Impact.** 0 teams use it yet (E4).
8. **Recommend.** Send it, or remove the dialog until it can be sent.
9. **Evidence.** CB-23.

## D4 Wallet and credits (checkpoint 2)

### C4. Top-up (Prepaid advance)

1. **Purpose.** Under the decided Prepaid rule, a top-up is an advance that settles
   invoices first; the method pays the rest.
2. **Users.** Customer admin; finance (advance, GST on advance).
3. **Current behaviour.** Dialog with amount, quick amounts, instrument picker, GST and
   total; Stripe card in-dialog or Razorpay sheet; wallet credited after
   confirmation (`TopupDialog.vue`, `create_topup_order`).
4. **Works well.** ST-22, ST-23.
5. **Inefficient or broken.** Presets ignore currency (CB-32). GST computed twice
   (CB-33). An unfinished top-up leaves no trace for the customer (CB-21 scope).
6. **Missing.** Auto-recharge (MC-11).
7. **Impact.** 1 top-up order in production, never completed (E4).
8. **Recommend.** Currency-aware presets tied to the forecast ("Cover this month: $X");
   GST from the server; show unfinished top-ups.
9. **Evidence.** CB-21, CB-32, CB-33.

### C5. Wallet history and credit expiry

1. **Purpose.** Show where credit came from, where it went, and what will expire.
2. **Users.** Customer; support.
3. **Current behaviour.** Side panel with the latest 50 entries, raw notes and
   timestamps, receipts for top-ups; one expiry hint on the Overview.
4. **Works well.** Receipts per top-up; GST paid shown per entry.
5. **Inefficient or broken.** Raw timestamps and internal notes (CB-29); no per-entry
   expiry (CB-31); 50-entry cap (CB-30); inert auto-recharge (CB-15).
6. **Missing.** MC-12, MC-13.
7. **Impact.** 32 promotional grants with expiry in production; 0 debits yet.
8. **Recommend.** Customer-facing descriptions separate from operator notes; dates
   formatted; expiry on each grant; paging and export.
9. **Evidence.** CB-29, CB-30, CB-31.
