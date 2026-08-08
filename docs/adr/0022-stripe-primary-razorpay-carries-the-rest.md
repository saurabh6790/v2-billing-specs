# Stripe is the primary rail; Razorpay carries what Stripe India cannot

Date: 2026-08-08

[ADR 0005](0005-inr-collection-emandate-threshold-prepaid.md) split the gateways by currency: Stripe
for international, Razorpay for everything INR. It was written when Stripe did not offer UPI, so
"Indian customer" and "Razorpay customer" were the same sentence.

That is no longer true, and the split has costs. Two gateways carrying comparable responsibility means
two saved-method models, two mandate implementations, two sets of dunning behaviour, and every new
billing feature built twice. The reason to keep them balanced has gone.

One thing has **not** changed, and reading this ADR as if it had would be the expensive mistake:

> **The ₹15,000 silent-debit ceiling is an RBI rule, not a Razorpay limitation.** It applies to Stripe
> India identically. Moving the rail does not move the ceiling.

Everything ADR 0005 decided about the threshold — the forecast trip, the `action_required` state, the
manual-checkout/prepaid choice, the hysteresis, the case matrix in
[payments-inr.md](../../payments-inr.md) — survives this ADR unchanged. What changes is which adapter
registers the mandate and pulls the debit, and how a customer arrives at a payment method.

## Decision

**1. We are a Stripe India merchant.** INR settles domestically. This is load-bearing: UPI is a
domestic rail and exists only on an Indian Stripe account, and an international Stripe entity charging
Indian cards cross-border would carry worse authorisation rates, FX and cross-border fees, and a
harder RBI recurring story. "Stripe primary for India" is only true in this form.

**2. Stripe is the default rail for everything it can carry.** All cards in all currencies, including
Indian card e-mandates for auto-charge. All international collection. Razorpay narrows to the cases
Stripe India cannot serve:

| Instrument | Purpose | Gateway |
|---|---|---|
| Card (Visa / Mastercard / Amex / Diners) | Save for auto-pay | **Stripe** (India card e-mandate; ₹15k ceiling applies) |
| Card (Visa / Mastercard / Amex / Diners) | One-time invoice or top-up | **Stripe** (on-session, no ceiling) |
| **RuPay card** | Either | **Razorpay** — Stripe India does not carry the network |
| UPI | One-time | **Stripe** (see the open question below) |
| UPI | Save for auto-pay | **Razorpay** — Stripe India has no recurring UPI mandate |
| Netbanking | One-time only | **Razorpay** |
| Any instrument, non-INR | Either | **Stripe** |

**3. The customer picks the instrument up front; the instrument picks the gateway.** An Indian team
adding a payment method sees four tiles — **UPI · Card · RuPay card · Netbanking** — which is an
ordinary Indian checkout, not our plumbing showing through. We do **not** detect the card network:
Stripe Elements iframes the PAN, so the raw digits never reach us, and a BIN table we cannot read is
not a design. The customer knows which card they hold because the network is printed on it.

The RuPay tile is labelled **"RuPay card"**, never "Other cards" — a customer holding an unusual Visa
would pick "Other" and land on the wrong rail.

**4. Gateway choice is a property of the method, not of the charge.** "Primary gateway" is the default
for *registering* a method. Once a Payment Method exists, its own `gateway` settles it for the rest of
its life. We never re-probe Stripe for a card we already know is RuPay, and a charge never shops
between gateways.

**5. Failure fallback is a safety net, not the mechanism.** The upfront picker removes
RuPay-by-surprise, but an ordinary Visa can still fail Stripe validation. When it does:

