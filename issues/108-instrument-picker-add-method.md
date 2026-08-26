# 108 — Add-method instrument picker: UPI · Card · RuPay card · Netbanking

**Type:** AFK · **Milestone:** SP · **ADR:** [0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §3, §4 · **Design:** [inr-collection-action-required.md](../docs/design/inr-collection-action-required.md) §3.0

## What to build

The customer picks the instrument; the instrument picks the gateway. This replaces the card-or-UPI
choice from [#29](29-razorpay-card-or-upi-gateway-aware-add.md), which assumed every INR method was a
Razorpay one.

1. **Four tiles for an INR team** — UPI, Card, RuPay card, Netbanking. It reads as an ordinary Indian
   checkout, which is the point: our routing should not be visible in it. Non-INR teams get the
   Stripe card form, no picker.
2. **The tile determines the gateway.** Card goes to Stripe (mandate for auto-pay, on-session for a
   one-time payment); RuPay card and UPI Autopay go to Razorpay; netbanking goes to Razorpay and is
   one-time only. The mapping lives beside the routing config from
   [#109](109-gateway-fallback-routing-config.md), not hardcoded in the dialog.
3. **No card-network detection anywhere.** Stripe Elements iframes the PAN, so the digits never reach
   us, and a BIN table we cannot read is not a design. The RuPay tile is labelled "RuPay card", never
   "Other cards" — a customer holding an unusual Visa would read "Other" as theirs and land on a rail
   that cannot take it.
4. **Gateway is fixed at method creation.** The stored `gateway` settles that method for the rest of
   its life. We never re-probe Stripe for a card we already know is RuPay, and a charge never shops
   between gateways.
5. **`fallback_reason`** is stamped when a method lands off the default rail: `rupay` when the
   customer picked the RuPay tile, `stripe_decline` when it came from a failed Stripe attempt
   ([#109](109-gateway-fallback-routing-config.md)), `customer_choice` otherwise.
6. **Gateway names stay out of the UI.** The customer has a card, a UPI ID or a bank account.

## Acceptance criteria

- [x] An INR team sees the four tiles; a USD/EUR team sees a card form and no picker.
- [x] Each tile registers on the gateway the ADR assigns it, and the resulting Payment Method stores
      that gateway.
- [x] Netbanking cannot be saved for auto-pay, and the UI says so before the customer taps it.
- [x] No BIN lookup, brand sniffing or "unknown brand means RuPay" heuristic exists in the codebase.
- [~] `fallback_reason` is set for the RuPay case and empty for a default-rail method.
      `stripe_decline` is not stamped yet — see [#109](109-gateway-fallback-routing-config.md).
- [x] The Razorpay hosted sheet is not trapped behind the dialog overlay (close before handoff,
      reopen on cancel).
- [x] No customer-facing string names a gateway.
- [x] Full suite green; [#29](29-razorpay-card-or-upi-gateway-aware-add.md)'s tests are updated rather
      than deleted.

## Blocked by

- [#107](107-stripe-india-card-mandate.md)

## Notes

- **Open question, resolve before building the UPI tile:** whether *one-time* UPI settles on Stripe or
  Razorpay (ADR 0022, "The open question"). UPI Autopay is Razorpay's either way, so routing one-time
  UPI to Stripe eliminates no gateway and makes one instrument reconcile in two places, with refunds
  coming from two ledgers. Routing all UPI to Razorpay gives a cleaner invariant. Settle it against
  real Stripe India UPI pricing; the tile is the same either way, only its target moves.

**Done** on `develop`: `91bcc72`. Tests: four in `TestPaymentMethodOptions`.
