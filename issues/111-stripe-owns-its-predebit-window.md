# 111 — Let Stripe run its own pre-debit window, and read its mandate failures

**Type:** AFK · **Milestone:** SP · **ADR:** [0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md) §6, §7 · **Spec:** [payments-inr.md](../payments-inr.md)

## What to build

The pre-debit machinery was built against Razorpay, where we send the notice and hold the debit for
24 hours ourselves. Stripe's India flow does it differently and the two do not stack: confirming the
off-session PaymentIntent *is* the notification, and Stripe then holds the intent in `processing` for
**26 hours** before charging. Running our window on top means the customer waits about two days and
is told twice.

1. **`requires_predebit_notice` is false on the Stripe INR row**, true on Razorpay's. The flag already
   means "we owe the notice"; this is a configuration correction plus the seed/patch to match.
   `max_silent_charge` stays ₹15,000 on both — that one is the RBI's.
2. **Tolerate a long `processing`.** A Stripe India debit legitimately sits non-terminal for a day.
   Reconciliation ages an `Initiated` attempt out and escalates it; that clock has to know the
   difference between a charge nobody has answered for and one the gateway is deliberately holding.
   Read `processing.card.customer_notification.completes_at` off the intent and let the attempt wait
   until then.
3. **Map the mandate failure codes.** `payment_intent_mandate_invalid`,
   `india_recurring_payment_mandate_canceled` and `transaction_not_approved` mean the standing
   permission is gone or was refused, not that the card is bad. Retire the method, ask for
   re-authorisation, and do not count it against the card as a decline.
4. **Above the ceiling, Stripe offers an AFA link in the notification.** We still do not build that
   flow ([ADR 0005](../docs/adr/0005-inr-collection-emandate-threshold-prepaid.md) decision 4) — the
   customer goes to manual checkout or prepaid. Worth stating in code so nobody "fixes" it later.

## Acceptance criteria

- [ ] A Stripe INR mandate debit is confirmed straight away, with no 24h window armed by us and one
      notification, not two.
- [ ] A Razorpay mandate debit still gets our notice and our 24h hold, unchanged.
- [ ] An attempt held in `processing` is not escalated by reconciliation before the gateway's own
      completion time.
- [ ] The three mandate failure codes retire the method and raise re-authorisation, and are not
      treated as card declines.
- [ ] Full suite green.

## Blocked by

- [#107](107-stripe-india-card-mandate.md) (done)

## Notes

- Stripe's 26 hours is its own buffer over the RBI's 24. It is not configurable, so any deadline we
  present to a customer has to be derived from the intent rather than from our own clock.