- Fallback fires **only on a terminal decline** — `card_declined`, `card_not_supported`,
  `authentication_failed`. Network timeouts, `processing`, and abandoned 3DS are **ambiguous and never
  fall back**; the reconciliation job ([#21](../../issues/21-reconciliation-job.md)) resolves them.
- The fallback creates a **new Payment Attempt** with its own idempotency key, and only once the prior
  attempt is terminal. One in-flight attempt per invoice, held by the existing `Invoice … FOR UPDATE`
  lock.
- **Off-session failures have no interactive fallback.** Nobody is present. They degrade to dunning
  plus an "add another way to pay" notification, consistent with the escalate-don't-repeat rule
  decided in [#28](../../issues/28-secondary-payment-method-fallback.md).
- The customer is **never shown an empty second card form**. One tap to the alternative, amount
  prefilled.

**6. `max_silent_charge` and `requires_predebit_notice` move onto `Payment Gateway Currency`.** ADR
0005 declared them per-adapter scalars — "Stripe = ∞, Razorpay = ₹15,000". That is now false: Stripe
is ∞ for USD and ₹15,000 for INR. The capability is a property of *(gateway, currency)*, which is
exactly the child table [#46](../../issues/46-multi-currency-gateway-config.md) already introduced. No
new DocType.

**7. `collection_mode` drops its gateway names.** `stripe_auto` and `emandate` described providers
pretending to be behaviours, and under this ADR an Indian Stripe card mandate is both at once. They
collapse:

```
auto_charge  ·  manual_checkout  ·  prepaid  ·  action_required
```

Whether the ₹15k ceiling applies is derived at charge time from `(currency, gateway capability)` —
which is what the capability-driven resolver in ADR 0005 §6 was always meant to do. The mode names
what the customer experiences.

**8. The routing policy is configuration, not code.** Billing Settings carries a per-currency primary
gateway and an `enable_gateway_fallback` switch. Payment Method gains `fallback_reason`
(`rupay` / `stripe_decline` / `customer_choice`), and attempt success rate is reported by
**gateway × network × currency** from the first day this ships.

Domestic gateways with local acquirer routing commonly beat cross-border ones on authorisation rate.
This ADR bets they don't beat Stripe India by enough to matter. That bet needs a number attached to
it and a way to be reversed without a deploy.

## The open question: one-time UPI

Decision 2 routes one-time UPI to Stripe, on the "Stripe takes everything it can" principle. There is
a real argument for sending **all** UPI to Razorpay instead, recorded here rather than settled:

1. UPI Autopay is Razorpay's regardless — that part is forced. So Stripe-for-one-time-UPI eliminates
   no gateway; it makes the *same instrument* reconcile in two places. A customer who tops up by UPI
   and later saves a UPI mandate ends up with two gateway customer records for one method.
2. Refunds route to the originating gateway, so split UPI means UPI refunds come from two ledgers.
3. UPI is zero-MDR by regulation; Stripe India still applies a platform fee to it. The cost comparison
   is neutral at best.

Routing all UPI to Razorpay yields a cleaner invariant — **Stripe owns cards and international;
Razorpay owns UPI, RuPay and netbanking; no instrument spans both gateways** — which removes a class
of reconciliation bug outright. Resolve this against real Stripe India UPI pricing before build.

## What this rules out

**Card-network detection.** No BIN table, no `brand`-signal sniffing off Stripe Elements, no
"unknown brand → probably RuPay" heuristic. The customer's own choice is the signal, and it is free
and exact.

**Gateway shopping per charge.** A charge does not ask which gateway is cheapest or healthiest right
now. Routing is fixed when the method is created. Load-balancing between gateways is a different
system with a different failure mode, and nothing here needs it.

**Migrating existing Razorpay card mandates to Stripe.** See below.

## Consequences

**Existing Razorpay card e-mandates are grandfathered, not migrated.** Re-registering a mandate means
a fresh AFA — a churn event with no benefit to the customer. Live mandates run until they lapse
naturally; only new registrations follow the table in decision 2. This means both mandate
implementations stay in the codebase through the transition, and Razorpay's cannot be deleted on the
day this ships.

**The INR collection machinery is untouched.** `payments-inr.md`'s threshold, states and 13-case
matrix all hold. The only edit that document needs is *who runs the mandate*.

**Two rails now settle one team.** A team can hold a Stripe card and a Razorpay UPI mandate at once —
which [#28](../../issues/28-secondary-payment-method-fallback.md)'s ordered method list already models,
since `gateway` is per-method and settlement follows the method. Gateway fallback is therefore mostly
*reuse*: "add a Razorpay method to the ordered list", not a new subsystem.

**Reconciliation must sweep both gateways for one invoice's attempts.** The job keys on Payment
Attempt rather than on invoice, so this should already hold — it needs verifying, not rebuilding.

**The `stripe_auto` / `emandate` rename touches live data.** A Select rename with rows in the field is
the annoying kind of patch; doing it now, while the value set is small, is cheaper than doing it after
the picker ships.

Supersedes decisions 1–3 and 6 of
[ADR 0005](0005-inr-collection-emandate-threshold-prepaid.md) (which gateway carries which rail, and
the shape of the capability declarations). ADR 0005's threshold behaviour — decisions 4 and 5 — stands.
