# Stripe first by capability, and wallet recharge is not the mandate surface

Date: 2026-08-10

[ADR 0022](0022-stripe-primary-razorpay-carries-the-rest.md) reached the right routing and wrote
down the wrong reasons for it. Checked against Stripe's own documentation, three of its premises are
false, and one of them inverts the argument the decision rests on:

| ADR 0022 said | Stripe's docs say |
|---|---|
| Stripe India has no recurring UPI mandate | Stripe supports UPI **and UPI AutoPay**, capped at ₹15,000 per recurring debit |
| UPI is domestic and exists only on an Indian Stripe account | UPI's *business* locations are ~35 countries and **India is not one of them**. The customer location is India. It is a rail for merchants **outside** India collecting from Indian customers |
| Netbanking is Razorpay's because Stripe India cannot carry it | Netbanking is not a Stripe payment method **anywhere** |
| Cards on Stripe means Visa, Mastercard, Amex and Diners, with e-mandates | Stripe registers India e-mandates for **Visa and Mastercard only**. An India-issued card that is neither cannot hold a Stripe mandate |

Sources: [UPI](https://docs.stripe.com/payments/upi),
[payment method support matrix](https://docs.stripe.com/payments/payment-methods/payment-method-support),
[India recurring payments](https://docs.stripe.com/india-recurring-payments),
[supported methods for Stripe accounts in India](https://support.stripe.com/questions/supported-payment-methods-currencies-and-businesses-for-stripe-accounts-in-india).

So it is not true that being an Indian Stripe merchant is what *gives* us UPI. It is what **costs**
us UPI. That is a real trade we are making, and it should be written down as a trade rather than as a
capability we imagined we were buying.

ADR 0022 also treats "adding a payment method" as one surface. Billing has two, and they have
different instrument sets — which is why a tile list that serves both ends up offering netbanking for
auto-pay and then explaining that it doesn't work.

## Decision

**1. We are a Stripe India merchant, and we accept what that costs.** INR settles domestically and we
avoid cross-border fees and authorisation loss on Indian cards. The price is that this account cannot
take UPI, netbanking or RuPay at all. Razorpay exists to cover exactly that gap and nothing else.

**2. Stripe is primary by capability, not by preference.** Every instrument Stripe India can carry
goes to Stripe. Razorpay is consulted only where Stripe cannot serve the instrument or the network.
The rule is mechanical, so a Stripe product change moves a rail without re-opening the decision.

**3. The two surfaces are separate, and each has its own instrument list.**

*Wallet recharge* (one-time, customer present, no ceiling):

| Instrument | Gateway | Why |
|---|---|---|
| Card — Visa / Mastercard / Amex | **Stripe** | Stripe India carries these |
| RuPay card | **Razorpay** | Stripe carries no RuPay |
| UPI | **Razorpay** | Stripe India cannot accept UPI |
| Netbanking | **Razorpay** | Stripe has no netbanking product |

*Auto-pay mandate* (off-session, customer absent, ₹15,000 ceiling per [ADR 0005](0005-inr-collection-emandate-threshold-prepaid.md)):

| Instrument | Gateway | Why |
|---|---|---|
| Card — Visa / Mastercard | **Stripe** | Stripe registers India e-mandates for these two networks |
| Card — RuPay | **Razorpay** | Stripe will not register a mandate on RuPay |
| Card — Amex / Diners | **nobody** | Neither rail registers a mandate on them, so these cards cannot auto-pay at all |
| UPI Autopay | **Razorpay** | Stripe India cannot accept UPI |

**Amex and Diners can pay, but cannot be saved.** Razorpay's standing instructions cover Visa,
Mastercard and RuPay; Stripe covers Visa and Mastercard. Between them, an Amex or Diners card can top
up a wallet and pay an invoice on-session, and nothing can auto-charge it. That is a real gap and the
surface has to say so, because the alternative is a customer authorising a mandate that fails at
registration and landing in dunning without knowing why. Prepaid is the answer we offer them.

Netbanking never appears on the mandate surface. It is a one-time rail and offering it there is a
promise we cannot keep.

**4. ADR 0022's open question is closed: all UPI is Razorpay's.** Not as a preference between two
working options — Stripe India cannot take UPI at all. This restores the invariant 0022 wanted and
could not have: **no instrument spans both gateways**, so no instrument reconciles or refunds in two
places.

**5. We still do not detect the card network. We ask, and we say why.** The mandate surface names the
two networks Stripe can hold a mandate for, and offers the other rail beside it for everything else.
A tile the customer taps is a question we asked; a BIN table is a guess we cannot check, and Stripe
Elements iframes the PAN regardless.

**6. The pre-debit notification belongs to whoever runs the rail.** On Stripe, confirming the
off-session PaymentIntent *is* the notification: the bank notifies the customer and Stripe holds the
intent in `processing` for **26 hours** before charging. Our own 24-hour notice-then-charge window
must not run on top of that, or the customer waits two days and is told twice. So
`requires_predebit_notice` is **false on the Stripe INR row and true on the Razorpay one**, and the
attempt model has to tolerate an intent sitting in `processing` for a day without reconciliation
ageing it out. The ₹15,000 ceiling stays on both rows: it is the RBI's, not the provider's.

**7. Mandate failures are terminal for the method, not for the card.**
`payment_intent_mandate_invalid`, `india_recurring_payment_mandate_canceled` and
`transaction_not_approved` mean the standing permission is gone. The method is retired and the
customer is asked to re-authorise; the card itself may be perfectly good, so this is not a decline to
count against it.

## What this rules out

**A non-India Stripe entity.** It would carry UPI and UPI AutoPay, which is tempting given how much
of India pays that way. It would also make every Indian card charge cross-border, with worse
authorisation, FX, and a harder RBI recurring story on the volume that actually matters to us. We are
choosing domestic settlement and paying for it in one gateway's worth of coverage.

**One picker for both surfaces.** Recharge and mandate ask different questions, carry different
ceilings and fail differently. A shared list only looks economical until it has to explain itself.

**Routing one-time UPI to Stripe** ([ADR 0022](0022-stripe-primary-razorpay-carries-the-rest.md)'s
open question). It was never available.

## Consequences

- ADR 0022's decisions **2** (the instrument table) and **3** (one picker) are replaced by decisions 3
  and 5 above. Its decisions 4 (gateway is a property of the method), 5 (terminal-decline fallback),
  6 (capability on the currency row), 7 (`auto_charge`) and 8 (routing as configuration) stand.
- [ADR 0005](0005-inr-collection-emandate-threshold-prepaid.md)'s threshold behaviour is untouched
  for the third time in three ADRs. It keeps surviving because it was never about a gateway.
- The shipped picker offers netbanking and marks it unsaveable; that tile moves to recharge.
- Recharge currently resolves its gateway from the currency default, which sends every INR top-up to
  one provider. It has to resolve from the instrument instead, exactly as the mandate surface does.
- **Amex and Diners hold no mandate anywhere** (checked: [Razorpay subscriptions](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods/)
  supports standing instructions on Visa, Mastercard and RuPay). Those customers top up a wallet or
  pay each invoice; the auto-pay surface says so rather than offering a tile that fails at
  registration.
- **Razorpay's eNACH** (bank mandate over netbanking, debit card or Aadhaar) is a rail we do not use.
  It would give a card-less or Amex-only customer a way to auto-pay, and it is worth its own decision
  rather than being smuggled in here.
