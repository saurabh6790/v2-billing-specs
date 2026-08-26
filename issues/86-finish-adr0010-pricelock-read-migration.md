# 86 — Finish the ADR 0010 read-path migration: one ledger source for "what's running"

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md](../catalog-pricing-decisions.md), [central-billing-review-notes.md §1+§2](../central-billing-review-notes.md) · **ADR:** [0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)

## What to build

ADR 0010 folded the price-lock into the `Subscription Change` ledger, but only the **write** path
moved — `Price Lock` is still the **read** source in production. The concrete bug: a **composed**
subscription writes no `Price Lock` (only a `Subscription Change`), so composed servers are
**invisible** to every reader — undercounted in "resources used", missing from admin cluster/plan
consumption, skipped by the team-currency fallback — and the catalog now computes "what's running"
two different ways that disagree for composed configs.

Migrate every remaining `Price Lock` read to the `Subscription Change` ledger behind **one shared,
batched helper** (`team_active_segments(team)` — the team's open rate-bearing segments, one query,
picking the latest segment per subscription in Python), then backfill and retire the legacy path.
This also kills the `team_run_rate` N+1 (one query per subscription on a hot customer read), which
folds naturally into the shared helper.

## Acceptance criteria

- [ ] A single shared helper resolves a team's active priced segments from `Subscription Change` in
      **one** batched query (no per-subscription query); `team_run_rate` and `get_eligible_plans`
      use it.
- [ ] Every former `Price Lock` reader (dashboard "resources used", admin cluster/plan consumption,
      team-clusters + currency fallback, plan `active_resources`, `reconcile_subscription_resource`)
      reads from the ledger via the helper.
- [ ] **Composed** subscriptions are counted everywhere a preset subscription is — "resources used",
      admin consumption, team-clusters, currency fallback — with a regression test proving a composed
      server is now visible where it previously was not.
- [ ] Remaining live `Price Lock` rows are backfilled into `Subscription Change`; a patch test asserts
      the before→after mapping on seeded rows.
- [ ] The `Price Lock` doctype, `revenue/pricelock.py`, and the discrepancy fields are removed; no
      production read path references `Price Lock`.
- [ ] Full suite green.

## Blocked by

None - can start immediately.
