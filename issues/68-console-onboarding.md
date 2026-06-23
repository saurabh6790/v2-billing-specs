# 68 — Console onboarding (billing profile + payment method)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Port the onboarding flow that gates a new team before money can move, from
`dashboard/src/pages/Onboarding.vue` + `components/onboarding/*` →
`console/src/pages` (TypeScript), wired to console's setup guard (#66).

- Billing-profile step (currency + legal name + address + tax region/GSTIN) →
  `save_billing_profile`; geo via `get_billing_geo`.
- Payment-method step → the #67 add-method composables.
- Section/step shell on console's `AppShell` + `lib`; the router guard diverts
  incomplete teams here and releases them to `/dashboard` once complete.

## Acceptance criteria

- [ ] A team with no profile is routed to onboarding; completing both steps releases it to the dashboard.
- [ ] Currency locks after first money activity (server already enforces; UI reflects it).
- [ ] Completed steps are read-only (no data-mutating button on a done step).
- [ ] `vue-tsc` clean; reuses `useTeamScope`/`useCapabilities`.

## Blocked by

- #66, #67

## Notes

- Mirror the existing two-step flow; endpoints unchanged (`save_billing_profile`, `get_billing_geo`).
- Honour the "completed steps are read-only" rule.
