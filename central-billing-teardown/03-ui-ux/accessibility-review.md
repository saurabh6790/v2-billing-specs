# Accessibility review (D1, D2)

**Method.** Markup and ARIA read in source. **Not done:** screen reader, keyboard-only
run, contrast measurement, zoom to 200 %, phone width. Each item below is a code
fact; whether it fails a WCAG success criterion in practice needs that test (D-09).
Problem ID for the set: **CB-17**.

## Findings

| # | What the code does | Where | Likely WCAG 2.2 criterion | Fix |
|---|---|---|---|---|
| A-01 | Payment-method tiles are wrapped in `<div aria-label="Payment method">` with no role. Assistive tech ignores `aria-label` on a generic `div`. | `AddMethodDialog.vue:289` | 1.3.1 Info and relationships | `role="radiogroup"` + `role="radio"`/`aria-checked` on tiles, or `role="group"` |
| A-02 | Collection-mode option buttons have no selected state for assistive tech; selection is border colour only. | `CollectionActionBanner.vue:109-129` | 4.1.2 Name, role, value; 1.4.1 Use of colour | Same pattern as A-01; add a check icon as in `AddMethodDialog.vue:316-320` |
| A-03 | Disabled "Email invoice" and "Download PDF" explain themselves only in `title`. Disabled buttons cannot take focus, so keyboard and touch users never see the reason. | `BillingInvoicesPage.vue:195-209`, `InvoiceListView.vue:154-162` | 3.3.2 Labels or instructions (by analogy) | Remove the Email button (CB-15); for PDF, keep enabled and say why on click, or show text |
| A-04 | Disabled "Primary payment method" menu item, no reason given anywhere. | `PaymentMethodRowActions.vue:41-47` | 3.3.2 | Add a description line in the menu, or hide it and explain in the card |
| A-05 | Outstanding banner is `role="alert"` and renders on every Overview load. Screen readers interrupt with it each time. | `OutstandingAlert.vue:99` | 4.1.3 Status messages (overuse) | `role="status"` or a plain region with a heading; keep `alert` for new events only |
| A-06 | Billing email error is a separate `<p>`; not linked to the input (`aria-describedby`/`aria-invalid` not set, unlike fields using `:error`). | `BillingProfileForm.vue:169-179` | 3.3.1 Error identification | Pass it to `TextInput :error` |
| A-07 | Overdue icon in the panel lacks `aria-hidden`; other decorative icons have it. | `BillingInvoicesPage.vue:226` | 1.1.1 (noise) | Add `aria-hidden="true"` |
| A-08 | Side panel: no focus move on open, no Escape to close, no `role`/label on `<aside>`. On phone width it covers the list (`absolute inset-0`). | `components/common/SidePanel.vue:14-61` | 2.4.3 Focus order; 2.1.1 Keyboard | Move focus to the title on open, close on Escape, return focus to the row; label the region |
| A-09 | Activity toggle has `aria-expanded` (good) but its chevron icon is not `aria-hidden`. | `BillingInvoicesPage.vue:329-337` | 1.1.1 (noise) | Add `aria-hidden` |
| A-10 | Activity timeline dots carry outcome by colour (green/red) only; the title text also states the event, so meaning is not lost. | `BillingInvoicesPage.vue:120-125,357-360` | 1.4.1 — passes as written | — |

## Good practice already present

- Decorative icons are mostly `aria-hidden` (`PaymentMethodsCard.vue:220-224`, `AddMethodDialog.vue` throughout).
- Add-method tiles expose `aria-pressed` (`AddMethodDialog.vue:294`).
- The how-it-works list in onboarding is a labelled `section` with an ordered list (`BillingStep.vue:130-152`).
- Success state in onboarding uses `role="status"` (`BillingStep.vue:84`).
- Tab buttons on Invoices carry `aria-label="Invoice views"` (`BillingInvoicesPage.vue:143`).
- The row action menu has a label: "Payment method actions" (`PaymentMethodRowActions.vue:72`).

## Responsive (from CSS classes only)

| Surface | Behaviour stated by classes | Risk |
|---|---|---|
| Payments page | Single column, `max-w-3xl`, `p-3 md:p-4` (`BillingPaymentsPage.vue:25-27`) | Low |
| Billing details form | `grid sm:grid-cols-2`, one column on phones (`BillingProfileForm.vue:160`) | Low |
| Collection-mode dialog | `grid sm:grid-cols-2` (`CollectionActionBanner.vue:108`) | Low |
| Invoice list + panel | Below `md`, the panel is `absolute inset-0` over the list (`SidePanel.vue:23`) | H-03: way back is the Close button only |
| Payment row | Label `truncate`; "Fallback n" and the menu never wrap (`PaymentMethodsCard.vue:243-276`) | Long labels shorten at 320 px; not seen |
