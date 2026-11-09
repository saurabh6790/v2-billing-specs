# Quick wins (D1–D7)

Each is under a day of work, needs no product decision, and changes no money logic.
All touch only `dashboard/src` (and #172 one backend label); none needs a migration.

| Issue | Change | Where | Removes |
|---|---|---|---|
| #151 | Show the setup banner only when a loaded profile is incomplete | `BillingOverviewPage.vue:97` (same rule as `BillingPaymentsPage.vue:17-18`) | "Add your billing details" on every load for paying customers |
| #152 | Error with Retry when the invoice list fails to load | `BillingInvoicesPage.vue` (use `useInvoices().error`) | "No invoices yet" on a failed load |
| #153 | Banner "Pay now" opens the owed invoice (`?invoice=`) | `OutstandingAlert.vue:85-92` | A page and a search on the pay path |
| #157 | Stack facts labels over values when narrow | `CycleFacts.vue:136-137` | "W.", "P.", "N." beside a panel |
| #154 | Pre-select country from the time zone; save on Continue | `BillingCountryField.vue:57-61` | Silent profile writes |
| #155 | Disclose the refunded card-check charge before the click | `BillingStep.vue:46-47`, `AddMethodDialog.vue:263-268` | A promise broken at sign-up |
| #170 | Remove "Email invoice" and the "Auto-recharge" switch | `BillingInvoicesPage.vue:195-201`, `WalletHistoryPanel.vue:25-31,51-57` | Controls that never work |
| #172 | Show the mandate type once | `PaymentMethodsCard.vue:81-84` or `mandates.py:400-407` | "UPI Autopay" twice |
| #158 (part) | Add Cancelled and Waived to the status filter; drop "Tax invoices are issued separately" | `InvoiceListView.vue:92-101`, `StatementCard.vue:49` | 4 of 6 external invoices unfilterable |
| #169 (part) | `aria-hidden` on decorative icons; `role="status"` on the banner; email error through `:error` | A-05, A-06, A-07, A-09 | Screen-reader noise, unlinked error |

Suggested order: #151, #152, #153, #157, #170, #158 (part), #172, #155, #154,
#169 (part).

Checkpoint 3 adds no XS item. The smallest are #178 (credit gate) and #177
(price basis), each S.
