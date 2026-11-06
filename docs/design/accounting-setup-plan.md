# Plan: accounting setup, advance test, invoice test

Date: 2026-09-27
Status: For review. Nothing here is done yet.

This plan has four phases. Each phase ends at a review point. Nothing is written to
the staging ERPNext site until phase 2 is reviewed.

The facts behind this plan are in
[erpnext-staging-findings.md](erpnext-staging-findings.md). The design of the
advance sync is in [wallet-advance-sync.md](wallet-advance-sync.md).

## Phase 1: the setup provision in Central

Central gets one place that holds every accounting-system name it needs, and two
actions that check and create those records. Phase 1 is code only. It does not touch
staging.

### 1.1 Accounting Settings

A new Single DocType, **Accounting Settings**, in the Billing module. Field names do
not name ERPNext. The API key, the secret and the URL stay in the site config.

| Section | Fields |
|---|---|
| Company | `company`, `company_gstin`, `company_address_id` (set by the setup) |
| Company address | `address_line1`, `city`, `state`, `pincode` |
| Accounts | `receivable_account`, `advance_account`, `income_account`, `cost_center` |
| Gateways (child table) | `gateway`, `currency`, `mode_of_payment`, `clearing_account` |
| Service item | `service_item`, `sac_code` |
| Tax | `in_state_template`, `out_state_template`. Zero-rated supplies (export, SEZ) use no template. |
| Invoice series | `series_india_b2b`, `series_india_b2c`, `series_overseas_b2b`, `series_overseas_b2c` |
| Receipt series | `series_receipt_voucher`, for advances |
| Print formats | `invoice_print_format`, `receipt_voucher_print_format` |

The defaults are the names found on staging, or the names phase 2 creates.

### 1.2 Only usable when the integration is on

The master switch stays `enable_erpnext_sync` in the site config.

- With the switch off, the DocType opens read-only with a message, and both actions
  refuse to run.
- The sync code reads Accounting Settings only when the switch is on.
- A sync that needs a setting that is blank fails with the setting's name. The
  invoice hold then keeps the invoice at Draft.

### 1.3 Two actions

Both are admin-only. They sit in `billing/api/admin/`, because only `billing/api/**`
may be whitelisted.

1. **Check setup.** Read-only. For each record in the settings, it reports: exists,
   missing, or different from what Central expects. It writes nothing.
2. **Create missing.** It creates only the records that are missing. It never changes
   or deletes a record that exists. Every create is idempotent, because it looks the
   record up by name first. Each run is written to a log.

The code goes in `billing/ingester/setup.py`. The print format templates are files in
the Central repo, so they are reviewed like code.

### 1.4 Which series an invoice uses

| Category | Rule | Example series | Example number |
|---|---|---|---|
| India B2B | Country India, and an effective GSTIN | `B2B/.TFY./.#####` | `B2B/2627/00001` |
| India B2C | Country India, and no effective GSTIN | `B2C/.TFY./.#####` | `B2C/2627/00001` |
| Overseas B2B | Country not India, and a business tax id | `EXB/.TFY./.#####` | `EXB/2627/00001` |
| Overseas B2C | Country not India, and no business tax id | `EXC/.TFY./.#####` | `EXC/2627/00001` |
| Receipt voucher | Every advance | `RV/.TFY./.######` | `RV/2627/000001` |

"Effective GSTIN" means the GSTIN the Central invoice carries, which is blank when
the GSTIN has lapsed. `.TFY.` is ERPNext's short fiscal-year token. Phase 2 confirms
its exact output, and that each number is 16 characters or fewer (CGST Rule 46).

### 1.5 Tests

Tests stub every HTTP call. They cover: the switch off, check-only never writes,
create-missing skips what exists, series selection for all four categories, and the
16-character limit.

**Review point 1:** the settings, the rules, and the code.

## Phase 2: set up staging

Run **Check setup** first and review its report. Then run **Create missing**. It
creates this list, and nothing else:

