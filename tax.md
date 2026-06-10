# Tax

## Purpose

Model tax correctly as **three structurally different mechanics** — not one rate field — so GST
works, SEZ is auditable, and TDS withholding doesn't poison the paid-state. On the ERPNext base this
is **almost entirely native configuration** rather than custom code: GST/SEZ ride **Sales Taxes and
Charges**, TDS rides the **Tax Withholding Category**. The custom `Tax Profile` is retired.

## Three mechanics → ERPNext mechanisms

| Mechanic | Examples | Effect | ERPNext |
|----------|----------|--------|---------|
| **Additive output tax** | GST, VAT | Added to `grand_total`. Customer pays more. | **Sales Taxes and Charges Template** selected by the Customer's **Tax Category** |
| **Zero-rating with reason** | SEZ-LUT, export | `tax = 0` **+ a compliance reason** (not "None"). | **SEZ / Export Tax Category** + India GST regional **LUT**; the reason is the GST category, fully auditable |
| **Withholding** | TDS | Reduces the amount *collected*, not the invoice total. Customer pays less, provides a certificate. | **Tax Withholding Category** on the Customer — ERPNext withholds at Payment Entry; the Sales Invoice stays whole |

## How it resolves (no custom tax block)

The team's **ERPNext Customer** carries:
- **Tax Category** (`GST` state-based / `SEZ` / `Export / Overseas`) → selects the Sales Taxes and
  Charges Template applied to every Sales Invoice automatically.
- **GSTIN / place of supply** (India regional) → CGST/SGST vs IGST split, native.
- **Tax Withholding Category** (TDS), when the customer self-declares a TAN → ERPNext computes the
  withheld amount on the **Payment Entry**, not the invoice.

So an invoice's tax is whatever the Customer's Tax Category template produces. The only custom field
is `fc_expected_collection` on the Sales Invoice (minor units) — the auto-charge target **after**
withholding — so the gateway never tries to debit money the customer will legally withhold.

## Collection & paid-state (the seam, now native)

- `grand_total = subtotal + output_tax` — ERPNext-native (Sales Taxes rows), round-off disabled so
  it equals the paise-precise compute-core total.
- `fc_expected_collection = grand_total_minor − tds_withheld_minor` — the auto-charge / mandate
  target. `tds_withheld` comes from the Tax Withholding Category (0 at launch).
- A Sales Invoice is `Paid` when the recorded Payment Entries (incl. withholding entry) settle the
  outstanding — ERPNext's native outstanding logic. So a TDS customer who legally short-pays is
  **not** marked permanently unpaid, and auto-charge never debits the withheld portion.

## Launch scope

- **GST + SEZ ship fully** at launch — entirely ERPNext configuration (Tax Categories + templates +
  India GST regional).
- **TDS is Phase 2/3.** The Tax Withholding Category + `fc_expected_collection` seam lands now (so
  TDS is config, not a rewrite); only certificate reconciliation is deferred.

## Notes

- Mandate ceilings use `grand_total` (the gross), not the withholding-reduced amount. See
  [payments.md](payments.md).
- Formal credit notes for downward GST revisions are **return Sales Invoices** in ERPNext (the
  statutory SOR), issued in-process. See [invoicing.md](invoicing.md).
- This removes the custom `Tax Profile` DocType and the three custom amount fields — the mechanics
  are the same, the substrate is ERPNext.
