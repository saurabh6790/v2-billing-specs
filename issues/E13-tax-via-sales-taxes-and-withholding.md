# E13 — Tax via Sales Taxes (GST/SEZ) + Tax Withholding (TDS seam)

**Builds on:** ERPNext · **Replaces:** old #13 · **Phase:** P3 · **Type:** AFK
**Blocked by:** E09

## Goal

Implement the three tax mechanics as **ERPNext configuration** rather than a custom `Tax Profile`:
additive GST/VAT via Sales Taxes templates, auditable zero-rating via SEZ/Export Tax Categories, and
TDS via the native **Tax Withholding Category** seam (withhold at payment, invoice stays whole). See
[tax.md](../tax.md).

## Scope

- **Customer setup:** each team's ERPNext Customer carries a **Tax Category** (GST state-based / SEZ /
  Export), GSTIN / place of supply (India regional), and — when self-declared — a **Tax Withholding
  Category** (TDS). The Sales Invoice picks the **Sales Taxes and Charges Template** from the Tax
  Category automatically.
- **GST + SEZ ship fully:** CGST/SGST vs IGST split native; SEZ-LUT / export = zero-rated with the
  GST category as the auditable reason (not "None").
- **TDS seam now:** Tax Withholding Category configured; `fc_expected_collection = grand_total_minor −
  tds_withheld_minor` on the Sales Invoice so auto-charge (E10) never debits the withheld portion and
  the invoice isn't marked permanently unpaid. TDS rate 0 at launch; certificate reconciliation
  deferred.
- Retire the custom `Tax Profile` DocType and its amount fields.

## Acceptance

- A Karnataka customer's invoice splits CGST/SGST; an inter-state one uses IGST; an SEZ/export one is
  zero-rated **with a reason**, not blank.
- `grand_total` (round-off off, E02) equals the minor-unit total to the paisa.
- With a Tax Withholding Category set, the Payment Entry withholds TDS, the Sales Invoice stays whole,
  and `fc_expected_collection` is the gross minus withholding — a legally short-paying customer is not
  marked permanently unpaid.
- Mandate ceilings use `grand_total` (gross), not the withholding-reduced amount.

## Out of scope

Certificate reconciliation (deferred); refund credit notes (E15).
