# 31 — Commitment: clawback on breach

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [final-plan-pricing.md](../final-plan-pricing.md) §5 · **ADR:** [0001](../docs/adr/0001-commitment-as-team-spend-floor.md)

## What to build

Give the Commitment its teeth. When a committed team drops its fixed-bundle spend **below the floor before the term ends**, the next/affected invoice carries a **clawback** line that repays only the discount the team enjoyed on the months already consumed — `Σ over consumed months of (list_spend − discounted_spend)`. Never a fee for unrendered service, and never a charge for staying at/above the floor with a different resource mix (upgrades/swaps don't breach).

## What to build (changes)

1. **Breach detection** — at invoice generation (or commitment evaluation), flag a `Commitment` as `breached` when the period's fixed-bundle spend falls below `floor` and `started_at + term_months` has not elapsed.
2. **Clawback computation** — sum the discount actually applied across consumed months (`list − discounted`) and emit a single clawback line on the affected invoice. Mark the Commitment `breached`; stop applying the discount going forward.
3. **Term completion** — when the term elapses with the floor met throughout, mark the Commitment `completed` (no clawback); the team reverts to list pricing unless renewed.
4. **Idempotency** — clawback is computed once per breach (re-running invoice generation must not double-charge).

## Acceptance criteria

- [ ] A team dropping below the floor before term-end gets one clawback line equal to the discount enjoyed on consumed months; the Commitment becomes `breached` and the discount stops.
- [ ] A team that upgrades/swaps but stays at/above the floor incurs **no** clawback.
- [ ] A Commitment that runs its full term at/above the floor completes with no clawback.
- [ ] Clawback never bills for future/unused months (no remaining-term fee).
- [ ] Re-running invoice generation does not duplicate the clawback line.
- [ ] `press_billing` test suite green, with breach, upgrade-no-breach, and full-term-completion cases.

## Decisions baked in

- **Clawback = repay discount enjoyed**, chosen over a remaining-term fee ([ADR 0001](../docs/adr/0001-commitment-as-team-spend-floor.md)).

## Blocked by

30 (Commitment record + spend rollup + discount this reverses).
