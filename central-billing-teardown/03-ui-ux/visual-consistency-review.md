# Visual and content consistency review (D1, D2)

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
