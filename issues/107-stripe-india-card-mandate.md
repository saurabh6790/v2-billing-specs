# 107 — Stripe India card e-mandate: register it, debit it, notify before every debit

**Type:** AFK · **Milestone:** SP · **ADR:** [0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) §1, §2 · **Spec:** [payments.md](../payments.md), [payments-inr.md](../payments-inr.md)

## What to build

An INR card saved for auto-pay currently registers a Razorpay mandate. It should register a **Stripe
India** one. That is the whole slice, and most of the difficulty is that an Indian recurring card
charge is not the international off-session flow with a different currency on it.

1. **Stripe India account, INR settling domestically.** UPI is a domestic rail and only exists on an
   Indian Stripe account, and an international entity charging Indian cards cross-border would carry
   worse authorisation rates plus FX and cross-border fees. Stripe-primary-for-India is only true in
   this form.
2. **Registration is a mandate, not a SetupIntent with extra fields.** India requires mandate data at
   setup (amount, frequency, the customer's AFA) and returns a mandate reference the later debits
   quote. Registration is on-session and one-time.
3. **The debit carries the pre-debit notification.** `requires_predebit_notice` on the Stripe INR
   currency row is true, so every off-session debit is preceded by the notice, exactly as the Razorpay
   path does today. Same notification suite, same timing rules.
4. **The ₹15,000 ceiling applies unchanged.** Above it there is no silent debit on this rail either;
   the invoice or forecast trips `action_required` and the customer picks manual checkout or prepaid.
5. **Existing Razorpay card mandates are grandfathered.** No migration, no re-registration. Fresh AFA
   is a churn event with nothing in it for the customer, so live mandates run until they lapse and
   only new registrations follow the new routing. Both mandate implementations stay in the codebase
   through the transition.
6. **Webhooks and reconciliation cover both rails.** Mandate lifecycle events from Stripe India
   (authorised, revoked, failed) land on the existing signature-first spine and mark the Payment
   Method the same way Razorpay's do.

## Acceptance criteria

- [ ] An INR team can save a card and end up with an `active` Payment Method whose `gateway` is
      Stripe and which carries a Stripe mandate reference.
- [ ] The monthly invoice for that team is debited off-session, after a pre-debit notification, and
      settles `Paid` only on the webhook.
- [ ] A debit that would exceed ₹15,000 is never attempted; the team trips `action_required` instead.
- [ ] A team with a live Razorpay card mandate keeps charging on Razorpay, untouched, and is not
      prompted to re-register.
- [ ] Mandate revoked or expired at the gateway marks the method and raises the same banner as a
      failed registration does.
- [ ] Reconciliation ([#21](21-reconciliation-job.md)) sweeps attempts on both gateways for one
      invoice. It keys on Payment Attempt, so this needs verifying rather than rebuilding.
- [ ] Full suite green, including the existing Razorpay mandate tests.

## Blocked by

- [#106](106-gateway-currency-capabilities-collection-mode-rename.md)

## Notes

- Test-mode Stripe India behaves differently from test-mode Stripe US on mandates; budget for the
  account setup, not just the code.
- The trust-tier cap still bounds the debit on top of the regulatory ceiling. `min(₹15,000, tier cap)`
  is the effective silent ceiling, as it already is on Razorpay.
