# 37 — Credit ledger → minor units (kills the v1 float-drift balance bug)

**Type:** AFK · **Milestone:** Phase 1 (foundation) · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), [credits.md](../credits.md)

## What to build

Flip the credit ledger to integer minor units. The v1 negative-balance/drift bug was a stored
**float** balance; integer minor units cannot drift, and the ledger sum is exact. The
credits-then-card waterfall application and `FOR UPDATE` concurrency math become integer-exact.

## What to build (changes)

1. **Schema → `Long Int` (minor units):** `Credit Ledger Entry.amount` (always positive magnitude)
   and `running_balance` (exact integer sum; may be signed for admin over-adjustment).
2. **Math:** balance computed as integer sum under `SELECT … FOR UPDATE`; the invoice waterfall
   (`credit_applied`, #36) draws `min(balance, amount_due)` in integers; the 80% wallet-forecast
   threshold becomes an integer comparison.
3. **Desk display:** read-only computed `amount_display` / `balance_display` on `Credit Ledger Entry`.
4. **Migration:** convert each entry `round_half_up(old_float × factor)`; **recompute
   `running_balance` as the integer prefix-sum** of the migrated entries (the ledger is the SOR, so
   the balance column is derived, not independently converted); assert the final balance matches
   `round(old_final × factor)`; idempotent.

## Acceptance criteria

- [ ] `amount` and `running_balance` are `Long Int` minor units; balance is the exact integer ledger sum.
- [ ] Waterfall application and the 80% top-up forecast compute in integers; no float balance anywhere.
- [ ] Concurrent apply under `FOR UPDATE` cannot double-spend or drift (integer test).
- [ ] Migration converts entries and rebuilds `running_balance` as an integer prefix-sum, verified against the prior balance.
- [ ] Credit ledger + waterfall tests green.

## Decisions baked in

- **`running_balance` is derived** (integer prefix-sum), not independently float-converted — avoids reintroducing drift.
- Amounts are non-negative magnitudes + `entry_type` direction; balance may be signed.

## Blocked by

34 (`money` module). Waterfall application coordinates with 36's `credit_applied`.
