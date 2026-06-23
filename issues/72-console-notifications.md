# 72 — Console Notifications (top-level surface)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

Port the billing Notifications page from
`dashboard/src/pages/billing/Notifications.vue` → `console/` (TypeScript) as a
**top-level** nav item (the bell), not a billing sub-page (per the new IA).

- Notification list (read state) + per-channel/category **preferences**.
- Endpoints: `list_notifications`, `get_notification_preferences`,
  `save_notification_preferences`.

## Acceptance criteria

- [ ] Notifications list renders; preferences load and save (POST; no GET-write).
- [ ] Surface reachable from the top-level bell nav item.
- [ ] `vue-tsc` clean; reuses console list + form primitives.

## Blocked by

- #66

## Notes

- Cloud Billing is the sole notification sender (#20); this is read + preferences only.
