# 70 — Console Billing › Invoices (list + detail panel)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Port the Invoices surface from `dashboard/src/pages/billing/Invoices.vue` →
`console/` (TypeScript), in the **split list + detail panel** layout from the new
design (list left, ~480px detail right — not a modal).

- **List**: month · invoice no · issued date · amount · status badge.
- **Detail panel**: status, billed-to, line items (resource · plan · qty × rate),
  subtotal, GST, credits applied, total; **Email invoice** / **Download PDF**
  actions; **Recipient & language** editor in the header.
- Pay action for unpaid invoices (`pay_invoice` / `pay_invoice_checkout` /
  `confirm_invoice_checkout`).

Endpoints: `list_invoices`, `get_invoice`, `get_billing_settings` /
`save_billing_settings` (recipient + language).

## Acceptance criteria

- [ ] List + detail panel render; selecting a row loads its detail.
- [ ] Line items, GST, credits-applied, total match the stored invoice.
- [ ] Recipient + language edit persists; pay-invoice flow completes (via #67).
- [ ] `vue-tsc` clean; uses `useFrappeList` + console split-view layout.

## Blocked by

- #66, #67 (for pay flow)

## Notes

- **Grounding gaps:** Email invoice + Download PDF routes — confirm before wiring those buttons.
- Currency/amounts via `lib/format`; line humanising mirrors `_describe_line` on the server.
