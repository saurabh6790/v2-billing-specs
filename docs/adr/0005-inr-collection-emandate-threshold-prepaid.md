# Payment methods are Stripe-only; INR collection is e-mandate up to ₹15k, then a customer-chosen split

Date: 2026-06-15

> **Partly superseded (2026-08-08) by [ADR 0022](0022-stripe-primary-razorpay-carries-the-rest.md).**
> Decisions **1–3** (which gateway carries which rail) and **6** (capabilities declared per adapter)
> no longer hold: we are a Stripe India merchant, Stripe takes all cards including Indian card
> e-mandates, and Razorpay narrows to RuPay, UPI Autopay and netbanking. The silent-debit
> capabilities move onto `Payment Gateway Currency`, because Stripe is ceilingless for USD and capped
> at ₹15,000 for INR. Decision 5's mode names change with it (`stripe_auto` and `emandate` collapse
> into `auto_charge`).
>
> **Decisions 4 and 5's behaviour stand.** The ₹15,000 ceiling is an RBI rule that applies to every
> India gateway including Stripe, so the threshold trip, the `action_required` state, the
> manual-checkout/prepaid choice and the hysteresis are all unchanged. The reasoning below is still
> the reasoning; only the gateway names in it have moved.

The v2 billing engine is **usage-based and variable** (DigitalOcean/AWS/OCI-style):
a team's monthly bill floats with what it ran — 10 VMs at ₹1,000 one month, more
or less the next. There is no fixed subscription amount. The collection layer has
to charge *whatever this month's invoice totals*, on demand.

That requirement collides with how recurring payments work in India. We
investigated using Razorpay for saved payment methods (UPI Autopay / card
e-mandate) and for Razorpay Subscriptions, and confirmed:

- **The ₹15,000 cap is an RBI rule, not a Razorpay limitation.** Any *off-session*
  (silent) recurring debit **above ₹15,000 requires fresh Additional Factor
  Authentication (AFA) every cycle** — the bank sends a pre-debit notification
  *and* an AFA link (valid 72h); the debit happens only after the customer
  authenticates. This applies to card e-mandate **and** UPI Autopay, on **every**
  India gateway (Razorpay, Stripe India, …). The ₹1,00,000 exception is
  category-locked to insurance / mutual-fund SIPs / credit-card bills — cloud/SaaS
  does not qualify.
- **Razorpay Subscriptions do not escape it.** A subscription debit (plan +
  add-ons) over ₹15k hits the same per-cycle AFA wall. A "zero plan + consumption
  as add-ons" structure is in fact *worse* — the customer authenticates against
  the (near-zero) plan amount at creation, so nearly every cycle's add-on exceeds
  it and re-prompts. It also couples our usage→invoice engine to Razorpay's
  Plan/Subscription/Invoice objects (a second billing source of truth).
- **Stripe off-session has no such cap** and charges arbitrary amounts on demand —
  the right primitive for variable postpaid billing — but Stripe domestic-India
  recurring is itself RBI-constrained, so in practice Stripe = international.
- **The ₹15k cap only applies *off-session*.** A customer *present* at a checkout
  authenticates with OTP and can pay **any amount** — an ordinary on-session
  payment, no special handling.
- **Razorpay→PayPal is one-time only.** Razorpay's PayPal offering is for
  accepting one-time international payments; it does not expose PayPal's recurring
  primitives. PayPal is a *method inside Razorpay*, not a separate gateway.

See [payments-inr.md](../../payments-inr.md) for the full case matrix.

## Decision

Two distinct money flows, each routed to the gateway that can actually serve it,
plus a **customer-chosen split at the ₹15k threshold** ("Approach B").

1. **Saved payment methods (off-session auto-charge) are Stripe-only.** The
   Stripe SetupIntent → off-session PaymentIntent flow charges the variable
   monthly invoice with no subscription. The **trust-tier cap** bounds an
   otherwise-ceilingless off-session charge.

2. **One-time top-ups (prepaid wallet) are routed by currency.** INR → Razorpay
   (cards/UPI/netbanking); international → Stripe or **Razorpay→PayPal**. Top-ups
   are on-session, so they carry no ₹15k limit and need no mandate.

3. **INR auto-charge runs on Razorpay e-mandate, but only while it stays silent
   (≤ ₹15,000/cycle).** Registration is a one-time AFA; each cycle a pre-debit
   notification precedes the off-session debit.

4. **At the threshold, the customer chooses — they are never silently blocked.**
   When an e-mandate customer's invoice/forecast crosses ₹15,000, the system stops
   trying to auto-charge silently and raises an **"Action Required"** state. The
   account keeps running (not suspended) until the customer picks one of:
   - **Manual checkout per invoice** — pay each invoice on-session via Razorpay
     (OTP, any amount). Reuses the one-time top-up/checkout machinery.
   - **Prepaid wallet** — fund credits via Razorpay top-ups; usage draws down the
     wallet (the existing credit waterfall, see [credits.md](../../credits.md)).
   We do **not** build the off-session >₹15k AFA-link auto-charge state machine.

5. **A `collection_mode` per team/subscription drives charging and dunning copy:**
   `stripe_auto` (intl postpaid) · `emandate` (INR ≤₹15k postpaid) ·
   `manual_checkout` (INR, pay-per-invoice) · `prepaid` (wallet). `action_required`
   is the transient state between e-mandate tripping the threshold and the
   customer choosing.

6. **The collection layer is capability-driven, not hardcoded.** Each adapter
   declares `supports_off_session_charge`, `max_silent_charge` (Stripe = ∞,
   Razorpay = ₹15,000), `requires_predebit_notice`, and supported currencies. The
   charge loop asks *"who can pull `amount` in `currency` silently now?"* and falls
   back to the customer-chosen path — so a future fourth gateway is one more
   capability row, not a rewrite.

## Consequences

- **The standalone PayPal adapter ([#25](../../issues/25-paypal-adapter.md)) is
  retired.** PayPal becomes a Razorpay checkout method (one-time top-ups only),
  not a `GatewayAdapter`.
- **Razorpay Subscriptions are not used.** The usage→price-lock→invoice engine
  stays the single billing source of truth.
- **The Razorpay card/UPI e-mandate code stays**, but gated to ≤₹15k and extended
  with the pre-debit-notification step. Supersedes the "cards are exempt, any
  amount" line in [payments.md](../../payments.md) §Settlement & mandates and the
  UPI-₹1L framing in [#29](../../issues/29-razorpay-card-or-upi-gateway-aware-add.md).
- **Collection bifurcates and dunning copy changes.** Postpaid (Stripe/e-mandate)
  → card-style retries; manual/prepaid → "pay this invoice" / "top up your
  wallet." Dunning ([#14](../../issues/14-retry-dunning-suspension.md)) gains a
  mode-aware branch.
- **No large-INR silent auto-charge exists, by design.** This is an RBI limit, not
  a gap; prepaid wallet is the resilient answer and we already built it
  ([#06](../../issues/06-credit-ledger-wallet.md), [#11](../../issues/11-credit-application-waterfall.md)).
- **A lean v1 is available:** skip the ≤₹15k e-mandate entirely at first — all INR
  is `manual_checkout` or `prepaid` (both on-session, zero AFA machinery), Stripe
  does international postpaid. Add silent e-mandate later only if low-tier churn
  justifies the pre-debit plumbing.
- **New build:** [#60](../../issues/60-inr-collection-mode-threshold-action-required.md).
