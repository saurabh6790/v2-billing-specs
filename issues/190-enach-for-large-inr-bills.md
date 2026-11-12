# 190 — INR bills above ₹15,000 cannot be auto-debited; add eNACH bank mandates through Razorpay

**Type:** HITL · **Milestone:** TD · **Priority:** P1 · **Size:** L · **Labels:** `type:feature` `priority:p1` `area:payments`
**Area:** `central/billing/gateways/razorpay_adapter.py`, `central/billing/gateways/razorpay_recurring.py`, `central/billing/gateways/capabilities.py`, `central/billing/payments/` (`charges.py`, `collection_mode.py`, `emandate.py`, `mandates.py`, `webhooks.py`), `central/billing/revenue/dunning.py`, Payment Method, Payment Attempt, `dashboard/src/components/billing/`
**Source:** Product request (12 Nov 2026): some INR customers pay ₹5–6 lakh a month and cannot be auto-debited. [ADR 0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md) (Consequences) records eNACH as "a rail we do not use" that needs its own decision. Code at central `94ac9552` plus the uncommitted working tree of 12 Nov 2026; line numbers can move.

> **HITL:** decide (1) whether to add eNACH, (2) who is offered it, (3) the max_amount rule, and (4) how long a debit may stay Processing before suspension can apply. Get the open questions below answered by Razorpay before the build starts.

## Problem

An INR team whose bill after the wallet is above ₹15,000 cannot be debited off-session. It goes to Action Required and must pay each invoice on-session or keep a large wallet. For a team that pays ₹5–6 lakh a month, every month needs a manual payment. A missed payment leads to dunning and suspension.

The ₹15,000 limit is in the RBI E-mandate Framework, 2026. That framework applies to cards, PPIs and UPI only. eNACH is an NPCI bank-account mandate and is outside that scope. So eNACH can carry a variable monthly debit above ₹15,000 with no per-debit authentication.

## Facts from sources

Each fact has a source. "Unverified" means no official source confirmed it.

