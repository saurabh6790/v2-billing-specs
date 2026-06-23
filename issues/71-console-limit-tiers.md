# 71 — Console Billing › Limit Tiers (Spending Limits)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Port the Trust Tier surface from `dashboard/src/pages/team/TrustTier.vue` →
`console/` (TypeScript) as **Billing › Limit Tiers**, with the customer-facing
heading **"Spending Limits"** (per the new design).

- **Summary band**: current subscribed amount (active run-rate), paying-since,
  last paid invoice.
- **Ladder table**: every rung (**Base / Tier 1 / Tier 2 / Tier 3**) with its
  requirements (met/unmet check) and spending limit; mark the **Current** tier.
- **"How tier upgrades work"** explainer block.

Endpoints: `get_trust_tier`, `get_team_overview` (current subscribed amount).

## Acceptance criteria

- [ ] Summary band + full ladder render in the team's currency (native, no FX).
- [ ] Current tier is marked; per-requirement met/unmet state is shown.
- [ ] UI uses **Spending Limits / Limit Tiers** labels and **Base/Tier 1–3** (not `t0…t3`); backend stays Trust Tier.
- [ ] `vue-tsc` clean.

## Blocked by

- #66

## Notes

- **Grounding gap:** `get_trust_tier` returns only current + next tier; the design
  shows the **full ladder**. Extend it (or add `get_spending_limits`) to return all
  rungs with per-currency thresholds + requirement flags. Raise at slice start.
- Terminology mapping (Trust Tier → Spending Limits) lives in [terminology.md](../terminology.md).
