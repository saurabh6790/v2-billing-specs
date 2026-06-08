# Money is stored as integer minor units, never a float

Frappe's `Currency` fieldtype is a binary float. Every monetary value in the billing system —
rates, line-item amounts, subtotals, tax, credits, balances — was typed `Currency`, so every
multiply, prorate, sum, and tax calculation accumulated binary-floating-point error. The v1 system
already paid for this: cents that did not reconcile against the gateway, a stored balance that
drifted negative, totals that displayed `₹999.99999998`. Gateways do **not** work this way:
**Razorpay charges in integer paise** and **Stripe charges in integer cents** (`amount` is the
smallest currency unit). We were converting to integer minor units only at the gateway boundary —
the worst place, because all the rounding error was already baked in by then.

## Decision

**Every settled monetary amount is a non-negative-or-signed 64-bit integer counting the currency's
minor unit** — paise for INR, cents for USD. There are **no floats in money arithmetic** and no
`Currency` fields on money. Display code divides by the currency's minor-unit factor for
presentation only; it is the *last* step, never an intermediate one.

This is the Razorpay/Stripe charge model adopted as the internal representation rather than a
boundary conversion, so the integer the gateway charges is the integer billing computed.

### The minor-unit factor is per-currency, from our own ISO-4217 table

The factor is `10^exponent` where `exponent` is the **ISO 4217 minor-unit exponent**:

| Currency class | Examples | Exponent | Factor | `1000` in minor units means |
|----------------|----------|----------|--------|------------------------------|
| Two-decimal (default) | INR, USD, EUR | 2 | 100 | ₹10.00 |
| Zero-decimal | JPY, KRW | 0 | 1 | ¥1000 |
| Three-decimal | BHD, KWD, OMR | 3 | 1000 | BD 1.000 |

Hardcoding `/100` silently overcharges a zero-decimal currency 100× and undercharges a
three-decimal one. Both Stripe and Razorpay special-case zero-decimal currencies for exactly this
reason.

**We do *not* trust Frappe's `Currency` DocType for this.** Verified on a live site, its
`fraction_units` says **JPY = 100** (a defunct "sen") when the gateway minor unit is integer yen
(exponent 0), and `smallest_currency_fraction_value` is inconsistent (INR = `0.0`, USD = `0.01`).
Reading from it would overcharge every JPY invoice 100×. Instead the billing app owns a curated,
version-controlled **currency → minor-unit exponent** map (the Stripe zero-decimal / three-decimal
lists, made authoritative), seeded and the single source of the factor.

### Two precisions: amounts vs. unit rates (the Stripe split)

A flat bundle rate (₹1000/mo = `100000` paise) is a clean integer minor-unit amount. A **per-unit
metered rate** is not: a live snapshot rate of ₹0.30/GB-month is `0.001` paise/GB-day — below one
minor unit. Razorpay has no answer for this (paise-only); Stripe does — `unit_amount` is integer
minor units, but `unit_amount_decimal` carries up to 12 decimal places of sub-cent precision for
exactly this metered case.

We adopt the split:

- **Settled amounts** (line-item `amount`, `subtotal`, `total`, tax, credit, what the gateway
  charges) — **integer minor units**. Full stop.
- **Per-unit rates** (`Catalog Rate.rate`, the locked rate, the live snapshot rate) — **integer at
  a fixed sub-minor scale** of `MINOR × 10^6` ("rate units" — a ₹1000 bundle rate is
  `100000 × 10^6`; the real `€0.009/GB` transfer rate is `900000` rate units, exact). A flat bundle
  rate is just the whole-number case of the same scale. The scale is **currency-independent** (six
  extra decimals beyond the minor unit) and `10^6` (not `10^4`) leaves headroom for future
  micro-rates (per-API-call, GPU-second).

Rounding from rate units down to settled minor units happens **once, per line item**, at amount
computation — never on a stored rate, never on an intermediate.

### Rounding policy

- **Round half away from zero (half-up)** to the minor unit, applied **once per line item**.
- Proration (`days × rate / units_in_period`), tax (`subtotal × tax_rate`), discounts, and
  `qty × rate` all carry full integer/rate-unit precision through the multiply and divide, and
  round to minor units **only at the line-item boundary**. Summing already-rounded line items into
  a subtotal/total introduces no new rounding (integer addition is exact).
