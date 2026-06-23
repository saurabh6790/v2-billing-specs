# 66 — Console migration foundation (API map + guard + shared types)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

The enabling slice for porting the legacy `dashboard/` surfaces into the new
`console/` SPA. No customer-visible screen — it lays the shared rails every
later CO slice builds on, in **TypeScript** (`vue-tsc` clean).

- Extend `console/src/api/methods.ts` with the full billing + identity endpoint
  map (the `central.billing.api.dashboard.*` and `central.iam.*` constants from
  the legacy `api/endpoints.js`), typed `as const`.
- Port the billing-setup **router guard** (legacy `router/index.js` `beforeEach`
  + `data/billingSetup.js`): await session, divert incomplete-profile teams to
  onboarding. Console's guard today only does `await sessionReady`.
- Add response/row **types** to `console/src/types/index.ts` for the billing
  payloads the later slices consume.
- Confirm the icon strategy (CSS-class `lucide-*`) and `lib/{format,status,toast}`
  cover the legacy `utils/{money,date,status,toast,gateway}` helpers; fill gaps.

## Acceptance criteria

- [ ] `api/methods.ts` exposes every billing/identity endpoint a CO slice needs; `vue-tsc --noEmit` passes.
- [ ] Router guard redirects a team with an incomplete billing profile to the (placeholder) onboarding route; complete teams pass through.
- [ ] Shared types cover team-overview, invoice, payment-method, trust-tier payloads.
- [ ] No `useTeam.js` / `utils/*` copied over — reuse `useSession`/`useTeamScope`/`lib/*`.

## Blocked by

- — (console scaffold already exists)

## Notes

- Both SPAs stay live: console at `/dashboard`, legacy at `/legacy-dashboard`.
- Endpoints are unchanged — this is wiring, not backend work.