| Record | Name | Details |
|---|---|---|
| Company address | `Frappe Technologies Pvt Ltd-Billing` | Maharashtra, test GSTIN `27AAACZ9999Z1ZC`, marked as a company address |
| Company | (update) | GSTIN from the address, GST category Registered Regular |
| Advance account | `Customer Advances - FTPL` | Under Current Liabilities, type Receivable, INR |
| Company | (update) | Book advances in a separate party account, with the account above |
| Clearing accounts | `Stripe Clearing - FTPL`, `Razorpay Clearing - FTPL`, `PayPal Clearing - FTPL` | Type Bank, INR |
| Modes of Payment | `Stripe`, `Razorpay`, `PayPal` | Type Bank, each with its clearing account as the company default |
| Service item | `Cloud Hosting` | Non-stock, SAC `998315`, income account `Sales - FTPL` |
| Naming series | The five series in 1.4 | Added to Sales Invoice and Payment Entry |
| Print formats | `Cloud Tax Invoice`, `Cloud Receipt Voucher` | Sales Invoice and Payment Entry |

Two updates change an existing record, the Company. They are listed so that the
review sees them. The switch to allow overseas transactions in GST Settings is not in
this list. It is a site-wide change and needs its own decision.

To undo phase 2: delete the created records in reverse order, and put the two
Company fields back.

**Review point 2:** the Check setup report, then the result of Create missing.

## Phase 3: advance, then invoice against the advance

This uses one test team on the Central dev site, which syncs to staging.

1. Complete the team's Billing Profile in Maharashtra with the test GSTIN
   `27AABCT1111T1Z5`. Set `gst_status = Active` by hand, because a made-up GSTIN
   cannot pass the portal lookup.
2. Let the customer sync create the Customer, Address and Contact. Check them in
   ERPNext.
3. Book a top-up of 1,180 in the wallet. The first choice is `credits.purchase` with a
   test payment id, because it gives the same result every time. A real Stripe test
   top-up can follow.
4. Push the advance. A first version of `ingester/advance.py` posts a submitted
   Payment Entry with the series `RV/...`, CGST 9 and SGST 9 included in the amount,
   and the Credit Ledger Entry name as its key.
5. Check: GST of 180 is booked, and the unallocated advance is 1,180.
6. Bill the team for 500 plus GST. The wallet pays 590, so the invoice is Paid in
   Central.
7. Push the Sales Invoice, and submit it. The payload now includes: the company, the
   service item, series `B2B/...`, the in-state template rows, place of supply, the
   customer address, and one `advances` row for 590 against the advance.
8. Check: CGST 45 and SGST 45 of the advance GST are reversed. The invoice books its
   own 90. The advance has 590 left. GSTR-1 shows tables 11A and 11B.
9. Repeat steps 1 to 8 for an out-of-state customer (IGST) and for an unregistered
   customer.

Central changes this phase needs:

- `ingester/advance.py`: push one advance, keyed on the Credit Ledger Entry.
- Credit Ledger Entry: `advance_id` and sync status fields.
- Invoice: a child table that records which advance paid how much.
- Sales Invoice sync: the payload above, sent as a submitted invoice. Today it sends a
  Draft with no company, no item code and no taxes.

**Review point 3:** the GL entries and GSTR-1 for the three customers.

## Phase 4: invoice paid by card or UPI (next)

This phase is only listed here. It gets its own plan after phase 3.

- The card or UPI part of a paid invoice becomes a Payment Entry against the Sales
  Invoice, in the gateway's clearing account.
- An invoice paid partly by wallet and partly by card gets both: `advances` rows and a
  Payment Entry.
- Gateway fees and the payout from the clearing account to the bank are separate
  entries.

## Decisions needed before phase 1

1. **Overseas B2B or B2C.** Central has no field for a foreign business tax id (VAT,
   EIN). Add one to the Billing Profile, or send every overseas invoice as B2C?
2. **SAC code.** `998315` (hosting and IT infrastructure provision) is proposed.
   Finance should confirm it.
3. **Overseas transactions.** Turn on `enable_overseas_transactions` in GST Settings
   on staging, so that exports can be tested?
4. **Create or only check.** This plan lets Central create missing records. The other
   choice is that Central only checks, and people create the records in ERPNext.
5. **Print formats.** Keep the templates in the Central repo (proposed), or build them
   in ERPNext by hand?
6. **Test customers on staging.** Delete the old test customers, for example
   `team-mandate-gap Ltd - 7`?
