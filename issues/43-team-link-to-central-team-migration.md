# 43 — Team identity: `team` `Data`→`Link (Team)` + data patch + Team Member backfill

**Type:** HITL · **Milestone:** Central Merge (CM) · **Spec:** [ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md) §4

## What to build

Billing's `team` is a free-text **`Data`** slug (`acme-corp`) on 16 DocTypes,
with no referential link to a real team. Central's team is the **`Team`** DocType
(`TEAM-#####`, `team_name`, `members`, `status`). Re-point billing at the real
`Team`, and migrate existing data so nothing loses its team — including the
**access backfill** so existing billing users keep access under capability IAM
(#42).

## The 16 DocTypes carrying `team`

`subscription`, `invoice`, `price_lock`, `credit_wallet`,
`credit_ledger_entry`, `payment_method`, `payment_attempt`, `refund`,
`commitment`, `usage_rollup`, `tax_profile`, `billing_profile`,
`entitlement_token`, `trust_tier`, `notification_log`, `notification_preference`.

## What to build (changes)

1. **Schema:** change `team` from `Data` → **`Link → Team`** on all 16 DocTypes.
   Re-point any `autoname`/uniqueness that embeds the team slug (e.g.
   `Credit Wallet`, `Tax Profile`, `Trust Tier` keyed per team).
2. **Data patch** (`central/patches/`, idempotent, dependency-ordered — runs
   before #42's authz flips take effect):
   1. For each distinct legacy billing slug, **ensure a `Team`** exists
      (`team_name` = slug or the mapped real team).
   2. Build a `slug → Team.name` map.
   3. **Rewrite `team`** on all 16 DocTypes via the map (raw SQL update before the
      Link constraint is enforced, then validate).
   4. Apply the field-type change so values are now valid Links.
   5. **Drop the `User-billing_team` Custom Field** and its
      `ensure_billing_team_field` hook.
   6. **Backfill `Team Member`:** every user who previously had access to a team's
      billing becomes an Active member of the matching `Team` with a role granting
      `billing:view`/`billing:manage` (`Owner` or `Billing`). Without this they
      lose access at cutover.
3. **Helper updates:** `_shared.py` lookups (`_team_currency`, `_team_clusters`,
   `_default_team`) and demo seeds resolve a `Team`, not a slug.

## Acceptance criteria

- [x] All 16 billing DocTypes link `team` → `Team`; no `Data` team field remains.
- [x] `bench migrate` on a populated site rewrites every legacy slug to its
  `Team.name`, idempotently and re-runnably; zero orphaned/blank `team` values.
- [x] `User.billing_team` and `ensure_billing_team_field` are gone (Custom Field
  + column dropped; the hook was already removed in #42).
- [x] Every pre-migration billing user is an Active `Team Member` with a
  billing-capable role on their team (access continuity verified).
- [x] A per-row round-trip assertion proves no invoice/ledger/subscription changed
  team ownership through the migration.

**Status:** Done on `merge-billing` (cenral-bench). 16 schemas flipped; patch
`v03_team_link_to_central_team` (pre: migrate+backfill+drop field; post: orphan
guard); 5 `field:team` docs renamed so `name == team` holds; demo seeds mint real
Teams. Full Central suite **305 green** (302 + 3 migration round-trip tests),
`bench migrate` clean.

## Decisions baked in

- **Real `Team` link over slug** — one identity across billing + VMs/assets.
- **Backfill is part of the patch** — access continuity is a migration concern,
  not a manual follow-up.

## Blocked by

41 (module under Central, so `Team` is importable). Lands with/just before 42.
