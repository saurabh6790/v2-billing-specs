# Tax

## Purpose

Model tax correctly as **three structurally different mechanics** — not one rate field — so GST works, SEZ is auditable, and TDS withholding doesn't poison the paid-state.

## Three mechanics

| Mechanic | Examples | Effect |
|----------|----------|--------|
| **Additive output tax** | GST, VAT | Added to `total`. Customer pays the bigger number. |
| **Zero-rating with reason** | SEZ-LUT, export | `tax = 0` **plus a compliance reason code** (not "None" — an auditor will ask). |
| **Withholding** | TDS | Reduces the amount *collected*, not the `total`. Customer pays less and provides a certificate you reclaim. |

## Data Model (Invoice tax block)

| Field | Type | Notes |
|-------|------|-------|
| output_tax_type | Select | GST / VAT / none (additive) |
| output_tax_rate | Float | a percentage, not money — stays `Float` |
| output_tax_amount | Long Int | **Minor units** — `round_half_up(subtotal × output_tax_rate / 100)`, rounded once. Added to total. [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) |
| zero_rating_reason | Select | sez_lut / export / null |
| tds_applicable | Check | customer self-declares (has TAN) |
| tds_rate | Float | a percentage, not money — stays `Float` |
| tds_amount | Long Int | **Minor units** — `round_half_up(total × tds_rate / 100)`, withheld; reduces collected, not total. **0 at launch** |
| tds_certificate_received | Check | gate for closing a withheld invoice |

## Collection & paid-state

All amounts below are **integer minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)); the rate fields are percentages.

- `total = subtotal + output_tax_amount` (exact integer addition)
- `expected_collection = total − tds_amount` (the auto-charge / mandate target)
- `paid` ⇔ `amount_paid ≥ expected_collection` (certificate gate trivially satisfied when withholding = 0)

So a TDS customer who legally short-pays is **not** marked permanently unpaid, and auto-charge never tries to debit money they will withhold.

## Launch scope

- **GST + SEZ ship fully** at launch.
- **TDS is Phase 2/3**, but the *seam* (withholding-aware `expected_collection` + paid-state) lands now → TDS is an additive change, not a rewrite. Only certificate reconciliation is deferred.

## Notes

- Mandate ceilings use `total` (the gross), not the reduced amount. See [payments.md](payments.md).
- Formal credit notes for downward GST revisions are issued in ERPNext (the statutory SOR). See [invoicing.md](invoicing.md).
