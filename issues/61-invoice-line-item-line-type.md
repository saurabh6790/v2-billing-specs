# 61 — Invoice Line Item.line_type — classify fixed_bundle / metered / clawback

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [commitment.md](../commitment.md) · **GitHub:** [#2](https://github.com/saurabh6790/v2-billing-specs/issues/2)

## What to build

Add two fields to the existing `Invoice Line Item` child table:

- `line_type` (Select: `fixed_bundle / metered / clawback`) — defaults `fixed_bundle` on all existing and new rows. The billing engine reads this to decide whether a line is eligible for the commitment discount (`fixed_bundle`), untouched by discounts (`metered`), or a repayment line (`clawback`).
- `commitment` (Link → Commitment) — null on all line types except `clawback`, where it points to the breached Commitment for audit.

No behaviour change in this slice — pure schema addition and backfill. Both the discount application slice and the clawback slice depend on these fields existing.

## Acceptance criteria

- [ ] `Invoice Line Item` has `line_type` (Select: `fixed_bundle / metered / clawback`) with default `fixed_bundle`.
- [ ] `Invoice Line Item` has `commitment` (Link → Commitment), nullable.
- [ ] All existing `Invoice Line Item` rows are backfilled to `line_type = fixed_bundle`.
- [ ] New lines written by `generate_draft_invoice` carry `line_type = fixed_bundle` (fixed resources) or `line_type = metered` (Usage Meter lines).
- [ ] Test: invoice generation produces correctly typed line items; existing tests still pass.

## Blocked by

Soft dependency: assumes `Invoice` and `Invoice Line Item` exist ([#09](09-postpaid-invoice-generation-fixed.md)). Can be developed against the schema in parallel.
