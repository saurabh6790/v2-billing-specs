# Quick wins (D1, D2)

Each is under a day of work, needs no product decision, and changes no money
logic. Together they remove six of the friction points in the pay and setup flows.

| Draft | Change | Where | Size | Removes |
|---|---|---|---|---|
| 08 | Show an error with Retry when the invoice list fails to load | `BillingInvoicesPage.vue` (use `useInvoices().error`) | XS | "No invoices yet" when the load failed |
| 10 | Banner "Pay now" opens the owed invoice (`?invoice=`) | `OutstandingAlert.vue:85-92` | XS | One page and a search on the pay path |
| 14 | Pre-select country from the time zone; save only on Continue | `BillingCountryField.vue:57-61` | XS | Silent profile writes (43 rows fit the pattern) |
| 13 | Say the card check is a small refunded charge, before the click | `BillingStep.vue:46-47`, `AddMethodDialog.vue:263-268` | XS | A promise broken at sign-up |
| 22 | Remove the disabled "Email invoice" button | `BillingInvoicesPage.vue:195-201` | XS | A control that never works |
| 15 (part) | Add Cancelled and Waived to the status filter; drop "Tax invoices are issued separately" | `InvoiceListView.vue:92-101`, `StatementCard.vue:49` | XS | Cannot filter 4 of 6 external invoices |
| 16 (part) | `aria-hidden` on decorative icons; `role="status"` on the banner; email error through `:error` | A-05, A-06, A-07, A-09 | XS | Screen-reader noise and an unlinked error |

Suggested order: 08, 10, 15 (part), 22, 13, 14, 16 (part). All touch only
`dashboard/src`; none needs a migration.
