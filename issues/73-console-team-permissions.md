# 73 — Console Team & Permissions (members + roles)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Port the team-identity surfaces from `dashboard/src/pages/team/Members.vue` and
`RoleBuilder.vue` (+ `InviteMemberDialog`, `SwitchTeamDialog`, `TeamSwitcher`,
`RoleBuilder`) → `console/` (TypeScript) as a **top-level Team & Permissions**
nav item.

- **Members**: list, invite, remove, assign role.
- **Roles / custom roles**: system roles + a custom-role builder over capabilities.
- Endpoints: `central.iam.*` (members/roles/capabilities) — **Central-owned**
  (`team:view` / `team:manage`), not billing's `billing:view`/`billing:manage`.

## Acceptance criteria

- [ ] Members list + invite/remove/assign work; custom-role builder persists.
- [ ] Gated on `team:manage` (view-only members see it read-only); server re-checks.
- [ ] Team switcher works (own teams; operator may impersonate any team).
- [ ] `vue-tsc` clean; reuses `useTeamScope`/`useSession`.

## Blocked by

- #66

## Notes

- Authorisation model + screen detail in [central-console-ui.md](../central-console-ui.md).
- Distinct from billing capabilities — identity is Central-owned (ADR 0004).
