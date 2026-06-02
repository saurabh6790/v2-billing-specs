# 13 — Tax — GST + SEZ; TDS withholding seam

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [tax.md](../tax.md)

## What to build

The three-mechanic tax block on invoices: **additive output tax** (GST/VAT → `total`), **zero-rating with reason** (SEZ-LUT/export → tax 0 + compliance reason), and the **withholding seam** for TDS. Settlement targets `expected_collection = total − tds_amount` with `tds_amount = 0` at launch, and `paid ⇔ amount_paid ≥ expected_collection`. GST + SEZ ship fully; the TDS seam lands now so adding TDS later (certificate reconciliation) is additive, not a rewrite.

## Acceptance criteria

- [ ] Invoice tax block: output_tax_*, zero_rating_reason, tds_* fields.
- [ ] GST invoice: `total = subtotal + output_tax`; customer charged the gross.
- [ ] SEZ/export: tax 0 **with a stored reason code** (not "none").
- [ ] `expected_collection = total − tds_amount` (0 at launch); `paid` defined against expected_collection.
- [ ] Mandate ceiling uses `total` (gross), not the reduced amount.

## Blocked by

- #09
