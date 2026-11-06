# 126 — Close the gaps that make a first charge or a mandate debit fail

**Type:** AFK · **Milestone:** post · **Area:** `central/billing/gateways/stripe_adapter.py`, `central/billing/payments/decline.py`, `central/billing/revenue/dunning.py`, `central/billing/payments/collection_mode.py`, `central/billing/payments/emandate.py`, `central/billing/revenue/gst_status.py`, `fixtures/notification_event_type.json`

## Problem

On Press, since the start of 2026, two failures stopped teams from paying:

- 56 teams: the first card charge failed with "As per Indian regulations, export transactions require a customer name and address". 23 of them never paid.
- 87 teams: "PaymentMethod has failed authentication" (3-D Secure).

Central already covers the main cause of each. A complete billing profile is required before a card, mandate or top-up is set up, and its name and address go to Stripe as `shipping` on every charge. An Indian mandate debits without the customer authenticating only up to ₹15,000, after a pre-debit notice 24 hours before. Above that, the team moves to Action Required and picks Manual Checkout or Prepaid.

The gaps below can still make a charge fail, or let a customer find out too late. Failure logging is in issue 125.

## TODO — export charges (name and address)

- [ ] **Add a test that proves `shipping` reaches Stripe** on the micro-charge, the off-session invoice charge and the wallet top-up. Today nothing fails if it is removed.
- [ ] **Stop the charge when the address is missing.** `_export_shipping` returns `None` when `address_line1` is empty, and the charge goes out without it. Raise a clear error instead, or hold the invoice with a reason.
- [ ] **Send the legal name and address to the Stripe Customer.** `create_customer` sets the name to the team id (`TEAM-00033`) and sends no address. Set the legal name, email and address, and update the Customer when the Billing Profile changes. Support then sees the right customer in Stripe.

## TODO — 3-D Secure and authentication

- [ ] **Treat `authentication_required` as "ask the customer".** `decline.py` does not list it, so dunning retries the same card off-session on day 1, 3 and 7, and every retry fails the same way. On this code, stop off-session retries for that invoice and move to the on-session step below.
- [ ] **Send a specific message with a link to that invoice.** Today the customer gets the generic `payment_failure` ("Payment failed: {reason}") with a link to `/billing/invoices`. Add an event that says the bank needs them to confirm the payment, with a button to that invoice's payment page, where 3-D Secure runs on-session.
- [ ] **Check the card validation for INR cards.** `validate_payment_method` runs the micro-charge off-session right after setup and does not send the India mandate, while `charge()` does. If the bank asks for 3-D Secure there, a good card is marked Failed. Reproduce with an Indian test card in Stripe test mode. If it fails, send the mandate, or run the validation on-session as part of setup.
- [ ] Record `authentication_required` and `authentication_failed` per gateway in the Payment Setup Failures report from issue 125, so we can see whether the fix works.

## TODO — warn before ₹15,000, not at billing time

- [ ] **Run the forecast check daily.** `collection_mode.evaluate` runs only when the customer opens the billing page (`account.py`) and when the invoice is due (`emandate.py`). A customer who never opens the console hears about it only at billing time. Add a daily job that projects month-end spend for every Auto Charge INR team and calls `evaluate`.
- [ ] **Warn before the limit, not only when it is crossed.** Send a heads-up when the projected bill reaches a set share of ₹15,000 (80% to start), so the customer can choose Manual Checkout or Prepaid before the month ends. Send it once per month.

## TODO — GSTIN that lapses

- [ ] **Tell the customer when their GSTIN stops being valid.** When `gst_status.store` moves a GSTIN to Invalid, Inactive, Suspended or Cancelled, nothing is sent. The console only shows `gst_lapsed` on the billing page. Add a notification event with a link to the billing profile, sent when the status changes. Say that their next invoice will not carry the GSTIN, so they cannot claim input tax credit on it.
- [ ] **Tell them again before the billing run** if the GSTIN is still lapsed 3 days before month end.
- [ ] **Make the off state visible.** GSTIN lookups are off when ERPNext sync is off (`lookups_enabled`). Add a readiness check that reports Indian teams with a GSTIN that was never checked, so a disabled sync does not go unnoticed.

## Acceptance criteria

- [ ] A test fails if `shipping` is not sent on any Stripe charge, and a charge with no billing address is stopped with a clear reason.
- [ ] The Stripe Customer carries the team's legal name and address.
- [ ] An off-session charge that fails with `authentication_required` is not retried off-session. The customer gets a message with a link that lets them pay that invoice with 3-D Secure.
- [ ] An Indian test card passes validation in Stripe test mode, or the issue records why it cannot and what we changed.
- [ ] An Auto Charge INR team whose forecast reaches 80% of ₹15,000 is warned once that month, without opening the console.
- [ ] A team whose GSTIN lapses gets a notification when it changes, and again before the billing run.
- [ ] Each change has a test, including the cross-team and repeat-send cases.

## Blocked by

None. The failure report in issue 125 is needed only to measure the 3-D Secure fix.
