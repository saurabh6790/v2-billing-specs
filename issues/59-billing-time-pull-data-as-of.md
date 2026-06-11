# 59 — Billing-time pull + per-team "data as of" freshness

**Type:** AFK · **Milestone:** post · **Spec:** [atlas-integration/02-agent-central-sync.md](../atlas-integration/02-agent-central-sync.md), [observability.md](../observability.md)

## What to build

The verification/repair path for the push spine. The Agent exposes
`get_team_usage(team, from, to)` returning the team's event segments and
meter rollups for a window, so Central can pull at billing time when its data
looks stale. The invoice run records, per team, the "data as of" timestamp it
billed from (latest acknowledged event/rollup for the team's clusters); a
cluster whose pushes have stalled past a threshold surfaces in admin
observability before invoices go out, instead of silently under-billing.

## Acceptance criteria

- [ ] `get_team_usage` returns segments + rollups for the window, authenticated by the cluster-scoped key, inaccessible to customer/admin sessions.
- [ ] Central can reconcile a team from a pull: missing events lock idempotently, rollups replace.
- [ ] Each invoice records the data-freshness timestamp it was computed from.
- [ ] A stalled Agent (no acks past threshold) is flagged in the admin view pre-invoice-run.

## Blocked by

- #53, #57

