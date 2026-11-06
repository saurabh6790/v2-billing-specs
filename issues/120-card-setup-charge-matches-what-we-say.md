# 120 — Card setup must charge what the screen says it charges

**Type:** HITL · **Milestone:** TR · **Area:** `central/billing/gateways/` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

The onboarding payment step says that adding a payment method does not charge it. That is not true:

- **Stripe:** after the SetupIntent, `validate_payment_method` charges 50 minor units ($0.50 or ₹0.50)
  and refunds it at once. The customer sees a charge and a refund.
- **Razorpay:** the mandate order is ₹1 with `payment_capture: 1`, so it is captured.
  `validate_payment_method` does not charge again, and I found no refund for it in our code.
- **PayPal:** vault approval only. No charge.

## What to build

1. Check in the Razorpay dashboard whether the ₹1 registration payments are refunded on Razorpay's
   side. If not, refund it after the token is confirmed, the same as Stripe.
2. Decide whether Stripe needs the 50-unit charge at all. A confirmed SetupIntent already checks the
   card with the bank. If we keep it, say so on screen: "We charge ₹0.50 / $0.50 and refund it at once."
3. Make the onboarding text match the gateway the team will use.

## Acceptance criteria

- [ ] Every card setup either charges nothing, or the screen says what it charges and that it is refunded.
- [ ] No ₹1 registration payment is left unrefunded.

## Blocked by

The Razorpay check.
