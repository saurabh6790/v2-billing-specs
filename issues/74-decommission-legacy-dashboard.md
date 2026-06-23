# 74 — Decommission the legacy dashboard SPA

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Once console parity is verified (#68–#73), remove the legacy SPA and its route so
`console/` is the single frontend.

- Delete `apps/central/dashboard/` (the legacy SPA).
- Remove the `/legacy-dashboard` frontend route, `central/www/legacy-dashboard.html`,
  and the `central/public/legacy-dashboard/` build output.
- Drop the legacy **Atlas** mock screens (`pages/atlas/*`, `mock.js`) — superseded
  by console **Servers**; they are not ported.
- Remove the migration's transitional comment in `console/vite.config.ts`.

## Acceptance criteria

- [ ] `dashboard/` is gone; `bench build` produces only the console bundle.
- [ ] No `/legacy-dashboard` route, www page, or build artifact remains.
- [ ] All migrated surfaces work at `/dashboard`; no dead links to legacy.
- [ ] No references to the legacy SPA in hooks/build config.

## Blocked by

- #68, #69, #70, #71, #72, #73

## Notes

- Verify parity (and the flagged grounding gaps are closed or descoped) before deleting.
- Atlas screens are intentionally dropped, not migrated (console Servers replaces them).
