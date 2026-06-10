# E02 — `money` module + Sales Invoice boundary

**Builds on:** ERPNext · **Replaces:** old #34–#39 · **Phase:** Foundation · **Type:** AFK

## Goal

One shared `money` module that owns integer minor units for the compute core, and the **single
boundary** where amounts convert to ERPNext's major-unit decimals on the Sales Invoice — with
round-off disabled so the grand total equals the paise-precise charge. This is
[ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md) re-scoped onto the ERPNext base (the old
six-issue minor-units refactor collapses here because ERPNext, not custom DocTypes, now holds the
money).

## Scope

- **`money` module:** curated **ISO-4217 minor-unit exponent table** (Stripe zero-decimal /
  three-decimal lists made authoritative — **not** Frappe's `Currency` DocType, which mis-states
  JPY). `to_minor` / `from_minor` (per-currency factor), `round_rate` (rate units = minor × 10⁶),
  and the **half-away-from-zero, once-per-line-item** rounding. Nothing else does `× 100` / `/ 100`.
- **Compute core stays integer:** proration (`days × rate / units_in_period`), metered
  `max(0, qty − allowance) × rate`, credit ledger amounts, the gateway charge integer.
- **Sales Invoice boundary:** when writing a Sales Invoice Item, `from_minor(amount, currency)` →
  `Decimal(exponent dp)` into `rate`/`amount`; set the company/invoice **`disable_rounded_total`**
  (round-off off) so `grand_total == Σ minor-unit line amounts` to the paisa.
- **Gateway/credit boundaries stay minor units** (E03/E07/E10) — gateway-exact, no float→int.

## Acceptance

- Two independent recomputations of an invoice are bit-identical in the core; the Sales Invoice grand
  total equals the minor-unit total exactly (no `round_off` line).
- A zero-decimal currency (JPY) and a three-decimal currency (BHD) convert correctly (the curated
  table, not Frappe's `Currency`).
- A sub-paisa metered rate (€0.009/GB → `900000` rate units) bills exactly; rounding happens once,
  at the line item.
- The charge sent to the gateway equals the Sales Invoice `fc_expected_collection` to the paisa.

## Out of scope

The invoice generation that uses this (E09); the gateway pass-through that consumes the integer (E03).
