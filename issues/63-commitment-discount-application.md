# 63 — Commitment discount application (floor-met path)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [commitment.md](../commitment.md) · **GitHub:** [#4](https://github.com/saurabh6790/v2-billing-specs/issues/4)

## What to build

Implement the floor-met branch of `evaluate_commitment()`: when a team's fixed-bundle spend meets the committed floor, apply the discount to fixed-bundle invoice lines and record it on the rollup.

Discount math per `fixed_bundle` line item (all integer minor units — ADR 0003):

```
discounted_amount = round_half_up(line_amount × (1 − discount_pct / 100))
discount_given    = line_amount − discounted_amount
```

`discount_pct` is the only Float in this path; the result rounds once to a minor-unit integer per line item. Metered and clawback lines are never touched.

On floor met: stamp rollup `floor_met = True`, `discount_applied = Σ discount_given`. If `billing_period` is in or past `ends_at`, mark Commitment `completed`. Forecast projected total reflects the discount for committed teams.

## Acceptance criteria

- [ ] Fixed-bundle line items on a committed team's invoice carry the discounted amount when floor is met; metered lines are unchanged.
- [ ] Rollup row has `floor_met = True` and `discount_applied` equal to the sum of per-line discounts.
- [ ] A team that upgrades or swaps bundles within the period but stays at or above the floor still receives the discount with no extra charge.
- [ ] Commitment status → `completed` when `ends_at` has elapsed and the floor was met throughout.
- [ ] Forecast projected total reflects the discount for committed teams.
- [ ] All amounts remain integer minor units end-to-end; no float money at rest.
- [ ] Test: floor met → discounted lines; floor met on final month → completed; metered lines untouched.

## Blocked by

- [#62](62-commitment-rollup-doctypes.md) (Commitment + Rollup DocTypes)
