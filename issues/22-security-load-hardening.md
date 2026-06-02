# 22 — Security + load hardening

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [testing.md](../testing.md)

## What to build

The hardening pass that proves v1's failure classes are closed. Security: webhook signature/replay tests, role/permission enforcement (Agent key can't hit customer/admin endpoints), no raw SQL interpolation (QueryBuilder throughout; `bandit` + `grep`). Load: a 1000-subscription invoice run and concurrent webhook flood (`locust`) demonstrating parallel two-phase generation holds and no duplicate payment attempts.

## Acceptance criteria

- [ ] Webhook without valid signature → 400, zero DB records; processed-event replay → 200, no side effects.
- [ ] Agent API key on a customer/admin endpoint → 403.
- [ ] Static analysis confirms no raw SQL string interpolation.
- [ ] 1000-subscription two-phase run completes with no invoice processed twice and no duplicate attempts.
- [ ] Concurrent webhook flood handled without duplicate state transitions.

## Blocked by

- #10
