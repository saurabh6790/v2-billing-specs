# 36 — Invoice + tax amounts → minor units; migrate existing invoices (convert stored, never recompute)

**Type:** AFK · **Milestone:** Phase 1 (foundation) · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), [invoicing.md](../invoicing.md), [tax.md](../tax.md)

## What to build

Flip the **write side** of billing to integers: the invoice header amounts, the tax block, and the
forecast all become `Long Int` minor units, summing the minor-unit line items #35 produces. Existing
invoices are migrated by **converting their stored values** — settled (`Paid`) invoices are **never
recomputed** from rates (that could shift a historical total by a paisa and desync the gateway
receipt and ERPNext invoice).

## What to build (changes)

1. **Schema → `Long Int` (minor units):** Invoice `subtotal`, `total`, `credit_applied`,
   `expected_collection`, `amount_paid`, and Invoice Line Item `amount`; tax block
   `output_tax_amount`, `tds_amount`. Tax/TDS **rate** fields stay `Float` (percentages).
2. **Integer math:** `subtotal` = exact integer sum of rounded line items; `output_tax_amount =
   round_half_up(subtotal × rate / 100)` once; `total = subtotal + output_tax_amount`;
   `expected_collection = total − tds_amount`; paid-state `amount_paid ≥ expected_collection` is an
   integer compare. **No whole-rupee total rounding.**
3. **Forecast:** projection math integer end-to-end; the forecast API divides to a display decimal at the edge only.
4. **Desk display:** read-only computed `total_display` (and key amounts) on `Invoice`.
5. **Migration:** backfill `round_half_up(old_float × factor)` from the **stored** value; assert
   `round(old × factor) == new` per row; **skip recomputation for `Paid`/settled invoices**;
   idempotent; old columns dropped only after the assertion passes for every row.

## Acceptance criteria

- [ ] All listed Invoice/line-item/tax amount fields are `Long Int` minor units; tax/TDS rates remain `Float`.
- [ ] `subtotal` equals the exact integer sum of line items; `total`/`expected_collection`/paid-state computed in integers; no `round_off` line and no whole-rupee rounding.
- [ ] Forecast returns integer-derived figures; only the API edge formats to decimal.
- [ ] Migration converts existing invoices from stored values, never recomputes a settled invoice, and verifies round-trip per row before dropping old columns.
- [ ] Invoicing + tax + forecast tests green in integer math.

## Decisions baked in

- **Convert stored value, never recompute settled invoices** — preserves charge↔receipt↔statutory parity (grilled 2026-06-08).
- **Paise-precise total, no GST round-off** — ERPNext side handles statutory presentation (#39).
- **AFK** — the per-row round-trip assertion is the safety net (demo data; no human gate).

## Blocked by

34 (`money` module), 35 (rate units → the line-item amounts this sums).
