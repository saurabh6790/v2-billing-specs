# 23 — Migration tooling (gradual per-team)

**Type:** HITL · **Milestone:** post-launch (~6mo) · **Spec:** [migration.md](../migration.md)

## What to build

Per-team, opt-in migration from Press v1 — **not a launch task**, run ~6 months after v2 is stable. Per migrating team: seed one Agent `subscribed` event + one price-lock at the **current v1 price** (instant grandfathering) + one opening credit ledger entry; no history backfill; historical v1 invoices imported read-only. Negative-balance teams skipped until they repay. Cards migrate by reference (same gateway accounts); UPI mandates require re-authorisation. Tier mapping = `max(rules-on-v1-history, current-run-rate × margin)` so no one is throttled. **HITL:** needs migration sign-off and per-batch review.

## Acceptance criteria

- [ ] Per-team seed: one subscribed event + price-lock at current v1 price + opening credit entry; no backfill.
- [ ] Historical v1 invoices imported read-only; never recomputed.
- [ ] Negative-balance teams excluded until repaid.
- [ ] Cards imported by reference (no customer action); UPI mandates flagged for re-authorisation.
- [ ] Migration tier = `max(rules-on-v1-history, current-run-rate × margin)`; no existing customer throttled.

## Blocked by

- #09
- #17
