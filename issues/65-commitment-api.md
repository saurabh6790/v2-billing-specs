# 65 — Commitment API — customer + admin endpoints

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [commitment.md](../commitment.md) · **GitHub:** [#6](https://github.com/saurabh6790/v2-billing-specs/issues/6)

## What to build

Expose the Commitment feature through customer-facing and admin API endpoints. All endpoints are team-scoped (customer reads own team only; admin can target any team).

Customer endpoints:

```
POST /api/method/cloud_billing.commitment.create
     { "floor": <minor_units>, "term_months": 12, "discount_pct": 10.0 }
     → { commitment, floor, term_months, discount_pct, started_at, ends_at }

GET  /api/method/cloud_billing.commitment.get_active
     → { commitment | null, status, floor, ends_at, months_remaining, consumed_discount }

GET  /api/resource/Commitment?filters=[["team","=",…]]&order_by=started_at desc
```

Admin endpoints:

```
POST /api/method/cloud_billing.admin.set_commitment
     { "team": "TEAM-001", "floor": <minor_units>, "term_months": 12, "discount_pct": 10.0 }

GET  /api/resource/Team Fixed-Bundle Spend Rollup
     ?filters=[["team","=","TEAM-001"]]&order_by=billing_period desc
```

`get_active.consumed_discount` sums `discount_applied` across rollup rows for the active Commitment. Testable from [#62](62-commitment-rollup-doctypes.md) onwards with zero-value rollups; accurate figures require [#63](63-commitment-discount-application.md).

Constraints: `floor` validated as positive `Long Int` (reject float or negative); `create` rejects a second active Commitment; customer endpoints auto-scope to the calling team.

## Acceptance criteria

- [ ] `create` creates an active Commitment; rejects a second active Commitment for the same team.
- [ ] `get_active` returns `null` for teams with no active Commitment; returns correct `months_remaining` and `consumed_discount` for teams that have one.
- [ ] History endpoint returns all Commitments ordered by `started_at desc`.
- [ ] Admin `set_commitment` can create or override a Commitment on any team.
- [ ] `floor` submitted as a float or negative value is rejected at the API boundary.
- [ ] Customer endpoint called with another team's identifier returns only the calling team's data.
- [ ] Test: create, get_active (with/without), history, admin override, duplicate-active rejection, float-floor rejection.

## Blocked by

- [#62](62-commitment-rollup-doctypes.md) (Commitment + Rollup DocTypes — endpoints operate on these records)
