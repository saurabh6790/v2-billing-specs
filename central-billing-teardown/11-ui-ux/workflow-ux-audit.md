# Workflow UX audit (D1–D4)

Complete workflows, step by step, per persona. Source only: copy and logic are
from code, not from watching someone use the screen. Measured frequencies come
from the production backup ([measurements.md](../12-problem-discovery/measurements.md)).

## W-A New customer sets up billing (Customer)

| Step | Screen | What the person sees | Friction | ID |
|---|---|---|---|---|
| 1 | Onboarding billing step | "Billing country". In an India time zone it is already **saved** as India | A record and a currency are written before any choice | CB-12 |
| 2 | Same | Welcome credit card: "Your first payment method unlocks it." "How billing works: 1. No charge today…" | "No charge today" is contradicted at step 5 | CB-11 |
| 3 | Same, trial teams | "Adding a payment method ends the free trial today… and billing starts." | Three statements about one click on one screen | CB-11 |
| 4 | Billing details dialog | 10 fields in a 2-column grid; City before Address line 1 | Reading order; Indian phone placeholder for all | CB-13 |
| 5 | Add payment method | Tiles → Stripe card field; "Validating your card with a small temporary charge…" appears only after "Add card" | Late disclosure | CB-11 |
| 6a | Razorpay sheet (UPI / RuPay) | Our dialog closes, the sheet opens; cancel brings the dialog back with the choice kept | Works (ST-08) | — |
| 6b | Failure or abandonment | Dialog error if the confirm returns Failed. Otherwise nothing; the half-made method is hidden from Payments | No trace, no retry prompt | **CB-21** |
| 7 | Success | "Payment method added. Your ₹X credit is in your wallet." | Works | — |

**Measured.** 64 external profiles → 9 complete → 6 tried a method → 2 active.
Step 6b is where the numbers fall.

**Expected experience.** Country is a choice, pre-selected but not saved until
Continue. The card check is disclosed before the first click. A setup that does
not finish shows on Payments as "Not finished: Try again", with the bank's reason
when there is one.

## W-B Customer changes how they pay (Customer)

| Step | Screen | What happens | Friction | ID |
|---|---|---|---|---|
| 1 | Payments | Sees credits + methods. No collection mode shown | Cannot see the current mode | CB-03 |
| 2 | Row menu → "Primary payment method" | Disabled while any credit remains; no reason | Dead control | CB-05 |
| 3 | Row menu → "Move up" | Reorders. Same effect as step 2 | Two controls | CB-05 |
| 4 | Credit runs out; "Primary payment method" on a Prepaid team | Mode switches to Auto Charge; toast: "{card} is charged first" | Hidden side effect | CB-03 |
| 5 | Prepaid team, credit runs out, method saved | Engine charges the method; the card said only credits are used | Screen vs engine | CB-04 |

**Expected experience.** Payments shows "How you pay: Prepaid. We use your credit
first. When it runs out, we [charge your card | stop and ask you to top up]",
with a Change control that states the consequence before saving.

## W-C Customer pays an overdue invoice (Customer)

| Step | Screen | What happens | Friction | ID |
|---|---|---|---|---|
| 1 | Overview banner | "₹X overdue on your October invoice. 2 payment attempts failed. Pay now…" [Pay now] | Works (ST-11) | — |
| 2 | Invoices list | Lands on the list, not the invoice | Must find the row | CB-08 |
| 3 | List fails to load | "No invoices yet" | Contradicts the banner | CB-06 |
| 4 | Receipt panel | Subtotal, tax, "Credits applied −X", Total (gross) | Does not add up when credits apply | CB-01 |
| 5 | "Pay ₹Y now" | Charges the saved method at once; method not named | No confirm; Y ≠ Total | CB-09, CB-01 |
| 6 | Toast | "Payment initiated. The invoice updates once the gateway confirms." | Jargon | CB-14 |
| 7 | Panel | "Waiting for your bank to confirm the payment…" with a spinner, forever | No refresh | CB-07 |
| 7′ | Race with a webhook | "Invoice …: illegal transition Outstanding → Paid" | Internal error text | CB-20 |
| — | Manual Checkout | Razorpay sheet whatever the gateway | Wrong sheet possible | CB-10 |
| — | Invoice held | "This invoice is being prepared. You can pay it once it is issued." No date | Cannot act | CB-22 |

**Measured.** 0 payment attempts; both external owed invoices held (CB-22). The
flow has not been used in production yet.

