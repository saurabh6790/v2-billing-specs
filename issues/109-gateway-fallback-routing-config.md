# 109 — Fallback on a terminal decline; routing lives in settings, with the success rate to judge it

**Type:** AFK · **Milestone:** SP · **ADR:** [0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §5, §8 · **Spec:** [payments.md](../payments.md) (Settlement fallback)

## What to build

The picker removes RuPay-by-surprise, but an ordinary Visa can still fail Stripe validation. The
second rail is the safety net for that, and it is mostly reuse: a Razorpay method joins the ordered
list from [#28](28-secondary-payment-method-fallback.md), which already settles each method on its own
gateway.

1. **Fallback fires only on a terminal decline** — `card_declined`, `card_not_supported`,
   `authentication_failed`. Network timeouts, `processing` and abandoned 3DS are **ambiguous**: the
   charge may yet succeed, so they never fall back and reconciliation
   ([#21](21-reconciliation-job.md)) resolves them. Getting this wrong double-charges a customer.
2. **A fallback is a new Payment Attempt** with its own idempotency key, created only after the prior
   attempt is terminal. One in-flight attempt per invoice, held by the existing `Invoice … FOR UPDATE`
   lock.
3. **Off-session failures have no interactive fallback.** Nobody is present to authenticate on the
   other rail, so they degrade to dunning plus an "add another way to pay" notification. That is the
   escalate-don't-repeat rule already decided in [#28](28-secondary-payment-method-fallback.md),
   unchanged.
4. **On-session, one tap to the alternative, amount prefilled.** The customer is never shown an empty
   second card form.
5. **Routing is configuration.** Billing Settings carries a per-currency primary gateway and an
   `enable_gateway_fallback` switch, so the routing bet can be reversed without a deploy.
6. **Report attempt success rate by gateway × network × currency**, from the day this ships. Domestic
   gateways with local acquirer routing commonly beat cross-border ones on authorisation rate; this
   milestone bets Stripe India is not beaten by enough to matter. A bet with no number attached to it
   cannot be settled.

## Acceptance criteria

- [x] A terminal decline on Stripe offers the Razorpay rail once, with the amount prefilled
      (`get_fallback_offer`), and the resulting method carries `fallback_reason = stripe_decline` —
      verified server-side against a real terminal attempt rather than taken from the client.
- [x] A timeout, a `processing` status and an abandoned 3DS each leave the attempt alone and produce
      no second charge; reconciliation resolves them.
- [x] No second attempt is created while the first is non-terminal — the collector stops on an
      ambiguous failure instead of rotating, covered end to end by
      `TestOneInvoiceIsNeverChargedTwiceAcrossRails`.
- [x] An off-session failure creates no interactive prompt and escalates to dunning with the
      add-a-method notification (`add_payment_method`), raised only once something has actually been
      tried and refused.
- [~] Billing Settings exposes `enable_gateway_fallback`. The **per-currency primary gateway was
      deliberately not duplicated there** — it is already the `is_default` flag on `Payment Gateway
      Currency`, and two places to set one routing rule is a bug waiting to happen.
- [x] A report splits attempt success rate by gateway, card network and currency, with money split
      per currency.
- [x] Full suite green (one pre-existing capacity-filter failure, unrelated), including a test that
      the same invoice is never charged twice across rails.

## Blocked by

- [#108](108-instrument-picker-add-method.md)

## Notes

- Card network is known for a Stripe method (the brand comes back on the PaymentMethod object) and
  known by construction for a RuPay one. No BIN table is needed for the report either.

**Done.** `8cd2d38` on `feat/stripe-primary-gateway`; the three loose ends closed on
`feat/fallback-loose-ends` (`ca55a41`, `f672437`). Tests: `test_gateway_fallback` (18).
