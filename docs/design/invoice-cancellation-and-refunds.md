# Invoice cancellation, refunds and disputes

Date: 2026-09-30
Status: Built on Central `erpnext-sync`: full cancellation, refunds, lost disputes, and partial refunds.

## What is expected

These are the requirements as stated:

1. On an invoice in the admin console, an operator can cancel it and refund the money.
2. If a card paid the invoice, the refund goes back to the customer's card. UPI must
   be handled too.
3. When an invoice is cancelled, a credit note is created in ERPNext.
4. When Central loses a dispute on Stripe, the related invoice is cancelled. No
   refund is made, because Stripe has already taken the money.
5. Find out whether India Compliance reverses the GST on an advance when a credit
   note is made.

## What exists now

- `cancel_invoice` cancels a Draft, Open or Overdue invoice. A Paid invoice cannot be
  cancelled. Only the re-rating job calls it.
- `refunds.issue_refund` refunds a captured card or UPI charge to the source or to the
  wallet. The invoice stays Paid. Nothing calls it.
- No action in the admin console calls either one.
- Nothing is sent to ERPNext for a cancellation or a refund.
- Central does not handle refund or dispute webhooks.
- A bug: cancelling an Open invoice that drew wallet credit does not give the credit
  back.

## Finding: India Compliance and credit notes

Tested on staging with `B2B/26-27/00003`. That invoice was paid in full from the
advance `RV/26-27/000003` (8,000 of credit and 1,440 of advance GST). A credit note
was made with ERPNext's own `make_sales_return` and submitted.

The credit note reversed the invoice:

- Sales, debit 8,000
- Output CGST and SGST, debit 720 each
- Debtors, credit 9,440, held on the credit note as the customer's credit

The advance did not move. The allocation of 8,000 and the reversal of 1,440 advance
GST stayed as they were.

So India Compliance does not reverse or re-book advance GST on a credit note. The
customer is left with a credit of 9,440 in Debtors, with no GST on it.

- If the money goes back to the customer, this is correct. The refund settles the
  credit.
- If the customer keeps it as wallet credit, it is money held for a future supply,
  and GST is due on it again as an advance. Central must book that, because ERPNext
  does not.

The test credit note (`SRET-26-00001`) was cancelled afterwards.

## Design

### Principle

An invoice issued in ERPNext is never edited or deleted. It is corrected with a credit
note. Money that goes back out is a Payment Entry of type Pay. In Central, a cancelled
invoice keeps its lines, and a new state change `Paid -> Cancelled` is allowed only
through this flow.

### Actions in the admin console

On the Invoice form in Desk, for operators only:

| Invoice state | Action | What happens |
|---|---|---|
| Draft, Open, Overdue | **Cancel** | Central cancels it and gives back any wallet credit and advance GST it drew. It is not in ERPNext yet, so nothing is sent. |
| Paid | **Cancel and refund** | See the steps below. |

### Cancel and refund a paid invoice

Each part of the payment goes back the way it came.

1. **Credit note.** Central creates a submitted credit note in ERPNext against the
   Sales Invoice, for the whole invoice. It uses a new credit note series.
2. **Card or UPI part.** Central refunds the gateway charge.
   - Stripe refunds to the card.
   - Razorpay refunds a UPI payment, including UPI Autopay, to the bank account behind
     the customer's UPI ID. A normal refund takes 5 to 7 working days. An instant
     refund is faster and costs a fee.
   - In ERPNext: a Payment Entry of type Pay against the credit note, out of the
     gateway's clearing account, with the gateway's refund id.
3. **Wallet part (paid top-up credit).** It goes back to the wallet, with its advance
   GST.
   - In Central: a credit ledger entry for the credit, with its GST as `tax_amount`.
   - In ERPNext: this has to become an advance with GST again (see the finding). Two
     Payment Entries through a new **Wallet Clearing** account: a Pay that settles the
     credit note's balance, and a Receive that books a new advance with its GST. No
     cash moves, and the next invoice uses the new advance like any other.
4. **Promotional part.** It goes back to the wallet as promotional credit, with its
   first expiry date. Nothing is sent to ERPNext, the same as when it was spent.
5. **Central.** The invoice moves to Cancelled with the reason. A Refund record is kept
   for each part.

