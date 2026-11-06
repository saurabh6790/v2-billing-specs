# 143 — Ship no test endpoints, and scope the pilot credential

**Type:** HITL · **Milestone:** SA · **Area:** `central/billing/tests/e2e.py`, `central/billing/api/billing_api.py`, `central/api/pilot.py`

## Problem

- `central/billing/tests/e2e.py` ships guest endpoints that run as Administrator and move money. One site setting, `allow_tests`, turns them on, and that setting is set on several benches.
- The billing pilot API acts on the credential's team as a full billing manager and runs delegated calls as Administrator. The credential has no scope, and the audit trail records Administrator.
- `report_usage` accepts usage totals from the same credential.

This is a security issue. Details are in the bench-local audit report.

## Decision needed (HITL)

Which hosts hold a pilot credential: only Frappe-run services, or also the customer's own server? The answer decides whether `report_usage` must move to a separate metering credential.

## TODO

- [ ] Move the e2e module out of the shipped package, or serve it only when `developer_mode` is on and the site is marked non-production. Remove `allow_guest`.
- [ ] Give credentials scopes (billing read, billing write, metering). Accept usage only with the metering scope.
- [ ] Act as a dedicated service user instead of Administrator, so every change keeps its actor.

## Acceptance criteria

- [ ] With `allow_tests` set on a production-marked site, the e2e endpoints refuse.
- [ ] A credential without the metering scope cannot report usage.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
