# 110 — Split recharge from auto-pay, and route each instrument by what Stripe can actually do

**Type:** AFK · **Milestone:** SP · **ADR:** [0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md) · **Spec:** [payments.md](../payments.md) (Payment Method lifecycle), [credits.md](credits.md)

## What to build

[#108](108-instrument-picker-add-method.md) shipped one picker built on ADR 0022's capability table.
Three entries in that table were wrong and the surfaces were conflated, so this corrects both. The
routing rule is now mechanical: **Stripe takes every instrument a Stripe India account can carry;
Razorpay takes only what it cannot.**

1. **Two instrument catalogues, not one.** Wallet recharge offers Card · RuPay card · UPI ·
   Netbanking. Auto-pay setup offers Card · RuPay card · UPI Autopay. Netbanking leaves the mandate
   surface entirely — it pays once and saves nothing, and today it is rendered there only to be
   disabled with an explanation.
2. **Correct the rails.** UPI (one-time as well as Autopay) is **Razorpay's**: a Stripe India account
   cannot accept UPI at all, which also closes ADR 0022's open question. Netbanking is Razorpay's
   because Stripe has no netbanking product anywhere. Cards are Stripe's, except that a **mandate**
   on RuPay, Amex or Diners falls to Razorpay — Stripe registers India e-mandates on Visa and
   Mastercard only.
3. **Top-ups resolve from the instrument, not the currency default.** `resolve_gateway_for_currency`
   sends every INR top-up to whichever gateway holds the INR default, which is how a card top-up ends
   up on the wrong rail. The recharge surface picks its gateway the same way the mandate surface
   does.
4. **Say what the card rail takes.** The auto-pay card tile names Visa and Mastercard, with the RuPay
   tile beside it. We still never detect the network; we ask, and now we also explain.
5. **`fallback_reason` gains `network_unsupported`** for a mandate that went to Razorpay because
   Stripe would not register the network — distinct from `rupay` (customer picked the tile) and
   `stripe_decline` (a card Stripe refused).

## Acceptance criteria

- [x] Recharge and mandate surfaces return different instrument lists; netbanking appears only on
      recharge.
- [x] UPI, in both forms, resolves to Razorpay. No code path offers UPI on Stripe.
- [x] A card top-up resolves to Stripe even though Razorpay holds the INR default.
- [x] An Amex or Diners **mandate** resolves to Razorpay; the same card **tops up** on Stripe.
- [x] The auto-pay card tile names the networks it accepts.
- [x] No customer-facing string names a gateway, on either surface.
- [x] Full suite green; [#108](108-instrument-picker-add-method.md)'s tests are corrected rather than
      deleted.

## Blocked by

- [#108](108-instrument-picker-add-method.md) (done — this corrects it)

## Notes

- **Unconfirmed:** whether Razorpay will register a recurring mandate on Amex or Diners. If it will
  not, those customers can top up but cannot auto-pay, and prepaid is the honest answer to offer them.
  Worth checking before the tile promises anything.

**Done** on `feat/stripe-primary-gateway`: `126cce5`. Tests: six in `TestPaymentMethodOptions`
covering both surfaces, the rails, the tile labels and the Razorpay-registered card.
