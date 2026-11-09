# Payment-method setups that fail or are abandoned stay Pending Validation and are hidden from the customer

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-21](../../04-problem-discovery/problem-register.md) |
| Labels | `type:reliability`, `type:ux`, `priority:p1`, `area:billing-setup` |
| Priority | P1 |
| Complexity | M |

## Problem
Most teams that start adding a payment method end with no usable method and no record of the attempt they can see.

## Current behaviour
- 13 of 18 payment methods in production are `Pending Validation`, 6–20 days old; 10 teams have no other method (production backup, 3 Nov 2026).
- `list_payment_methods` filters out `Pending Validation` (`central/billing/api/dashboard/methods.py:34`).
- `apply_payment_method_event` marks non-card-failure events Ignored (`central/billing/payments/payments.py:395-417`); 4 Razorpay `payment.failed` events for pending UPI setups were Ignored.
- No job expires old pending rows.

## Expected outcome
A customer sees an unfinished or failed setup on Payments with the reason and a retry; failures are recorded as Failed; stale setups expire.

## Affected users
New customers; support agents.

## Evidence
See the current behaviour above; full detail in [CB-21](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
No active method means no welcome credit and no paid servers. Of 64 external teams, 6 tried a method and 2 finished.

## Solution options
- A. Show unfinished setups with reason + Retry; map failure events to Failed; expire after N days.
- B. Backend only: map failure events and expire; no UI.
- C. Reduce drop-off in the flow (in-dialog card field over hosted Checkout Session; pre-filled phone).

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
Build on existing issue 125 (record why adding a payment method failed: `Payment Setup Attempt`, failure capture, support list, alerts; not yet built at `a95b491e`). 125 gives support and engineering the reason. This issue adds what 125 leaves out: the customer sees the unfinished setup and can retry, and the Payment Method itself reaches an end state. Measure first (classify the 13 rows), add C if abandonment dominates.

## Acceptance criteria
- [ ] A Razorpay `payment.failed` or Stripe `setup_intent.setup_failed` for a pending method sets it to Failed with the gateway reason.
- [ ] Payments lists unfinished and failed setups from the last N days with the reason and a Retry that reopens the same instrument.
- [ ] Pending rows older than N days move to an expired state and stop showing.
- [ ] Tests cover each failure event per gateway; no test calls a gateway.

## Dependencies
Issue 125 (failure recording) first or together. D-04 (expiry period), D-05 (attempt limits). Measurement step above. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