Each ERPNext step is looked up before it is made, so a retry never repeats it.

### Dispute lost on Stripe

- Central handles the `charge.dispute.closed` webhook when the status is `lost`. The
  dispute names the charge, which leads to the Payment Attempt and the invoice.
- The invoice is cancelled, and a credit note is made in ERPNext, as above.
- No gateway refund is made. In ERPNext, a Payment Entry of type Pay out of the Stripe
  clearing account settles the credit note, with the dispute id as its reference.
  Stripe has already taken this money from the balance.
- The Payment Attempt is marked as lost to a dispute.
- A dispute that opens (`charge.dispute.created`) is recorded on the invoice, so an
  operator can see it. Nothing is booked until it closes.
- The dispute fee is not booked by Central. Finance books it from the Stripe payout
  statement.

Razorpay disputes (`payment.dispute.lost`) follow the same path in a later step.

### Settings

Two new names in the Accounting tab of Billing Settings. Central only checks that they
exist in ERPNext.

- **Credit note series**, for example `CN/.TFY./.#####`. A credit note has its own
  series under GST.
- **Wallet clearing account**, a Bank-type account for the wallet steps above.

### GST time limit

Under section 34 of the CGST Act, a credit note must be issued by 30 November after the
end of the financial year of the invoice, or by the date of the annual return if that
is earlier. After that date, the action is refused with this reason.

## Test plan on staging

1. Cancel an Open invoice that drew wallet credit. The wallet and advance GST come back.
2. Cancel and refund a USD invoice paid by card. Real Stripe test refund, credit note,
   and a Pay entry.
3. Cancel and refund an INR invoice paid from the wallet. Credit note, the wallet comes
   back, and a new advance with GST is booked.
4. Cancel and refund a mixed invoice. A card refund and the wallet part.
5. Lose a Stripe test dispute (test card `4000000000000259`, losing evidence). The
   invoice is cancelled, with a credit note and a Pay entry, and no refund.

## Decisions

1. **Wallet part in ERPNext.** Two Payment Entries through a Wallet Clearing account,
   one per currency.
2. **Dispute and the wallet part.** When a dispute takes back the whole card charge,
   the invoice is cancelled and the wallet part goes back to the wallet too. A dispute
   over part of the charge is left to a person, because it needs a partial credit note.
3. **Partial refunds.** Built. A refund goes to the wallet by default. It goes to the card or UPI only when a captured charge on the invoice paid at least that much, so an invoice paid from purchased credits is always refunded to the wallet.
4. **Credit note series.** `CN/.TFY./.#####`. It is created by hand in ERPNext.

## Partial refunds

A partial refund gives back part of a paid invoice. The invoice stays Paid, because
the rest of the supply stands.

### What the operator gives

- The amount to give back, including GST. It cannot be more than what is left after
  earlier partial refunds.
- Where it goes: to the card or UPI (up to what that charge paid, less earlier card
  refunds), or to the wallet.
- A reason.

### What happens

1. **Split the amount.** The amount is split into net and GST at the invoice's own
   rate: `net = amount / (1 + rate)`, GST is the rest.
2. **Credit note for that part.** In ERPNext, a credit note against the Sales Invoice
   with one line of `net` for the service item and the matching GST rows. It is not a
   full return, so it is built directly, not with `make_sales_return`.
3. **Money back.**
   - To the card or UPI: a gateway refund for the amount, and a Pay entry against the
     credit note, as for a full refund.
   - To the wallet: paid-in credit of `net` with `GST` as its advance GST, and in
     ERPNext the two Payment Entries through Wallet Clearing, as for a full refund.
4. **Central.** The invoice records `credited_amount` (the running total). A Refund is
   kept for each partial refund. When `credited_amount` reaches the total, the invoice
   moves to Cancelled.

### Partial dispute

A lost dispute over part of a charge becomes a partial refund of the disputed amount
to the "Dispute" destination: a credit note for that part, a Pay entry out of the
Stripe clearing account, and no gateway refund.

### Checks

- The GST deadline for credit notes applies to each partial refund.
- The sum of partial refunds and the card refunds never exceeds what was captured.
- An invoice with a full cancellation under way takes no partial refund.
