# 106 — Silent-debit capability moves to (gateway, currency); `collection_mode` drops its gateway names

**Type:** AFK · **Milestone:** SP · **ADR:** [0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §6, §7 · **Spec:** [payments.md](../payments.md), [payments-inr.md](../payments-inr.md)

## What to build

The vocabulary change that everything else in this milestone stands on. Behaviour is unchanged when
it lands: the same teams get charged the same way, and the ₹15,000 trip fires on the same amounts.

1. **`max_silent_charge` and `requires_predebit_notice` move onto `Payment Gateway Currency`.** They
   were per-adapter scalars ("Stripe = ∞, Razorpay = ₹15,000"), which is now false: Stripe is
   ceilingless in USD and capped at ₹15,000 in INR, because the ceiling follows the currency and the
   merchant's country. The child table from [#46](46-multi-currency-gateway-config.md) already has the
   right shape, so this is two fields, not a DocType.
2. **The capability read moves with them.** Whatever asks "can anyone pull `amount` in `currency`
   silently right now?" reads the row for *(gateway, currency)*, falling back to no ceiling when
   `max_silent_charge` is empty. Adapters keep `supports_off_session_charge` — that one really is a
   property of the provider.
3. **`stripe_auto` and `emandate` collapse into `auto_charge`.** They named providers pretending to be
   behaviours, and an Indian Stripe card mandate is both at once. The mode set becomes
   `auto_charge` · `manual_checkout` · `prepaid` · `action_required`. Whether the ceiling applies is
   derived at charge time from *(currency, gateway capability)*, never from the mode.
4. **A patch rewrites the live rows.** Both old values map to `auto_charge`; nothing else moves. Every
   read of the retired values goes with it, including dunning copy, the banner feed, demo seeds and
   the simulator's `collection_mode.evaluate`.

Select option values are stored Title Case (`Auto Charge`, `Manual Checkout`, `Prepaid`,
`Action Required`); the snake_case names above are the spec's shorthand for them.

## Acceptance criteria

- [ ] `Payment Gateway Currency` carries `max_silent_charge` and `requires_predebit_notice`; the
      seeded roster sets Stripe INR = ₹15,000, Razorpay INR = ₹15,000, and leaves non-INR rows empty.
- [ ] The silent-charge decision reads the currency row, not an adapter constant. An empty
      `max_silent_charge` means no ceiling; the trust-tier cap still binds on top of it.
- [ ] `collection_mode` has four values, and `stripe_auto` / `emandate` appear nowhere in code,
      fixtures, seeds or tests.
- [ ] The patch maps every existing row, is re-runnable, and does not touch teams already in
      `manual_checkout`, `prepaid` or `action_required`.
- [ ] A ₹15,001 INR invoice on a Stripe mandate trips `action_required`, the same as it does on
      Razorpay today.
- [ ] A $20,000 USD invoice on a Stripe card is charged off-session without tripping anything.
- [ ] Full suite green.

## Blocked by

- [#46](46-multi-currency-gateway-config.md) (done)
- [#60](60-inr-collection-mode-threshold-action-required.md) (done)

## Notes

- Renaming a Select with live rows in it is the annoying kind of patch, and it only gets worse once
  the picker ships and the value set grows. Doing it first is the cheap ordering.
- The ₹15,000 ceiling is RBI, not Razorpay. Nothing here removes it, and a reviewer who reads this
  issue as "the cap goes away with Razorpay" has read it wrong.