**Regulation**
- The RBI "Digital Payments – E-mandate Framework, 2026" (RBI/DPSS/2026-27/396, 21 Apr 2026) applies to "recurring transactions, domestic or cross-border, using cards / PPI / UPI" (para 2). It does not name NACH or bank accounts. Source: https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=13374
- The same framework: recurring transactions are allowed without AFA up to ₹15,000 per transaction (para 8(a)); ₹1,00,000 only for insurance premiums, mutual fund subscriptions and credit card bills (para 8(b)); the issuer sends a pre-debit notification at least 24 hours before the debit (para 6(a)); a mandate can be fixed or variable, and for a variable mandate the customer sets the maximum value (para 4(c)). Same source.
- Conclusion: the ₹15,000 AFA rule and the 24-hour RBI pre-debit notice do not apply to eNACH. This follows from the scope clause. No RBI or NPCI text that says "NACH is exempt" in direct words was found. **Unverified** as an explicit statement; ask Razorpay to confirm (Q1).
- NACH rules come from NPCI circulars, not from the RBI framework. The NPCI circular text was not read. Third-party summaries say the per-debit cap is ₹1 crore for most mandate types and that "as presented" frequency allows debits at any time between start and end date, with restrictions by category code (https://juspay.io/in/docs/lotuspay/web/nach-debit-flow/mandate-amounts, https://juspay.io/in/docs/lotuspay/web/nach-debit-flow/mandate-frequencies). **Unverified** from NPCI.

**Razorpay eMandate (eNACH)**
- Auth types: `netbanking`, `debitcard`, `aadhaar`. Aadhaar is enabled by default. Source: https://razorpay.com/docs/api/payments/recurring-payments/emandate/create-authorization-transaction/
- Registration order: `amount` must be 0, currency INR only, `method: emandate`, `token.max_amount` in paise, `token.expire_at` (request text says default and maximum 40 years; response text says default 10 years; the page conflicts), optional `bank_account` (`beneficiary_name`, `account_number`, `ifsc_code`, `account_type` savings or current). Same source.
- max_amount limits: NPCI eNACH (netbanking, debit card, Aadhaar) up to ₹1,00,00,000; default ₹99,999 when not set. Direct bank netbanking: SBI, ICICI, Axis up to ₹1 crore; HDFC up to ₹1,00,000. Source: https://razorpay.com/docs/payments/recurring-payments/emandate/faqs/ . (An older subscriptions FAQ says the default is ₹1 crore: https://razorpay.com/docs/payments/subscriptions/faqs . The two pages conflict.) A per-auth-type difference (for example a lower Aadhaar limit) is **unverified**.
- A registered mandate cannot be edited. A new max_amount needs a new mandate. Source: emandate FAQ above.
- Registration to `confirmed`: real time for NPCI eNACH by debit card, netbanking and Aadhaar, but "NPCI eNACH partner banks may take up to 2 days to complete registration"; debits before that fail. Direct HDFC and SBI netbanking: T+1 working day. Bank issues or holidays can delay confirmation up to 5 days. Source: emandate FAQ above.
- Subsequent debit: create a new order (`amount`, `currency`, `payment_capture`) for each charge, then `POST /v1/payments/create/recurring` with `email`, `contact`, `currency`, `amount`, `order_id`, `customer_id`, `token`, `recurring`. The reply carries only `razorpay_payment_id`. An over-limit amount fails with "Amount exceeds maximum amount allowed". Source: https://razorpay.com/docs/api/payments/recurring-payments/emandate/subsequent-payments/
- Debit timing: NPCI eNACH debits are "T+2 working days". Requests between T−1 09:00 and T 09:00 are processed on T. Requests after T 09:00 go to the next cycle. Debits run on all days; settlement of weekend or holiday captures is on the next working day. Source: emandate FAQ above.
- What "T+2" means (the day the customer's account is debited, or the day we get the result) is **unverified**. Which payment status the API returns while the debit is pending (`created` or `authorized`) is **unverified**.
- A debit cannot be scheduled for a future date in the API. The debit starts when we create it. Source: subsequent-payments page above (no date field). A future-dated presentation is **unverified** (Q6).
- Webhooks: `payment.authorized`, `payment.captured`, `order.paid`, `payment.failed`, `token.confirmed`, `token.rejected`, `token.cancelled`. `token.paused` is for UPI and cards only, not eMandate. Endpoint must return 2XX in 5 seconds; retries with backoff for 24 hours; duplicates possible (use `x-razorpay-event-id`). Source: https://razorpay.com/docs/api/payments/recurring-payments/webhooks/
- Pre-debit notification: Razorpay's recurring integration guide ties the 24-hour pre-debit notice to UPI and says "For Cards and eMandate, the debit is being processed directly". Source: https://razorpay.com/docs/payments/recurring-payments/overview/integrate/ . That eNACH needs no pre-debit notice from anyone is **unverified** (Q3).
- Retries: retries are manual; the same order can be retried. Razorpay advises waiting for the result of the last debit, then 3 days (example: fails 1 Nov, result 2 Nov, retry 5 Nov). After `insufficient_balance`, wait at least 3 days. Razorpay charges for failed debits after the prescribed retries; the amount is not published. Sources: emandate FAQ and subsequent-payments page above.
- Failure reasons named by Razorpay: "Customer has to refer to branch to complete registration" (retry after 5 working days); "emandate is cancelled or inactive" (soon after registration: bank not done; after a month: customer cancelled, new mandate needed); `insufficient_balance`. Source: emandate FAQ above. The full list of NPCI return codes is **unverified**; third-party lists disagree on code numbers.
- Cancellation: we cancel by deleting the token (API or dashboard); Razorpay starts cancellation the next working day; `token.cancelled` arrives after NPCI acknowledges. The customer can cancel at the bank; the next debit then fails. Sources: emandate FAQ above; https://razorpay.com/docs/payments/subscriptions/faqs
- Pricing: Razorpay lists "NACH | Pricing available on request" and "E-mandate | Pricing available on request". Source: https://razorpay.com/pricing/ . Registration fee, debit fee and bounce fee are **unverified** (Q2).
- Bank coverage: Razorpay says e-NACH "covers over 40+ banks" (marketing page: https://razorpay.com/e-mandate/). NPCI publishes a live destination bank list with Net Banking, Debit Card and Aadhaar columns (https://www.npci.org.in/uploads/API_Live_Destination_Bank_jan26_1623c7a5de.pdf); its content was not read. Coverage of each large bank by auth type is **unverified**.

**Stripe**
- Stripe accounts in India support Visa, Mastercard, Amex (international only), Apple Pay and Google Pay (international only). "We don't support local payment methods for businesses in India." NACH is not listed. Source: https://support.stripe.com/questions/supported-payment-methods-currencies-and-businesses-for-stripe-accounts-in-india . Stripe's bank-debit methods are ACH, BACS, SEPA, BECS and ACSS (Canada): https://docs.stripe.com/payments/bank-debits . So eNACH is Razorpay's.

## Current behaviour

- INR off-session debits are capped at ₹15,000 for every gateway: `INR_SILENT_CEILING = 15000.0` (`gateways/capabilities.py:19`); `silent_charge_ceiling` takes the lower of the configured and the statutory ceiling per *(gateway, currency)* (`capabilities.py:33`, `:87`). The cap does not look at the method type, so a Razorpay eNACH method would be capped at ₹15,000 too.
- `adapter.can_charge_silently` checks only amount and currency (`gateways/base.py:172`). Over the ceiling, `claim` does not charge and moves the team to Action Required (`payments/charges.py:129-135`).
- Collection mode is `Auto Charge`, `Manual Checkout`, `Prepaid` or `Action Required` (`doctype/billing_profile/billing_profile.json:205`). The threshold state machine is in `payments/collection_mode.py` (`silent_threshold` `:99`, `is_over_silent_threshold` `:144`, `trip` `:150`).
- The pre-debit notice and 24-hour window for Indian mandates are in `payments/emandate.py` (`PREDEBIT_NOTICE_HOURS = 24` `:32`, `schedule_predebit` `:78`). A rail owes the notice when `Payment Gateway Currency.requires_predebit_notice` is set (`capabilities.py:57`). This is per *(gateway, currency)*, not per method type.
- Razorpay mandate registration supports `method` "upi" or "card" only, with a ₹1 order amount (`gateways/razorpay_adapter.py:118-146`, `"amount": 100` at `:127`). eNACH needs `method: emandate`, amount 0, `auth_type` and `bank_account`.
- Payment Method types are `Card`, `UPI Autopay`, `Prepaid Credits` (`doctype/payment_method/payment_method.json:67`). There is no bank-mandate type.
- A Razorpay recurring debit that is neither `captured` nor `failed` is held for 36 hours (`gateways/razorpay_recurring.py:11`, `:46`). After the hold, reconciliation may look at it (`payments/reconciliation.py:82`). 36 hours is shorter than T+2 working days over a weekend.
- Payment Attempt status is `Initiated`, `Authorised`, `Captured`, `Failed`, `Refunded` (`doctype/payment_attempt/payment_attempt.json:102`). There is no Processing status. "In flight" is derived from the attempt and `gateway_hold_until` (`payments/charges.py:244-262`).
- Dunning holds Overdue while a charge is in flight, but only until the day before the suspension date (`revenue/dunning.py:265`). Suspension is on the 15th (`revenue/dunning.py:17`). A bank debit still processing on the 15th does not stop suspension.
- Razorpay webhooks we subscribe to do not include `token.confirmed`, `token.rejected` or `token.cancelled` (`gateways/razorpay_adapter.py:31-43`). Mandate events are dispatched only for the `mandate.` prefix, which is Stripe's (`payments/webhooks.py:199`).
- The payment day is 1–10 (`doctype/billing_profile/billing_profile.json:226-227`; decided 12 Nov 2026).

## What we want

An INR team can register an eNACH bank mandate with Razorpay. On the team's payment day, after the wallet pays first (D-12, #150), the remainder is debited from the bank account with no per-debit authentication and no ₹15,000 limit. The limit is the mandate's max_amount. While the bank processes the debit, the invoice shows "Payment processing". It is not Paid and dunning does not act on it. When the result comes, the invoice is Paid, or the bounce goes to the fallback and dunning path.

**Who it affects:** INR teams with bills above ₹15,000 (today in Action Required, Manual Checkout or Prepaid with a large wallet); INR teams with Amex, Diners or no card (ADR 0023); finance (cash timing, bounce cost); support.

**Why it matters:** The largest INR customers pay by hand each month. Each manual payment is a chance to miss a payment, go to dunning and be suspended. The revenue at risk is the largest per team.

## Options

- **A. eNACH, presented on the payment day.** Create the debit before 09:00 IST on the payment date, so the bank debits the customer on the day they chose. Hold the invoice as Processing until `payment.captured` or `payment.failed` (expected by T+2 working days). Cash arrives 2–4 days after the payment day.
- **B. eNACH, presented early.** Create the debit N working days before the payment date (N = 3), so the money settles by the payment day. This debits the customer before the day they chose, which breaks the payment-day promise. It also fails for payment days 1–3, because the invoice opens on the 1st and cannot be presented before it exists.
- **C. No eNACH.** Keep Action Required with Manual Checkout or Prepaid (ADR 0005). Add reminders only. No build cost; the manual risk stays.
- **D. Bank transfer to a virtual account** (NEFT/RTGS, for example Razorpay Smart Collect). Removes card limits, but the customer still pays by hand each month. Not auto-debit; listed for comparison only.

## Recommended approach

**A.** It keeps the payment-day promise and fits the existing rails.

1. **Method type.** Add Payment Method type `Bank Mandate` on the Razorpay adapter. One gateway, one more method type. No new gateway record (ADR 0021). The customer picks auth type (Netbanking, Debit Card, Aadhaar) and enters account holder name, account number, IFSC and account type. Registration order: `amount` 0, `method: emandate`, `token.max_amount`, `token.expire_at`, `bank_account`, `auth_type`. No authorisation refund is needed (amount 0).
2. **Registration state.** The method stays `Pending Validation` after checkout returns. `token.confirmed` makes it `Active`. `token.rejected` makes it `Failed` with the reason. `token.cancelled` makes it `Cancelled`, sets `reauth_required` and trips Action Required (same as `mandates.apply_mandate_event`). Subscribe to the three `token.*` events and route them to the mandate handler. Do not present a debit before `token.confirmed`. Show "Your bank is confirming the mandate. This can take up to 2 working days."
3. **Ceiling per method type.** The silent ceiling becomes a property of *(gateway, currency, method type)*. For `Bank Mandate` the ceiling is the token's max_amount, not ₹15,000. `can_charge_silently` and `collection_mode.silent_threshold` read the team's first chargeable method, not only its gateway. The ₹15,000 floor stays for Card and UPI Autopay. The trust-tier cap (`mandates.team_cap`) still applies.
4. **Pre-debit notice.** No RBI pre-debit window for `Bank Mandate` (`requires_predebit_notice` false for that method type), pending Q3. We still send our own `payment_scheduled` notice when the invoice opens, and the `payment_reminder` one day before the payment date. Both name the amount, the date and the bank account (last 4 digits).
5. **Timing.** On the payment date, an early job (for example 06:00 IST) creates the order and the recurring payment, before the 09:00 IST cut-off, so the debit is in that day's cycle. An invoice that opens after 09:00 on its payment date is presented the next day before 09:00. Do not present early (option B).
6. **Processing state.** Add Payment Attempt status `Processing`: the debit is created and has no final result. Rules:
   - The invoice is not Paid. The console shows "Payment processing — your bank is debiting ₹X. We expect the result by <date>."
   - No retry, no fallback to another method, no second debit, and no Overdue while an attempt is Processing (one in-flight attempt per invoice, as today).
   - Suspension does not apply while an attempt is Processing. The hold ends at the earlier of the result and a deadline of 5 working days after presentation (configurable in Billing Settings). Replace the 36-hour hold for `Bank Mandate`.
   - At the deadline, reconciliation fetches the payment. If Razorpay still has no result, alert operators and keep the hold; do not suspend on an unknown result.
   - If the customer pays on-session or tops up while Processing and the debit then also succeeds, the existing late-capture refund path applies (`payment_refunded`).
7. **Bounce.** On `payment.failed`, the attempt is `Failed` with the reason. Then:
   - Mandate cancelled or inactive: mark the method `Cancelled`, `reauth_required`, trip Action Required, send the on-session pay link.
   - Insufficient balance or other retriable reason: send the on-session pay link at once. Present the eNACH debit again once, no sooner than 3 days after the result (Razorpay guidance). Not more than once per invoice, because failed debits cost money (Q2) and can cost the customer bank charges (unverified).
   - Do not fall back to a card or UPI method for a remainder above ₹15,000; it would fail the RBI rule. A secondary method is tried only when the remainder is at or below its ceiling (escalate, don't repeat, #28).
   - The dunning ladder then runs as today, with dates counted from the result, not from the payment date.
8. **max_amount.** Default = the larger of ₹1,00,000 and 3 × the highest invoice in the last 3 months (or the current forecast for a new team), rounded up to the next ₹50,000, not above ₹1,00,00,000. The customer can raise it on the form. Explain on the form that this is a ceiling, not the amount debited. When the forecast reaches 80% of max_amount, ask the customer to register a new mandate with a higher limit. When the remainder is above max_amount, do not present (Razorpay would refuse); trip Action Required and send the pay link and a "register a higher limit" link. A new mandate supersedes the old one, which we cancel after the new one is confirmed (`_retire_superseded_mandates`).
9. **Who is offered it.** INR teams only. Offer it (a) on the Action Required banner as a third choice, "Auto-debit from your bank account (eNACH)", (b) on the auto-pay surface for teams whose last invoice or forecast is above ₹15,000, and (c) to teams with Amex, Diners or no card (ADR 0023). Hide it from teams below ₹15,000 at first, to limit bounce cost and support load; revisit after one quarter.
10. **Collection mode.** A team with an active `Bank Mandate` is `Auto Charge`. The wallet still pays first (D-12, #150).

This needs an ADR that amends ADR 0005 decision 4 ("No large-INR silent auto-charge exists") and ADR 0023's eNACH note.

## Acceptance criteria

- [ ] Razorpay answers Q1–Q10 below in writing, and the answers are linked from this issue.
- [ ] An ADR records the eNACH decision and amends ADR 0005 and ADR 0023.
- [ ] Payment Method has type `Bank Mandate`; Razorpay registration sends `method: emandate`, amount 0, `auth_type`, `bank_account`, `max_amount` and `expire_at`.
- [ ] `token.confirmed`, `token.rejected` and `token.cancelled` are subscribed, verified and applied to the method. A method is not debited before `token.confirmed`.
- [ ] A `Bank Mandate` remainder of ₹5,00,000 on an INR invoice is presented without Action Required. A Card or UPI Autopay remainder above ₹15,000 still goes to Action Required.
- [ ] The debit is created before 09:00 IST on the payment date, not earlier.
- [ ] Payment Attempt has status `Processing`. While an attempt is Processing, the invoice is not Paid, dunning makes no retry, no Overdue and no suspension, and no other method is charged.
- [ ] A Processing attempt without a result after the configured deadline is reconciled; an unknown result alerts operators and does not suspend.
- [ ] A bounce for insufficient balance sends the pay link at once and presents the debit again once, at least 3 days after the result.
- [ ] A bounce for a cancelled or inactive mandate cancels the method and trips Action Required.
- [ ] A remainder above max_amount is not presented; the team gets the pay link and a re-register link. The 80% warning is sent once per cycle.
- [ ] Our `payment_scheduled` and `payment_reminder` notices name the bank account (last 4 digits) for a `Bank Mandate`.
- [ ] Tests stub the Razorpay adapter (no live gateway calls).

## Open questions for Razorpay

1. Confirm in writing that eNACH debits above ₹15,000 need no per-debit AFA for a SaaS merchant, and cite the NPCI or RBI rule.
2. Pricing for our account: registration fee, fee per successful debit, fee per failed debit, and the "prescribed retries" after which failed debits are charged.
3. Does an eNACH debit need a pre-debit notification? If yes, who sends it, how long before the debit, and does Razorpay send it?
4. Is eMandate enabled on our account, and which auth types (netbanking, debit card, Aadhaar)? Which NACH category code and frequency (for example "as presented") apply to us? Is a variable monthly amount allowed for our category?
5. Max amount per auth type and per bank. Is the default ₹99,999 or ₹1 crore? Is there a lower limit for Aadhaar?
6. Can a debit be created with a future date? If not, is a request created at 06:00 IST on day T always in day T's cycle, including weekends and bank holidays?
7. "T+2 working days": on which day is the customer's account debited, and on which day do we get `payment.captured` or `payment.failed`? Which payment status does the API return while the debit is pending? When is the money settled to us?
8. The full list of failure reasons and error codes for eNACH debits, and which are retriable.
9. How many presentations of one order or one invoice are allowed per month? Is there a cooling period after `token.confirmed`?
10. Do current accounts that need two signatories (common for companies) support eNACH registration by netbanking? Which large banks (HDFC, ICICI, SBI, Axis, Kotak) support which auth types?
11. When a customer cancels the mandate at the bank, how soon does `token.cancelled` arrive?
12. Does test mode simulate T+2 debits, bounces and `token.*` events?

## Dependencies

#150 (wallet first, then method). ADR 0005, ADR 0022, ADR 0023. #28 (escalate, don't repeat). Razorpay answers to the open questions.
