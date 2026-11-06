# ERPNext staging: findings for GST advances

Date: 2026-09-27

These are the facts found while checking whether a wallet top-up can be an advance
with GST in ERPNext, and settled later against an invoice. The design is in
[wallet-advance-sync.md](wallet-advance-sync.md). The setup plan is in
[accounting-setup-plan.md](accounting-setup-plan.md).

All checks on staging used read-only API calls.

## The staging site

- Apps: `frappe 17.0.0-dev`, `erpnext 17.0.0-dev`, `india_compliance 17.0.0-dev`,
  `frappe_io`, `payments`, `hrms`, `builder`.
- One company: `Frappe Technologies Pvt Ltd` (abbreviation `FTPL`), India, INR.

### What exists

| Item | Value |
|---|---|
| Receivable account | `Debtors - FTPL` |
| Output GST accounts | `Output Tax CGST - FTPL`, `Output Tax SGST - FTPL`, `Output Tax IGST - FTPL` |
| Tax categories | `In-State`, `Out-State`, `Reverse Charge In-State`, `Reverse Charge Out-State`, `Registered Composition` |
| Sales tax templates | `Output GST In-state - FTPL` (CGST 9, SGST 9), `Output GST Out-state - FTPL` (IGST 18) |
| Round-off account | `Rounded Off - FTPL` |
| Exchange gain/loss account | `Exchange Gain/Loss - FTPL` |
| Income account, cost center | `Sales - FTPL`, `Main - FTPL` |

### What is missing or wrong

| Gap | Effect |
|---|---|
| The company has no GSTIN. Its GST category is Unregistered. | India Compliance does not treat any document as a GST transaction. This blocks all GST testing. |
| No company address. | No place of supply can be computed. |
| No advance account. `book_advance_payments_in_separate_party_account` is off. | Advances land in Debtors. The wallet invariant is hard to check. |
| No bank or clearing account. Only `Cash - FTPL` exists. | A top-up has no account to land in. |
| No Mode of Payment for Stripe, Razorpay or PayPal. | A Payment Entry cannot name the gateway. |
| The only service item, `VM`, has HSN `010190` (live horses). | Wrong on a tax invoice. GST Settings also requires a code of 6 or more digits. |
| GST Settings: `enable_overseas_transactions = 0`. | Export invoices and export advances cannot be tested. |
| No export (zero-rated) tax template or tax category. | Same. |
| Sales Invoice has no `cloud_billing_invoice` field. | The Central Sales Invoice sync sends it, and ERPNext drops it without an error. |
| Test customers such as `team-mandate-gap Ltd - 7`. | Billing tests reached staging before the test base class turned the sync off. These can be deleted. |

## How ERPNext and India Compliance handle an advance

- **Advance.** A Payment Entry of type Receive, with no invoice reference, is an
  advance. Its `unallocated_amount` is the part not yet used.
- **GST on the advance.** India Compliance allows GST rows on a Payment Entry only
  when the party is a Customer. It rejects them for a Supplier.
- **Reversal.** When the advance is allocated to a Sales Invoice, India Compliance
  reverses the GST on the allocated part. The function is
  `make_gst_revesal_entry_from_advance_payment`. It runs on submit, and again on
  `on_update_after_submit` when the allocation comes from Payment Reconciliation.
- **Amount reversed.** Proportional: `tax x allocated amount / paid amount`.
- **Settlement.** A Sales Invoice uses an advance through its `advances` table. Each
  row names a Payment Entry and an `allocated_amount`.

### Rules for a Payment Entry sent over the API

A tax template fills the tax rows only in the browser. Over the API, the caller sends
the rows itself:

- One row for each GST account: CGST 9 and SGST 9, or IGST 18.
- `charge_type` is `On Paid Amount`. The template's `On Net Total` is not a valid
  option on a Payment Entry.
- `included_in_paid_amount` is 1, so a payment of 1,180 books 1,000 and 180 GST.
- Set `company_gstin`, `place_of_supply`, `customer_address` and
  `billing_address_gstin`.

## Rules to follow

- **Invoice number.** CGST Rule 46: 16 characters or fewer, only letters, digits,
  `/` and `-`, unique for each financial year.
- **Receipt voucher.** CGST Rule 50: an advance needs a receipt voucher. A refund of
  an advance needs a refund voucher. Both need a print format.
- **Company advance account.** It must be in the company currency (INR).
  `Company.validate_advance_account_currency` checks this.
- **Naming series over the API.** `Document Naming Settings.update_series` is
  whitelisted, so Central can add the series it needs.

## Test GSTINs

Staging can use made-up GSTINs. Each one needs a correct check digit, which is the
15th character, because India Compliance checks it on save. The first two digits
must match the state on the address.

| Use | GSTIN | State |
|---|---|---|
| Company | `27AAACZ9999Z1ZC` | Maharashtra |
| Customer, same state | `27AABCT1111T1Z5` | Maharashtra |
| Customer, other state | `29AABCU2222U1ZS` | Karnataka |
| Customer, other state | `07AABCV3333V1ZP` | Delhi |

The check digits were computed and tested against a real GSTIN (`27AAPFU0939F1ZV`).

Limits:

- Central looks GSTINs up on the real GST portal (`enable_api = 1`,
  `sandbox_mode = 0`). A made-up GSTIN is not found, so Central holds the invoice as
  "GSTIN Check". For a test, set `gst_status = Active` on the Billing Profile by hand.
- Do not file GSTR-1 or generate e-invoices with these numbers. E-invoicing is off on
  staging.

## Expected result of the advance test

For a customer in the same state as the company:

1. A top-up of 1,180 books 180 GST (CGST 90, SGST 90). The unallocated advance is
   1,180.
2. An invoice of 500 plus 90 GST (590) allocates 590 of the advance. India Compliance
   reverses 590 / 1,180 of the advance GST: CGST 45, SGST 45. The invoice books its
   own 90.
3. The advance has 590 left, with 90 GST still booked on it.
4. GSTR-1 shows the advance in table 11A and the adjustment in table 11B.
