# 144 — Rate-limit payment endpoints and escape CSV exports

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/api/dashboard/invoices.py`, `central/billing/api/dashboard/methods.py`, `central/billing/api/dashboard/reports.py`, `central/billing/api/billing_api.py`

## Problem

Only the PDF, receipt and GST recheck endpoints are rate limited. Top-up, confirm, checkout and card setup are not, and card setup is the usual target of card testing. The CSV export does not escape cells that start with `=`, `+`, `-` or `@`. The pilot checkout endpoints accept any redirect URL.

## TODO

- [ ] Add `@rate_limit` to top-up create and confirm, invoice checkout, card and mandate setup and confirm, and the pilot money endpoints.
- [ ] Escape formula cells in `export_csv`.
- [ ] Allow-list redirect URLs.

## Acceptance criteria

- [ ] Tests cover the limit and an escaped cell.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
