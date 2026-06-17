# 64 — Commitment clawback on breach

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [commitment.md](../commitment.md) · **ADR:** [0001](../docs/adr/0001-commitment-as-team-spend-floor.md) · **GitHub:** [#5](https://github.com/saurabh6790/v2-billing-specs/issues/5)

## What to build

Implement the breach branch of `evaluate_commitment()`: when a committed team's fixed-bundle spend falls below the floor before `ends_at`, compute the clawback, emit it as an invoice line, and close the Commitment.

Clawback amount:

```
clawback_amount = Σ rollup.discount_applied
                  for rollup rows where commitment = this Commitment
                                    and floor_met = True
```

The team repays only the discount enjoyed on consumed months — never a fee for future or unrendered months.

On breach: append an `Invoice Line Item` with `line_type = clawback`, `amount = clawback_amount`, `commitment` link set, and a human-readable description. Write the current period's rollup with `floor_met = False`, `discount_applied = 0`. Mark Commitment `breached`.

**Idempotency:** checks for an existing rollup row for `(team, billing_period)` before writing — re-running Draft generation replaces the rollup row and clawback line in-place, never emitting two clawback lines for the same breach.

## Acceptance criteria

- [ ] A team missing the floor before `ends_at` gets one `line_type = clawback` line equal to the sum of discounts enjoyed on prior months.
- [ ] Commitment status → `breached`; `breached_at` and `breach_reason` are set; no discount applies from this point.
- [ ] A team that upgrades/swaps but stays at or above the floor incurs no clawback.
- [ ] Re-running `generate_draft_invoice` for the same breach period does not produce a second clawback line.
- [ ] A Commitment that runs its full term at or above the floor completes with no clawback.
- [ ] Test: breach → clawback line correct amount; idempotent re-run; upgrade-no-breach; full-term completion.

## Blocked by

- [#63](63-commitment-discount-application.md) (Commitment discount application — clawback repays discounts recorded by that slice)
