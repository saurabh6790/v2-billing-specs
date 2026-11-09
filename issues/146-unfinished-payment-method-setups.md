# 146 — Payment-method setups and top-ups that fail or are abandoned leave no end state and nothing the customer can see

**Type:** HITL · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:reliability` `type:ux` `priority:p1` `area:billing-setup`
**Area:** `dashboard/src/components/billing/`, `dashboard/src/components/AddMethodDialog.vue`, `central/billing/api/dashboard/`, `central/billing/payments/`
**Source:** [CB-21](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-04, an unfinished setup expires after 24 hours, and the customer is told.
>
> **HITL:** D-05 direction given (escalating lockout); confirm the details in [decision-briefs.md](../central-billing-teardown/13-brainstorming/decision-briefs.md) before building the lockout.

## Problem

Most teams that start adding a payment method end with no usable method and no record of the attempt they can see.

## Current behaviour

- 13 of 18 payment methods in production are `Pending Validation`, 6–20 days old; 10 teams have no other method (production backup, 3 Nov 2026).
- `list_payment_methods` filters out `Pending Validation` (`central/billing/api/dashboard/methods.py:34`).
- `apply_payment_method_event` marks non-card-failure events Ignored (`central/billing/payments/payments.py:395-417`); 4 Razorpay `payment.failed` events for pending UPI setups were Ignored.
- No job expires old pending rows.
- The only Top-up Order in production is `Created` (₹25,000) and never completed; nothing shows it to the customer.
- Measured: Stripe setup webhooks in production are 7 created, 8 `requires_action`, 3 succeeded, 1 failed. Most card setups stop at bank authentication.
- Reproduced on central.local (Stripe test mode): cancelling authentication leaves a hidden `Pending Validation` row, and the dialog shows Stripe's "…choose a different payment method" although retrying the same card works.

## What we want

A customer sees an unfinished or failed setup on Payments with the reason and a retry; failures are recorded as Failed; stale setups expire.

**Who it affects:** New customers; support agents.

**Why it matters:** No active method means no welcome credit and no paid servers. Of 64 external teams, 6 tried a method and 2 finished.

## Options

- A. Show unfinished setups with reason + Retry; map failure events to Failed; expire after N days.
- B. Backend only: map failure events and expire; no UI.
- C. Reduce drop-off in the flow (in-dialog card field over hosted Checkout Session; pre-filled phone).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

Build on existing issue 125 (record why adding a payment method failed: `Payment Setup Attempt`, failure capture, support list, alerts; not yet built at `a95b491e`). 125 gives support and engineering the reason. This issue adds what 125 leaves out: the customer sees the unfinished setup and can retry, and the Payment Method itself reaches an end state. Measure first (classify the 13 rows), add C if abandonment dominates.

## Acceptance criteria

- [ ] (D-05, after the details are confirmed) Failed setups lock further attempts for the team on an escalating schedule: after the 5th failure 10 min, then 30 min, 2 h, 6 h, and 24 h from the 10th consecutive failure; the wait is shown; a success resets the count; the 10th failure alerts billing operators.
- [ ] A setup not finished in 24 hours is marked Expired.
- [ ] When a setup expires, the team's billing contacts get an email and an in-app notice: "Your card or UPI setup was not finished, so it was not saved. Add it again from Billing."
- [ ] A Razorpay `payment.failed` or Stripe `setup_intent.setup_failed` for a pending method sets it to Failed with the gateway reason.
- [ ] Payments lists unfinished and failed setups from the last N days with the reason and a Retry that reopens the same instrument.
- [ ] Pending rows older than N days move to an expired state and stop showing.
- [ ] Tests cover each failure event per gateway; no test calls a gateway.
- [ ] After a cancelled authentication the dialog says "Your bank didn't confirm the card. Try again, or use another card." with Try again first.

## Dependencies

Issue 125 (failure recording) first or together. D-04 decided (24 h, notify). D-05 direction given; details to confirm. Measurement step above.
