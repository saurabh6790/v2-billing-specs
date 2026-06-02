# 06 — Credit ledger + wallet + concurrency

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [credits.md](../credits.md)

## What to build

An append-only `Credit Ledger Entry` that is the customer's prepaid wallet. Balance is always computed from the ledger sum — never stored as a scalar on Team. Support top-up purchase (credit entry) and the `running_balance` denormalization. Credit application uses `SELECT ... FOR UPDATE` on the team's latest ledger entry to prevent the v1 concurrent double-spend race. (Multi-currency credits and expiry mechanics are noted future extensions, out of scope here.)

## Acceptance criteria

- [ ] `Credit Ledger Entry` (append-only) with entry_type, amount (positive), running_balance, reference.
- [ ] Balance = ledger sum; no scalar balance field on Team.
- [ ] Top-up purchase + `get_balance` API.
- [ ] **Concurrency test:** 10 threads applying credits → correct final balance, no negative, no duplicate debit, running_balance matches cumulative sum.
- [ ] Credit application takes a `FOR UPDATE` lock on the latest entry.

## Blocked by

None - can start immediately.
