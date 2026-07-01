# 35 — Rates → rate units (`minor × 10⁶`): Catalog Rate, price-lock, shown_rate + proration engine

> **OBSOLETE — do not build.** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units money model was never implemented and is **deprecated**; rates are stored as float `Currency` in major units (see [catalog-pricing-decisions.md](../catalog-pricing-decisions.md)). This migration is retired.

**Type:** AFK · **Milestone:** Phase 1 (foundation) · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), [plans-and-pricing.md](../plans-and-pricing.md), [invoicing.md](../invoicing.md)

## What to build

Flip the **read side** of pricing to integers: every stored rate becomes a `Long Int` in **rate
units** (`minor × 10⁶`), rate resolution returns rate units, and the line-item proration engine
consumes rate units to emit **minor-unit** amounts (`round_half_up` once). This is the tracer from
"rate stored" through "line-item amount produced"; #36 then flips the invoice header/tax amounts
that sum those line items.

## What to build (changes)

1. **Schema → `Long Int` (rate units):** `Catalog Rate.rate`, `Price Lock.locked_rate`, agent
   `Plan Subscription Log.shown_rate`. `Currency` removed from these.
2. **Resolution + engine:** `pricing.resolve_rate(...)` returns rate units; the line-item
   computation becomes `amount = round_half_up(days × rate_units / units_in_period / 10⁶)` (and
   metered `round_half_up(max(0, qty − allowance) × rate_units / 10⁶)`), rounding **once** via the
   #34 `money` module. Bundle flat rate is the whole-number case.
3. **Lock parity:** `shown_rate` (Agent) == `locked_rate` (Central) still holds — both rate units;
   the discrepancy check compares integers.
4. **Desk display:** read-only computed `rate_display` on `Catalog Rate` (formatted via the factor);
   the integer stays system-of-record.
5. **Migration:** convert each stored float rate → `round(old × factor × 10⁶)` (so €0.009 → 900000,
   exact); idempotent; assert round-trip per row.

## Acceptance criteria

- [ ] `Catalog Rate.rate`, `locked_rate`, `shown_rate` are `Long Int` rate units; no `Currency` remains on them.
- [ ] Resolution returns rate units; line-item + metered amounts come out in minor units, rounded once, matching the worked example in [invoicing.md](../invoicing.md).
- [ ] Sub-minor rates survive: the €0.009/GB transfer rate bills correctly (no 1-cent overcharge).
- [ ] `Catalog Rate` desk form shows a formatted rate; the stored value is the integer.
- [ ] `bench migrate` converts all existing rate rows with per-row round-trip verification; re-runnable.
- [ ] Pricing/price-lock/metering tests green against integer rates.

## Decisions baked in

- **Rate units = `minor × 10⁶`**, currency-independent sub-minor scale (ADR 0003).
- **Round once, at the line item**, half away from zero — never on a stored or intermediate rate.

## Blocked by

34 (the `money` module the engine rounds with).