- The rounding direction and the half-rule are fixed here so two independent recomputations of the
  same invoice are bit-identical (the reconciliation job, ADR-adjacent, depends on this).
- **No whole-major-unit rounding of the total.** We do *not* apply the GST "round off to the nearest
  rupee" step: the charged total is paise-precise, gateways accept paise/cents natively, and the
  ERPNext push runs with **round-off disabled** so the Sales Invoice grand total equals our
  paise-precise total. This keeps charge ↔ receipt ↔ statutory-invoice parity with no `round_off`
  adjustment line. Half-away-from-zero, once per line item, is the *only* rounding in the system.

## Considered Options

- **Keep `Currency` (float), round at the gateway** — the status quo. Rejected: the error is
  already accumulated before the boundary; reconciliation and stored balances drift.
- **Decimal/`Decimal128` everywhere** — exact, but Frappe has no decimal fieldtype, it serializes
  as a string, and arithmetic needs a decimal library at every call site. Integer minor units are
  exact for money, native to the DB, and match the gateways 1:1. Rejected as heavier with no gain
  over integers for a fixed-scale domain.
- **Integer minor units for amounts *and* rates (Razorpay-only, no sub-minor rate)** — simpler, but
  cannot express a sub-paise metered rate without overcharging. Rejected in favour of the Stripe
  split above.

## Consequences

- **Field types flip to `Long Int`, never `Int`.** `Catalog Rate.rate` and every locked rate become
  `Long Int` (rate units); every amount/subtotal/total/tax/credit/balance field becomes `Long Int`
  (minor units). `Currency` is banned on money. Frappe's `Int` is `int(11)` (signed 32-bit) and caps
  at **₹2.1 crore** in paise — a rate in `minor × 10^6` blows past it immediately and a large annual
  invoice or team-spend rollup can too — so every money/rate column is `Long Int` (`bigint`).
- **Amounts are non-negative magnitudes + a direction field** (`entry_type` debit/credit,
  withholding "reduces", etc.). Genuine net/balance fields (`running_balance`, deltas) may hold a
  signed `Long Int`.
- **One shared `money` module** owns the ISO-4217 exponent table, `to_minor` / `from_minor`,
  `round_rate`, and the half-away-from-zero line-item rounding — the single place any conversion or
  rounding lives, mirroring the gateway-adapter seam. Nothing else does `× 100` or `/ 100`.
- **Gateway adapters simplify:** they pass the stored minor-unit integer straight through (Razorpay
  `amount`, Stripe `amount`) — the float→int conversion and its rounding bug are deleted. Inbound
  webhook amounts (also minor units) compare to `expected_collection` integer-exact.
- **The ERPNext sync converts at the boundary, round-off disabled:** ERPNext (the statutory SOR)
  holds major-unit decimals, so the one-way Paid→Sales Invoice push divides minor units by the
  currency factor to an `exponent`-dp decimal, with ERPNext **round-off turned off** so the Sales
  Invoice grand total matches the paise-precise charge. This and display are the only places money
  leaves integer form.
- **Desk display:** desk forms render a `Long Int` as a bare integer, so the doctypes humans open —
  **Catalog Rate, Invoice, Credit Ledger Entry** — carry a read-only **computed display field**
  (`…_display`, formatted via the currency factor). The integer stays the system-of-record; the SPA
  dashboards format from the integer at the edge.
- **Migration — convert the stored value, never recompute.** Backfill new columns as
  `round_half_up(old_float × factor)` from the **stored** amount (rates via the `10^6` scale, so
  `€0.009` → `900000` exactly); a verification pass asserts `round(old × factor) == new` per row
  before old columns drop. Settled (`Paid`) invoices are **never** recomputed from rates — that
  could shift a historical total by a paisa and desync the gateway receipt and ERPNext invoice.
  Folds into the rates-standalone migration (issue #27) and migration tooling (#23).
- **Metering unchanged on quantity:** `Usage Meter.quantity` (GB-days, transfer GB) stays `Float` —
  it is a physical measure, not money. Only its product with a rate rounds to minor units.
- **Forecast/dashboard:** all projection math is integer; the API divides to a display decimal at
  the very edge.
