# 62 — Commitment + Team Fixed-Bundle Spend Rollup DocTypes

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [commitment.md](../commitment.md) · **GitHub:** [#3](https://github.com/saurabh6790/v2-billing-specs/issues/3)

## What to build

Create the two DocTypes that underpin the Commitment feature, wire the evaluation hook into invoice generation, and enforce the one-active-per-team invariant.

`Commitment` and `Team Fixed-Bundle Spend Rollup` schemas are defined in [commitment.md](../commitment.md). Key constraints:

- `floor` is `Long Int` minor units — not `Currency` (ADR 0003).
- `ends_at` is computed at creation (`started_at` + `term_months` calendar months) and never recomputed.
- Rollup rows are permanent money records — never pruned by log-cleanup jobs.

`evaluate_commitment(team, billing_period)` is wired into `generate_draft_invoice` (28th Draft phase) as a skeleton: writes the rollup row, checks `fixed_bundle_spend ≥ floor`, sets `floor_met`. No discount or clawback yet — those land in [#63](63-commitment-discount-application.md) and [#64](64-commitment-clawback.md).

## Acceptance criteria

- [ ] `Commitment` DocType exists with all fields; `floor` is `Long Int` (not `Currency`).
- [ ] `Team Fixed-Bundle Spend Rollup` DocType exists with all fields.
- [ ] Saving a second `active` Commitment for the same team is rejected with a clear error.
- [ ] `generate_draft_invoice` calls `evaluate_commitment` and produces a rollup row for teams with an active Commitment.
- [ ] Rollup `fixed_bundle_spend` correctly sums only `line_type = fixed_bundle` line items (excludes metered and clawback lines).
- [ ] Test: rollup written, `floor_met` flag set correctly, no discount applied yet.

## Blocked by

- [#61](61-invoice-line-item-line-type.md) (Invoice Line Item.line_type — rollup reads line types to compute fixed_bundle_spend)

Soft dependency: assumes two-phase invoice generation exists ([#09](09-postpaid-invoice-generation-fixed.md)).
