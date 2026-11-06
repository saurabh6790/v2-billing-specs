# 140 — Add query conditions and has_permission to team-scoped billing DocTypes

**Type:** AFK · **Milestone:** SA · **Area:** `central/hooks.py`, `central/permissions.py`, `central/billing/api/dashboard/`

## Problem

Still open from the audit of 15 Oct (D10). No team-scoped billing DocType has `permission_query_conditions` or `has_permission`, and customer reads use `frappe.get_all`. The route check is the only layer between a customer and another team's data. Central's `CLAUDE.md` requires both.

## TODO

- [ ] Wire `<doctype>_query_conditions` and `<doctype>_has_permission` for the 19 team-scoped billing DocTypes with `_team_field_query_conditions` and `_team_field_has_permission`.
- [ ] Use `frappe.get_list` for user reads in `api/dashboard/`.

## Acceptance criteria

- [ ] Denial and cross-team tests for each DocType.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