**Expected experience.** Banner → panel open on that invoice → receipt that adds up
line by line to "Amount due" → "Pay ₹Y with Visa ••4242" → confirm → live status →
Paid without reload.

## W-D Customer finds an old invoice for their accountant (Customer, accounts team)

| Step | What happens | Friction | ID |
|---|---|---|---|
| 1 | Invoices → "Last year" preset → row → PDF | Works (ST-12) | — |
| 2 | Wants to email it | "Email invoice" disabled forever | CB-15 |
| 3 | Looks for a cancelled one | Filter has no Cancelled | CB-16 |
| 4 | Opens Statement | "Tax invoices are issued separately" | Sends them looking elsewhere | CB-16 |

## W-E Support answers "why can't I add my card / pay?" (Support agent)

| Step | What happens | Friction | ID |
|---|---|---|---|
| 1 | Opens Team form | No billing connections; buttons for credit, suspend, impersonate | No overview | CB-18 |
| 2 | Opens Payment Method list, filters by team | Finds Pending Validation rows the customer never saw | Only visible here | CB-21 |
| 3 | Opens Webhook Event list | Finds `payment.failed` marked Ignored; must read the raw payload | Needs engineering knowledge | CB-21 |
| 4 | Opens Invoice | Held for Accounting Sync; no action to release or explain | Escalate to engineering | CB-19, CB-22 |
| 5 | Impersonates the owner | Sees the console as the customer, with full rights | Wrong tool | CB-18 |

**Expected experience.** One Team billing page: profile completeness, collection
mode, methods including unfinished ones with their last gateway reason, invoices
with hold reasons, attempts, wallet, last 20 billing events. Actions in place.

## W-F Finance cancels or refunds (Finance operator)

| Step | What happens | Friction | ID |
|---|---|---|---|
| 1 | Invoice form → Cancel | Reason prompt only; no summary of effects (ERPNext credit note? dunning stops?) | CB-19 |
| 2 | Paid invoice → Refund Part | Amount with what is left, destination with card cap, reason | Works (ST-15) |

## W-G Customer checks this month's cost and limit (Customer) — checkpoint 2, seen

| Step | Screen | What the person sees | Friction | ID |
|---|---|---|---|---|
| 1 | Overview, first paint | "Add your billing details" banner, then it disappears | Wrong state on every load | CB-27 |
| 2 | This cycle card | Headline with tax; "Spend limit ₹X before tax on {tier} tier"; bar | Bar is before tax, headline after | CB-25, CB-26 |
| 3 | Limits card | "Spend per cycle Y of X" with tax | Same limit, different figure | CB-25 |
| 4 | Subscriptions header | "₹Z this cycle before tax" | A third figure | CB-26 |
| 5 | Creates a server | Refused: "exceeds your remaining headroom" | Gate uses the monthly run-rate; "headroom" unseen elsewhere | CB-25 |
| 6 | Sets a budget alert | "Billing alert saved" | Never sent | CB-23 |

**Expected experience.** One cost figure, one tax basis, one meaning of the limit,
used by the gate and the refusal: "This server adds $40 a month. Your limit is
$100 and your servers already run at $80 a month."

## W-H Prepaid customer tops up and follows credit (Customer) — checkpoint 2, seen

| Step | Screen | What happens | Friction | ID |
|---|---|---|---|---|
| 1 | Facts card | "Wallet ₹2,500 · Covers N% of this cycle, card pays the rest" | Clear; matches the Prepaid rule (ST-17) | — |
| 2 | Wallet history (icon) | Header has an "Auto-recharge" switch | Switch flips back: not available | CB-15 |
| 3 | Entries | "Welcome credits · 2026-01-01 00:00:00" | Raw timestamp; no expiry on the grant | CB-29, CB-31 |
| 4 | Add credit | Quick amounts ₹1,000–₹25,000 (USD teams: $1,000–$25,000) | Presets ignore currency and limit | CB-32 |
| 5 | Amount entered | GST and total shown before paying | Works (ST-22); GST computed in the browser | CB-33 |
| 6 | Closes the gateway sheet | Nothing recorded for the customer | Unfinished top-up invisible | CB-21 |
| 7 | Facts card while panel open | Labels "W.", "P.", "N." | Truncation | CB-28 |

**Expected experience.** Presets based on the forecast ("Cover this month: $85"),
GST from the server, each grant with its expiry, dates formatted, and no control
that does nothing.
