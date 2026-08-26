# 38 — Payments boundary → minor units; gateway adapters pass minor units straight through

> **OBSOLETE — do not build.** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units money model was never implemented and is **deprecated**; money is stored as float `Currency` in major units (see [catalog-pricing-decisions.md](../catalog-pricing-decisions.md)). Any minor-unit conversion a specific gateway requires happens locally in that adapter, not as a system-wide storage model. This migration is retired.

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), [payments.md](../payments.md)

## What to build

Flip the payment-side money fields to `Long Int` minor units and **delete the float→int conversion
at the gateway boundary** — the integer billing computed is now the integer charged. Razorpay
`amount` is paise and Stripe `amount` is cents, so the stored minor-unit value passes straight
through; inbound webhook amounts (also minor units) compare integer-exact to `expected_collection`.

## What to build (changes)

1. **Schema → `Long Int` (minor units):** `Payment Attempt.amount`, `Refund.amount`,
   `Payment Method.mandate_max_amount`, and entitlement/trust-tier `max_spend`.
2. **Adapter pass-through:** `charge()`/`refund()` read the minor-unit amount and hand it directly to
   Razorpay/Stripe — remove any `× 100` / `int(round(...))` boundary conversion (it was the rounding-bug site).
3. **Webhook compare:** captured/refunded amounts from webhooks compare to `expected_collection` /
   refund amount as integers; mandate-ceiling check (`mandate_max_amount`) is an integer compare.
4. **Migration:** convert the four fields `round_half_up(old_float × factor)`; assert round-trip; idempotent.

## Acceptance criteria

- [ ] `Payment Attempt.amount`, `Refund.amount`, `mandate_max_amount`, `max_spend` are `Long Int` minor units.
- [ ] Stripe and Razorpay adapters pass the stored integer to the gateway with no boundary float conversion; contract suites green.
- [ ] Inbound webhook amount reconciliation and mandate-ceiling checks are integer-exact.
- [ ] Migration converts the fields with per-row round-trip verification; re-runnable.
- [ ] Payment-attempt / refund / mandate tests green.

## Decisions baked in

- **Gateways already speak minor units** (Razorpay paise, Stripe cents) — internal representation now matches the wire, so the conversion (and its bug) is deleted.

## Blocked by

34 (`money` module), 36 (`expected_collection` in minor units, the charge target).
