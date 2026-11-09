# Visual and content consistency review (D1–D4)

From source: class names, components and copy. Rendered appearance (colour
contrast, spacing as drawn) was not seen; see
[screen-inventory.md](screen-inventory.md#how-the-screens-were-inspected).

## Components and patterns

| Pattern | Consistent | Inconsistent | ID |
|---|---|---|---|
| Error display | Forms show an inline red `Alert` with a title + server message (`BillingProfileForm.vue:151-156`, `PaymentDayForm.vue:137-142`, `AddMethodDialog.vue:126-132`, `CollectionActionBanner.vue:101-107`) | Row actions use a toast (`PaymentMethodsCard.vue:153-155,190-191`); Pay uses a toast (`usePayInvoice.ts:32-33`) | — (acceptable split: dialogs inline, row actions toast) |
| Load failure | Payments page: red Alert + Retry (`BillingPaymentsPage.vue:28-34`); payment day: Alert + Retry (`PaymentDayForm.vue:124-130`) | Invoices page: none, shows empty state (CB-06) | CB-06 |
| Field errors | `:error` prop on TextInput/Combobox (`BillingProfileForm.vue:165,186,198,205`) | Email error is a separate `<p class="text-ink-red-7">` (`:176-178`) | CB-13, CB-17 |
| Selectable cards | Add-method tiles: `aria-pressed`, check icon, `border-outline-gray-6` when selected (`AddMethodDialog.vue:292-300`) | Collection-mode cards: no `aria-pressed`, no icon, `border-outline-gray-4` (`CollectionActionBanner.vue:109-120`) | CB-17 |
| Status badges | `invoiceTheme(status)` for invoices (`lib/status`) | Payment method status uses an untheme'd Badge with the raw status (`PaymentMethodsCard.vue:258`); GSTIN badge is red for every non-Active status (`BillingDetailsCard.vue:85-89`) | CB-14 |
| Dates | `shortDate`, `billingPeriod`, `formatDate` | Activity date cut with `split(',')[0]` on a server string (`BillingInvoicesPage.vue:129`) | — (P3, note) |
| Money | `money()` everywhere, `tabular-nums` on amounts | — | — |
| Destructive confirm | `ConfirmDialog` with red theme (`PaymentMethodsCard.vue:320-329`) | Operator Cancel invoice uses a plain `frappe.prompt` with "Confirm" (`invoice.js:44-61`) | CB-19 |

## Visual hierarchy (from markup)

- **Payments page.** Order: setup alert → Payment methods → Billing details
  (`BillingPaymentsPage.vue:28-54`). The primary task (methods) comes first. The
  collection mode, which decides whether methods are used at all, is absent (CB-03).
- **Payment row.** Label (`text-base text-ink-gray-9`), detail (`text-sm
  text-ink-gray-5`), then "Primary / Fallback n" right-aligned in the same grey as
  the detail (`PaymentMethodsCard.vue:262-264`). The one word that says which card
  pays is the least visible text in the row. Suggest a badge for Primary only.
- **Receipt panel.** Deductions are green (`text-ink-green-5`) and sit above the
  bold Total that does not subtract them (`BillingInvoicesPage.vue:270-295`). Colour
  and position both say "subtracted"; the number says otherwise (CB-01).
- **Invoice panel title** is the invoice number; the list leads with the period
  (`BillingInvoicesPage.vue:177-182` vs `InvoiceListView.vue:129-133`). The person
  clicked "October 2026" and sees "INV-…". Put the period in the title and the
  number in the subtitle.

## Terminology

One idea, several names, in D1/D2:

| Idea | Names on screen | Where |
|---|---|---|
| The amount to pay now | "Total", "Amount", "Pay ₹X now", "₹X overdue" | panel, list, button, banner (CB-01) |
| Payment method | "card", "payment method", "method", tile names | `PaymentMethodsCard.vue:308`, dialog title (CB-14) |
| Collection mode | "Billing settings", "how you pay", "Prepaid wallet", "Prepaid credits" | `CollectionActionBanner.vue:135,74`, `PaymentMethodsCard.vue:227` (CB-03) |
| Payment provider | "gateway", "bank", "payment provider" | toasts, panel, error mapping (CB-14) |
| Not yet issued | "being prepared", "ready once the invoice is issued" | panel, PDF tooltip (consistent enough) |

Proposed glossary for customer copy: **amount due**, **payment method**, **how
you pay**, **your bank**. Never: gateway, collection mode, settlement, provision,
transition, Billable, Cost Report.

## Density

- Payment rows (`p-3`, 2 lines) and invoice rows (`py-2.5`, 2 lines) are calm and
  scannable.
- The invoice panel is 24 rem wide on desktop (`SidePanel.vue:23`). Long server
  names in `ChargeBreakdown` truncate. Not checked visually.

## Checkpoint 2: seen in the browser (1440 px, demo data)

| Observation | Where | ID |
|---|---|---|
| Facts card labels truncate to "Payment met…", "Next paymen…"; with a side panel open they become "W.", "P.", "N." | `CycleFacts.vue:136-137` | CB-28 |
| Wallet entries show "2026-01-01 00:00:00", while every other money date is formatted | `WalletHistoryPanel.vue:98` | CB-29 |
| "UPI Autopay" twice on one method row | `PaymentMethodsCard.vue:81-84` | CB-24 |
| "90,000 Nos used", "0 Nos" on invoices and Subscriptions | plan unit | CB-14 |
| Invoice panel subtitle "Billable · October 2026 · Due 7 Nov 2026" | `BillingInvoicesPage.vue:186` | CB-14 |
| Internal VM id in monospace beside each server on the receipt | `ChargeBreakdown.vue` | CB-14 |
| Headline ₹0.00 "nothing billed yet this cycle" above servers listed at ₹1,500–₹6,000/mo with "—" | Overview | CB-26 |
| Budget alert placeholder "20000" in every currency; toast "Billing alert saved" vs button "Budget alerts" | `EstimatedCard.vue:145,175,294` | CB-23 |

### Tax basis

| Surface | Basis |
|---|---|
| This cycle headline | with tax |
| This cycle bar, "over limit", budget alert | before tax |
| Limits card "Spend per cycle" | with tax |
| Subscriptions header | before tax |
| Spend chart, this cycle | measured so far |
| Server-create gate | monthly run-rate of running subscriptions |

One idea, six bases. Pick one for the limit (D-13) and label every other figure
with its basis.
