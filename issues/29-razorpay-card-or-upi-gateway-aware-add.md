# 29 — Add payment method: card-or-UPI choice, UPI ₹1L gate, currency-correct gateway

> **Superseded for the add-method dialog by [#108](108-instrument-picker-add-method.md)
> ([ADR 0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md)).** The card-or-UPI choice
> here assumed every INR method was a Razorpay one. INR teams now pick from four tiles —
> UPI · Card · RuPay card · Netbanking — and the card goes to Stripe India. The UPI ₹1,00,000 recurring
> gate and the bugs fixed below still hold.

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md) (Settlement & mandates)

## What to build

The "Add payment method" dialog forced UPI Autopay for everyone and resolved the wrong gateway. Make it currency- and adapter-aware:

1. **Razorpay (INR): let the team choose card *or* UPI** — don't force UPI. Razorpay does both rails as recurring tokens via the same Checkout → token → recurring-charge flow (`razorpay_adapter.setup_payment_method` takes `method` ∈ {`upi`, `card`}); `mandates.setup_card` mirrors `setup_mandate` for the card rail.
2. **Block UPI above the ₹1,00,000 recurring limit** (the MCC cap). `mandates.upi_eligibility(team)` blocks UPI when the trust-tier cap **or** the last invoice ≥ ₹1,00,000; the UI disables UPI with the reason and `setup_mandate` refuses as the server backstop. Cards have no such limit.
3. **Resolve the gateway by currency + adapter, not `is_default_for_currency`** — the demo flags a Stripe-INR gateway as the INR default, which was hiding UPI for INR teams. `dashboard._add_method_gateway(currency)` prefers a Razorpay gateway for the currency (INR → card + UPI); otherwise Stripe.
4. **Non-INR teams use Stripe, never Razorpay.** USD/EUR → card only, added with Stripe.js Elements + a SetupIntent (publishable key from the gateway; PAN never reaches the server).

## Bugs this fixes

- INR team with a small cap (e.g. ₹300) saw no card/UPI choice — options resolved to the default Stripe-INR gateway (card-only). Now resolves to Razorpay → choice shown, UPI allowed.
- Non-INR (USD/EUR) teams were shown "Set up with Razorpay". Now shown a Stripe card form.

## Acceptance criteria

- [x] INR team: dialog offers Card and UPI; UPI disabled with reason when cap/last-invoice ≥ ₹1,00,000, allowed below it.
- [x] `setup_mandate` refuses UPI above the limit (server backstop); `setup_card` works regardless.
- [x] `_add_method_gateway` returns Razorpay for INR even when a Stripe-INR gateway is the currency default; Stripe for currencies with no Razorpay.
- [x] USD/EUR team: card-only via Stripe Elements; Razorpay never shown.
- [x] Full `press_billing` suite green.

## Blocked by

08 (UPI mandate), 05 (Stripe card), 28 (fallback/priority) — all done.

**Status: done** (2026-06-05) — 245/245 tests pass; SPA builds; verified live (INR→Razorpay card+UPI, EUR→Stripe card, low-cap INR allows UPI).
