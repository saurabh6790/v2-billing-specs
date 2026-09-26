# Wallet top-ups as advances in ERPNext

Date: 2026-09-26
Status: Proposed. Not built.

## What this is for

A customer can pay before they use anything. They top up their wallet, and Central
draws the wallet down when it bills them. In the books, money received before the
supply is an advance. Under GST, an advance for a service is taxed when it is
received, not when it is invoiced.

Today the books do not see the wallet. Central writes a Credit Ledger Entry, and
ERPNext learns nothing until an invoice is paid. So ERPNext holds no advance, charges
no GST on it, and cannot settle an invoice against it.

This spec makes each top-up an advance Payment Entry in ERPNext, with GST included.
Later, when Central bills the customer, the Sales Invoice uses that advance. The GST
charged on the advance then moves onto the invoice.

This is ADR 0019 section 4 ("Wallet money moves into ERPNext as an advance"), made
concrete for the system as it runs now.

## Feasibility

It is feasible with standard ERPNext and India Compliance documents. No custom
accounting logic is needed on the ERPNext side, except for one idempotency field.

I checked the ERPNext source on the bench and the staging site that Central syncs
to (`erpnext 17.0.0-dev`, `india_compliance 17.0.0-dev`), with read-only calls.

What exists:

- **Advance.** A Payment Entry of type Receive, with no invoice reference, is an
  advance. Its `unallocated_amount` is the amount not yet used.
- **GST on the advance.** The Payment Entry has a `taxes` table (Advance Taxes and
  Charges) and a `sales_taxes_and_charges_template` field. A tax row can be
  `included_in_paid_amount`, so a payment of 1,180 books 1,000 plus 180 GST.
- **GST fields.** India Compliance adds `place_of_supply`, `billing_address_gstin`,
  `gst_category` and `company_gstin` to the Payment Entry and the Sales Invoice.
- **Settlement.** A Sales Invoice has an `advances` table (Sales Invoice Advance).
  Each row names a Payment Entry and an `allocated_amount`.
- **Tax templates.** Staging has `Output GST In-state - FTPL` and
  `Output GST Out-state - FTPL`.
- **Separate advance account.** Company has
  `book_advance_payments_in_separate_party_account` and
  `default_advance_received_account`.

What I could not prove without a test on staging:

