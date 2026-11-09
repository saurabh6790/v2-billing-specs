# Strengths register (D1, D2)

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
