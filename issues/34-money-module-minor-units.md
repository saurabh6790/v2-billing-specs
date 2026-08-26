# 34 — `money` module: integer minor units + ISO-4217 exponent table

> **OBSOLETE — do not build.** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units money model was never implemented and is **deprecated**; money is stored as float `Currency` in major units (see [catalog-pricing-decisions.md](../catalog-pricing-decisions.md)). This migration is retired.

**Type:** AFK · **Milestone:** Phase 1 (foundation) · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)

## What to build

The single shared module every money-touching code path imports — the one place any `× factor` /
`/ factor` or rounding happens, mirroring the gateway-adapter seam. Pure library + tests; **no
schema change**, so it lands safely on its own and unblocks the flips (#35–#38).

Money is an integer count of the currency's **minor unit** (paisa/cent); per-unit **rates** are
integers at a sub-minor scale of `minor × 10⁶` ("rate units"). The factor is `10^exponent` from a
**curated ISO-4217 exponent map owned here** — explicitly *not* Frappe's `Currency` doctype, whose
`fraction_units` says JPY=100 (would overcharge zero-decimal currencies 100×) and whose
`smallest_currency_fraction_value` is inconsistent (INR=0.0, USD=0.01).

## What to build (changes)

1. **Exponent table** — `currency → minor-unit exponent` (INR/USD/EUR=2, JPY/KRW=0, BHD/KWD/OMR=3;
   the Stripe zero-decimal/three-decimal lists made authoritative). Seeded, version-controlled,
   single source of the factor. A lookup miss raises (never silently defaults to 2).
2. **Conversion helpers** — `to_minor(major, currency)` / `from_minor(minor, currency)` (display
   only) using the table; `rate_to_units(major)` / line-item `amount_from_rate(rate_units, qty, …)`.
3. **Rounding** — `round_half_up` (half **away from zero**) to the minor unit, applied **once** at
   amount computation; rate units and intermediates carry full precision. This is the *only*
   rounding primitive in the system.
4. **No total-level rounding helper** — there is deliberately no "round to whole rupee"; document why.

## Acceptance criteria

- [ ] `to_minor`/`from_minor` round-trip exactly for INR, USD (×100), JPY (×1), BHD/KWD (×1000).
- [ ] `rate_to_units(0.009 EUR)` == `900000`; the live snapshot rate ₹0.30/GB-month is representable.
- [ ] `round_half_up` ties round away from zero (`0.5→1`, `2.5→3`, `-0.5→-1`) and is the only place a money value is rounded.
- [ ] An unknown currency raises rather than assuming exponent 2.
- [ ] Module has no Frappe-`Currency`/`fraction_units` dependency; unit tests cover every branch.

## Decisions baked in

- **Own ISO-4217 table, not Frappe Currency** — verified Frappe's JPY=100 is wrong for the gateway minor unit.
- **Rate scale `10⁶`** (not `10⁴`) — headroom for future per-API-call / GPU-second micro-rates.
- **`Long Int`** is the field type the flips will use (Frappe `Int` is `int(11)`, caps at ₹2.1 cr).

## Blocked by

None — can start immediately.
