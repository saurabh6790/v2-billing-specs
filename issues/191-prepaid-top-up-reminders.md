# 191 — A large Prepaid INR bill reaches Action Required with no warning

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:feature` `priority:p1` `area:payments`
**Area:** central/billing/payments/payment_notices.py, central/billing/payments/collection_mode.py, dashboard/src/components/billing/CollectionActionBanner.vue
**Source:** follow-up to [#150](150-prepaid-meaning-screen-vs-engine.md) and option 3 of the RBI ceiling discussion.

> **Decided (12 Nov 2026):** build option 3 (smoother Prepaid). eNACH for the largest bills is [#190](190-enach-for-large-inr-bills.md).
>
> **Decided (13 Nov 2026):** X is the full shortfall (bill less wallet), rounded up to ₹100, not the amount above the card limit: splitting a large bill between wallet and card makes no sense to the customer. Reminders 5 and 2 days before the payment date only; no payment-day reminder, because an over-limit bill already moves the team to Action Required with its own notice. An over-limit bill gets one notice, not "Payment Scheduled" plus Action Required. A Prepaid team with no saved card or UPI also gets the reminder: "Add ₹X to your wallet by {date}. No card or UPI is saved to pay the rest." At most one reminder per team per day.

## Problem

A team learns that its card or UPI cannot pay the bill only when the bill opens and the team moves to Action Required. It could have topped up before the payment day.

## Current behaviour

- The team gets a "Payment Scheduled" notice when the invoice opens (payment_notices.notify_payment_scheduled). It says the bill will be charged, also when the amount is above the team's off-session limit.
- The team gets no notice before the payment day that its wallet will not cover the bill.

## What we want

1. **Who:** INR teams on Prepaid or Auto Charge whose month-to-date forecast, less the wallet balance, is above the team's off-session limit (the largest amount a saved card or UPI can take silently, at most ₹15,000).
2. **When:** 5 days and 2 days before the team's payment day.
3. **What:** "Add ₹X to your wallet by {date}. Your card or UPI pays only amounts up to {limit}." X is the forecast shortfall, rounded up. Email and in-app, under the team's notification preferences.
4. **Stop:** no more reminders once the wallet covers the forecast.
5. **Link:** the reminder opens the dashboard top-up dialog with ₹X filled in.
6. **Banner:** the billing page shows the same message until the wallet covers the forecast.
7. **Payment Scheduled:** when the amount after the wallet is above the limit, the notice asks the team to top up and does not say the bill will be charged.
8. **No money change:** no new charges, no change to the limit or to Action Required.

**Who it affects:** INR customers with bills above their card or UPI limit.

**Why it matters:** these customers otherwise reach Action Required, then dunning, every month.

## Acceptance criteria

- [ ] A team over the limit gets exactly one reminder on each of the two days; a second scheduler run on the same day sends nothing.
- [ ] A top-up that covers the forecast stops the reminders and hides the banner.
- [ ] USD teams and Manual Checkout teams get no reminder.
- [ ] Payment Scheduled for an over-limit bill asks for a top-up.
- [ ] The top-up link fills in ₹X.