- **GST reversal on allocation.** When an advance with GST is allocated to an invoice,
  the GST on the advance must be reversed, because the invoice now carries it. India
  Compliance is expected to do this and to report it in GSTR-1 tables 11A and 11B.
  The first build step is a scripted test on staging that confirms it. See
  [Verification before build](#verification-before-build).

Gaps on staging now:

- The company does not book advances in a separate account
  (`book_advance_payments_in_separate_party_account = 0`, no
  `default_advance_received_account`). Advances would land in Debtors, which is legal
  but hard to reconcile.
- The Sales Invoice has no `cloud_billing_invoice` field. The Sales Invoice sync sends
  it, and ERPNext drops it without an error. The back-reference is lost.

## Which wallet entries move

Not every credit in the wallet is money received. Only money received is an advance.

| Central entry | What it is | In ERPNext |
|---|---|---|
| Top-up (`reference_type` Top-up or Payment Method) | Money the customer paid | Advance Payment Entry, with GST |
| Promotion | Credit we gave away | Not an advance. See [Open decisions](#open-decisions) |
| Refund to wallet | Part of a paid invoice returned as credit | Credit Note against that invoice. Its credit balance works as an advance |
| Admin adjustment | Manual correction | Manual journal in ERPNext. Not synced |
| Debit against an invoice | Credit used | An `advances` row on that invoice's Sales Invoice |
| Expiry | Promotional credit written off | Nothing, because promotional credit is not mirrored |

## Flow

### 1. Top-up is captured

Nothing changes in the capture path. `credits.purchase` books the Credit Ledger Entry,
and it is idempotent on `gateway_payment_id`. After that entry commits, Central queues
an advance sync for it.

### 2. Advance sync job

A background job in `ingester/advance.py`, in the same shape as the customer sync:

1. Take the team's sync lock before any read.
2. Read the Credit Ledger Entry. Skip it if it already has an advance id.
3. Wait if the team has no customer in ERPNext yet. Queue the customer sync and retry
   later.
4. Build the Payment Entry (see below) and submit it.
5. Store the Payment Entry name on the Credit Ledger Entry.
6. Let the job commit. No manual commit.

### 3. Payment Entry

| Field | Value |
|---|---|
| `payment_type` | Receive |
| `party_type`, `party` | Customer, the team's `profile_id` |
| `company` | The billing company |
| `posting_date` | The date the top-up was captured |
| `mode_of_payment` | One per gateway: Stripe, Razorpay, PayPal |
| `paid_to` | The clearing account for that gateway and currency |
| `paid_amount` | The amount credited to the wallet (gross) |
| `reference_no`, `reference_date` | The gateway payment id, the capture date |
| `customer_address` | The team's `address_id` |
| `billing_address_gstin` | The effective GSTIN: blank when unregistered or lapsed |
| `gst_category` | From the GSTIN check, or Unregistered |
| `place_of_supply` | From the billing state. Foreign: 96-Other Countries |
| `sales_taxes_and_charges_template` | In-state or Out-state, from the place of supply |
| `taxes` | The template's rows, with `included_in_paid_amount = 1` |
| External reference (new custom field) | The Credit Ledger Entry name, with a unique index |

No GST applies to an export advance under LUT, or to an SEZ customer. Those Payment
Entries have no tax rows. The same tax standing that the invoice uses decides this.

### 4. Invoice settlement

Central decides how much wallet credit an invoice uses (`credit_applied`), as it does
now. The Sales Invoice sync then adds one `advances` row for each advance that credit
came from. Oldest advance first, matching the order Central draws its lots.

To know which advances an invoice used, Central records the allocation when it applies
the credit. That is a new child table on the invoice: advance id and amount.

The card or UPI part of a paid invoice also needs its own Payment Entry against the
Sales Invoice. Today the sync sends no payment at all, so every synced invoice stays
outstanding in ERPNext. This is a gap in the existing sync, and the settlement work
depends on it.

### 5. Idempotency and failure

- **Key.** The Credit Ledger Entry name, on an ERPNext custom field with a unique
  index. A replayed request finds the existing Payment Entry and does not create a
  second one. This is the same rule ADR 0019 applies to `period_key`.
- **Recovery.** A request that timed out is resolved by looking up the key. It is not
  resolved by posting again.
- **Retry.** A failed sync retries with backoff. A daily job queues any captured top-up
  that has no advance id.
- **Failure isolation.** The wallet is never blocked. A top-up that has not synced
  still funds the customer, because the money is real.
- **Invoice gate.** An invoice that uses credit from an unsynced advance waits at Draft,
  like the existing holds, until the advance exists in ERPNext.

## Invariant

Per team and currency: purchased credit in the Central wallet equals the unallocated
advance for that customer in ERPNext. The scheduled invariant audit checks it and
reports a difference. It does not correct it. This is the cross-system invariant from
ADR 0019.

## Central changes

- `ingester/advance.py`: the advance sync job, the daily retry, and the invariant check.
- Credit Ledger Entry: `advance_id` and sync status fields. The field names must not
  name ERPNext.
- Invoice: an allocation child table (advance id, amount), written by the credit
  waterfall.
- Sales Invoice sync: send `advances` rows, and a Payment Entry for the card part.
- Invoice gate: a new hold reason for unsynced advances.

## ERPNext setup

- One custom field on Payment Entry for the external reference, with a unique index.
- The same kind of field on Sales Invoice for the Central invoice (`period_key`,
  per ADR 0019). This also fixes the back-reference that is dropped now.
- Company: turn on `book_advance_payments_in_separate_party_account`, and set
  `default_advance_received_account`.
- A Mode of Payment and a clearing account for each gateway and currency.
- A receivable account in USD for foreign customers.

## Verification before build

Run this on staging with one test customer, then read the GL entries and GSTR-1:

1. Create a Payment Entry for 1,180 with the in-state template, tax included.
2. Check that GST is booked on the advance.
3. Create a Sales Invoice for 500 plus GST, and allocate 590 of the advance to it.
4. Check that the GST on the allocated part of the advance is reversed.
5. Check that GSTR-1 shows the advance in table 11A and the adjustment in table 11B.
6. Repeat with a partial allocation, and with an export customer under LUT.

If step 4 or 5 fails, India Compliance does not handle the reversal. The design then
needs a Journal Entry for the reversal, and this spec must change before the build
starts.

## Open decisions

- **Promotional credit.** It is not money received, so it is not an advance. When an
  invoice uses it, the books need a choice: a discount on the Sales Invoice, which
  lowers the taxable value, or a payment by the company, booked as a marketing
  expense, where GST stays on the full value. This is a tax decision for Finance.
- **Existing balances.** Wallets that already hold purchased credit need opening
  advances in ERPNext before the invariant can hold. This is a one-time migration.
- **Refund of unused credit.** Central does not pay out unused wallet credit now. If it
  starts, each payout needs a refund voucher and a reversal of the advance GST.
- **Rounding.** GST included in the amount paid can differ from the invoice GST by a
  paisa. Decide which side absorbs it.
