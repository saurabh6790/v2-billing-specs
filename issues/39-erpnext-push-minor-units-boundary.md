# 39 — ERPNext push: convert minor units → major-unit decimal at the boundary, round-off disabled

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), [invoicing.md](../invoicing.md)

## What to build

The one-way Paid→Sales Invoice push is the only place (besides display) money leaves integer form.
ERPNext (the statutory SOR) holds major-unit decimals, so the push divides each minor-unit amount by
the currency factor to an `exponent`-dp decimal, and runs with **ERPNext round-off disabled** so the
Sales Invoice grand total equals our paise-precise charged total — preserving
charge ↔ receipt ↔ statutory-invoice parity with no `round_off` adjustment line.

## What to build (changes)

1. **Boundary conversion:** map each pushed amount/rate `from_minor(value, currency)` to a decimal at
   the currency's exponent (2 dp for INR/USD, 0 for JPY, 3 for BHD) — via the #34 `money` module.
2. **Disable round-off:** set the Sales Invoice to skip ERPNext's "round off to nearest unit" so its
   grand total matches the converted paise-precise total (assert equality, in minor units, post-push).
3. **Failure isolation unchanged:** conversion happens inside the existing async, ret--retrying,
   retrying, non-blocking push; a sync failure still never rolls back the customer invoice.

## Acceptance criteria

- [ ] Pushed Sales Invoice amounts are major-unit decimals at the correct per-currency precision (2/0/3 dp).
- [ ] Sales Invoice grand total, converted back to minor units, equals the source invoice `total` exactly — no round-off drift, no adjustment line.
- [ ] Zero-decimal (JPY) and three-decimal (BHD) invoices convert correctly.
- [ ] ERPNext sync remains async/one-way/failure-isolated; existing sync tests green.

## Decisions baked in

- **Round-off disabled** so statutory total = charged total (grilled 2026-06-08); the boundary is the only de-integerization besides display.

## Blocked by

36 (invoice amounts in minor units — what gets pushed).
