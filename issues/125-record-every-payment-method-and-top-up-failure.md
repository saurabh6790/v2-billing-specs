# 125 — Record why adding a payment method or topping up the wallet failed

**Type:** AFK · **Milestone:** post · **Area:** `central/billing/api/dashboard/methods.py`, `central/billing/api/dashboard/invoices.py` (`create_topup_order`, `confirm_topup`), `central/billing/payments/payments.py`, `central/billing/payments/mandates.py`, `central/billing/gateways/`, `dashboard/src/composables/useAddStripeCard.ts`, `dashboard/src/composables/useTopup.ts`, `dashboard/src/lib/gateway.ts`

## Problem

Customers tell support that adding a card or topping up their wallet failed. We cannot find out why. We cannot ask for their card details to try again, the logs do not say what failed, and we cannot always get the reason back from the gateway afterwards.

What the code records today:

- **A failure in the browser never reaches Central.** Stripe refuses most cards in the browser, in `stripe.createPaymentMethod` or `stripe.confirmCardSetup` (`useAddStripeCard.ts`). The console shows the message, and nothing is sent to the server. The Payment Method row stays in `Pending Validation` with no reason.
- **Razorpay Checkout reports only "cancelled".** `gateway.ts` handles `modal.ondismiss` and the success handler. It does not listen to Checkout's `payment.failed` event, so a refused UPI mandate or card looks the same as a customer closing the sheet.
- **The micro-charge decline is dropped.** `StripeAdapter.validate_payment_method` catches `stripe.error.CardError` and returns `False`. The decline code, the message and the charge id are lost. The Payment Method only records `reason="validation failed"`.
- **We do not get the setup failure from Stripe.** The Stripe webhook subscribes to `payment_intent.*`, `charge.refunded` and `mandate.updated`, but not to `setup_intent.setup_failed` or `setup_intent.requires_action`.
- **A top-up that fails to confirm leaves no record.** `confirm_topup` throws a message when the signature or the capture does not check out. Nothing records the team, the order, the payment id or the reason.
- **A server-side gateway error goes only to the Error Log.** `customer_safe_gateway_errors` logs a traceback with no team, user, method or order on it. Support cannot find it by team, and the Error Log is pruned.

## What we want

Support types a team or a user's email and sees each attempt to add a payment method or top up: when it was, which gateway and instrument, at which step it stopped, and the gateway's own code and message. Billing engineers can see the failure rate per gateway and per code, and get told when it jumps.

## TODO — one record per attempt

- [ ] Add `Payment Setup Attempt`, one row per attempt to add a card, add a UPI or card mandate, or top up the wallet. Record success too, so we have a failure rate and not only a list of failures.
  - Who: team (indexed link), user, flow (Add Card, Add Mandate, Top-up), gateway, instrument, amount and currency for a top-up.
  - Gateway references: Payment Method, SetupIntent id, gateway payment method id, order id, payment id.
  - Outcome: status (Started, Succeeded, Failed, Abandoned), the step it stopped at (Start, Tokenise, Authenticate (3DS), Confirm, Micro-charge, Verify signature, Capture), where the error came from (Browser, Server, Gateway webhook, Gateway lookup), error code, decline code, message, and the gateway error payload.
  - Context: browser and app version, created and finished times.
- [ ] Insert the row when `initiate_card_setup`, `setup_payment_method_order` or `create_topup_order` starts, and return its name to the console. Close it in `confirm_card`, `confirm_payment_method_order` and `confirm_topup`.
- [ ] Mark a row Abandoned when it is still Started after 1 hour (hourly job).

## TODO — capture the reason at every step

- [ ] Console: on every Stripe error (`createPaymentMethod`, `confirmCardSetup`) and on Razorpay Checkout's `payment.failed` and `ondismiss`, call one route, `report_payment_setup_failure(attempt, step, code, decline_code, message, gateway_reference)`, before it shows the message.
- [ ] Treat that route as untrusted input. Require `billing:manage` on the attempt's team, accept only the listed fields, cut the strings to a fixed length, and rate limit it per user.
- [ ] Server: when a gateway reference is known, ask the gateway for the reason ourselves. For Stripe, read `SetupIntent.last_setup_error`. For Razorpay, read the payment's `error_code`, `error_reason`, `error_description`, `error_source` and `error_step`. Store what the gateway says next to what the browser said. If they differ, the gateway wins.
- [ ] Keep the decline from the micro-charge. `validate_payment_method` returns the code, the decline code, the message and the charge id instead of `False`. Store them on the attempt and on the Payment Method's transition reason.
- [ ] Subscribe to Stripe `setup_intent.setup_failed` and `setup_intent.requires_action`, and Razorpay `payment.failed` for mandate and top-up orders. Record them on the matching attempt.
- [ ] `customer_safe_gateway_errors` writes the error to the attempt as well as the Error Log, so it is found by team.

## TODO — card data stays out

- [ ] Never send or store the card number, CVC or full expiry. Stripe and Razorpay error objects do not carry them. Strip any field outside an allowlist before saving the payload.
- [ ] Keep card brand and last 4, which we already show on the Payment Method.
- [ ] Prune rows after `payment_log_retention_days` (90 by default), in `cleanup_payment_logs`.

## TODO — make it usable for support and billing

- [ ] Desk list: team, user, flow, gateway, status, step and error code in the list view. Filters on status, gateway, flow, step and code. Search by team and user.
- [ ] Add a connection from Team and from Payment Method to their attempts.
- [ ] Add a "Payment Setup Failures" report: attempts, failures and failure rate per day, per gateway, per instrument and per code.
- [ ] Add an operator alert when the failure rate of a gateway and flow over the last hour is above a set level, with a minimum number of attempts so one bad hour of two attempts does not page anyone.
- [ ] Show the failure rate on the Billing Health dashboard.

## Acceptance criteria

- [ ] A card the browser refuses leaves a Failed attempt with the step, the Stripe code and the decline code, read back from Stripe.
- [ ] A refused Razorpay UPI mandate is recorded as Failed with Razorpay's reason, and a closed sheet as Abandoned.
- [ ] A failed micro-charge records its decline code on the attempt and on the Payment Method.
- [ ] A failed top-up confirm records the order, the payment id and the reason.
- [ ] Support finds every attempt of a team from desk without a shell.
- [ ] No stored row contains a card number or CVC (test with Stripe and Razorpay test cards).
- [ ] Tests cover the browser report route (permission, other team's attempt, field allowlist), the gateway lookup and the abandon job.

## Blocked by

None.
