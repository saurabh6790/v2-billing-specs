# Strengths register (D1–D4)

What works and should be kept when other things change. Each item is read in code
(E2). None was seen running in a browser. Keep the pattern, and copy it to the
screens that lack it.

| ID | Strength | Where | Copy it to |
|---|---|---|---|
| ST-01 | **One ordered payment list that matches the engine.** Credits, then methods labelled Primary / Fallback n, in the order the charge path walks them. The card text says so: "Invoices use credits first, then payment methods in the order shown." | `PaymentMethodsCard.vue:113-131,206` | — |
| ST-02 | **The second line of a method row adds information** (expiry, or the per-debit mandate ceiling) instead of repeating the type. | `PaymentMethodsCard.vue:76-94` | Invoice rows (show the paid-by method) |
| ST-03 | **Read-only users get guidance, not dead buttons.** "Billing is not set up yet. Ask a team admin to add billing details." | `BillingPaymentsPage.vue:39-48` | Invoice panel Pay for viewers |
| ST-04 | **Setup ends with a way to pay.** Saving details opens the add-method dialog in the same flow, on both onboarding and the Payments page. | `PaymentMethodFlow.vue:14-21` | — |
| ST-05 | **Partial saves name what is missing:** "Saved, but these fields are still required: …" | `BillingProfileForm.vue:128-134` | All multi-field forms |
| ST-06 | **Server messages are kept, not replaced by "Something went wrong".** Each composable rethrows the `useCall` error so the server's sentence reaches the screen. | `useAddPaymentMethod.ts:68-71`, `usePayInvoiceCheckout.ts:34-35`, `PaymentMethodsCard.vue:141` | — (but see CB-20: the sentences need work) |
| ST-07 | **Blocked choices say why.** A blocked UPI tile shows the backend's reason or "Not available for your account yet." | `AddMethodDialog.vue:103-109` | Disabled "Primary payment method" (CB-05) |
| ST-08 | **The gateway sheet is not trapped behind our modal.** The dialog closes before Razorpay opens, then reopens with the choice restored on cancel. | `AddMethodDialog.vue:57-79` | — |
| ST-09 | **Double payment is blocked three times:** the banner switches to "View invoice" while an attempt is in flight; the panel replaces Pay with a waiting state; the server answers `attempt_in_flight`. | `OutstandingAlert.vue:82-90`, `BillingInvoicesPage.vue:394-410`, `usePayInvoice.ts:44-48` | — |
| ST-10 | **Unissued invoices explain themselves:** "This invoice is being prepared. You can pay it once it is issued." PDF buttons say "The PDF is ready once the invoice is issued". | `BillingInvoicesPage.vue:389-393,206` | Add when it will be ready (CB-22) |
| ST-11 | **The outstanding banner tells the story of the debt**: amount, which invoice, failed attempts, and the consequence ("Pay now to keep your servers running"). | `OutstandingAlert.vue:59-80` | — |
| ST-12 | **Invoice rows lead with the period**, and search matches both period and number. Date presets match how people look ("Last 6 months"). | `InvoiceListView.vue:40-44,64-74,129-140` | — |
| ST-13 | **The payment-day form states its consequences** (one retry only, suspension day) before saving, and how many changes remain. | `PaymentDayForm.vue:72-91` | Collection mode screen (CB-03) |
| ST-14 | **Team switches drop drafts**, so one team's choice is never saved to another. | `PaymentDayForm.vue:34-45`, `BillingInvoicesPage.vue:82-86` | — |
| ST-15 | **Operator corrections ask for a reason and show limits.** Refund Part states what is left and how much the card can take back; Adjust Credit shows the team currency and refuses without one. | `invoice.js:63-91`, `team.js:169-194` | Cancel invoice (CB-19) |
| ST-16 | **Removal confirms in place.** A failed remove keeps the dialog open with the reason inline, not a vanishing toast. | `ConfirmDialog.vue:5-9`, `PaymentMethodsCard.vue:159-176` | — |

## Checkpoint 2: D3 cost visibility and limits, D4 wallet and credits

| ID | Strength | Where | Copy it to |
|---|---|---|---|
| ST-17 | **The wallet hint states the Prepaid rule in plain words:** "Covers N% of this cycle, card pays the rest". It matches the decided rule exactly. | `CycleFacts.vue:81-89` | Payments page, Action-required dialog (CB-04) |
| ST-18 | **Estimated lines are marked and explained** in the cycle breakdown ("Already owed", "Estimated remainder"). | `CycleBreakdownPanel.vue:52-83`, `ChargeBreakdown.vue:213-217` | Invoice panel for in-cycle views |
| ST-19 | **Invoice lines show what changed and when** (seen): a resized server shows each size with its time window and monthly rate. | `ChargeBreakdown.vue` | — |
| ST-20 | **Load failures are local and recoverable** (seen): "Couldn't load · Retry" on one fact, the rest of the page works. | `CycleFacts.vue:219-220`, `SpendCard.vue:210-211` | Invoices list (CB-06) |
| ST-21 | **Tier ladder is visible with what qualifies for the next tier** and a support link for more. | `TiersPanel.vue`, `useSpendingLimits.ts:79-148` | — |
| ST-22 | **Top-up shows GST and the total before the gateway opens** and says credit arrives after payment goes through (seen). | `TopupDialog.vue:386-399` | — |
| ST-23 | **The wallet is credited only after the gateway confirms**; the GST split is stored on the order before the payer acts. | `central/billing/api/dashboard/invoices.py` (`create_topup_order`) | — |
| ST-24 | **Budget alert button shows its state**: tint and tooltip for near and crossed. | `EstimatedCard.vue:95-120` | (once alerts are sent, CB-23) |
| ST-25 | **The GSTIN banner says what the customer loses and gives two fixes** (seen). | `GstStatusBanner.vue:60-77` | — |

## Checkpoint 3: D5 subscriptions, D6 purchase, D7 back office

| ID | Strength | Where | Copy it to |
|---|---|---|---|
| ST-26 | **The plan menu disables plans over the limit and says why**, on the same pre-tax figure as the gate. | `PlanGroup.vue:114,149-152` | Resize dialog, #147 |
| ST-27 | **A team behind on payment can still downsize**: only the added rate passes the payment gate. | `subscriptions.py:634-641` | — |
| ST-28 | **Creates reserve headroom under a lock**, so two creates cannot spend the same room. | `subscriptions.py:1044-1072`, `resource_actions.py:549-564` | — |
| ST-29 | **Subscriptions are sorted by cost**, answering "where is the money going". | `usePayingFor.ts:56-80` | — |
| ST-30 | **Stop all asks the team name to confirm** and reports partial failures. | `StopAllServersRow.vue:37-97` | — |
| ST-31 | **Billing Settings can test itself**: "Send Test Alert" and "Check Accounting Setup". Alerts can be muted per kind while a fix is in progress. | `billing_settings.js`, `alerts.py:437-445` | — |
| ST-32 | **Suspend states its reason stays internal** ("The owner's email does not include it"). | `team.js:96-100` | Grant and Adjust Credit dialogs (CB-29) |
| ST-33 | **Adding a card works in place** (seen): test card saved and listed with brand, last four, expiry and its fallback rank within about 15 seconds, no reload. | `AddMethodDialog.vue` | — |
| ST-34 | **"Invoices use credits first, then payment methods in the order shown."** The Payments header states the decided Prepaid rule (seen). | Payments page | Action-required dialog (#150) |
| ST-35 | **The Billing Simulator uses the invoicing engine** (`api/admin/projection.*`), so a fix to rating (#175, #176) shows in projections with no second change. | `page/billing_simulator` | — |
