# Measurements (production backup)

Read-only `SELECT` queries on `prod-central-bck.local`, the production backup
served by the local bench (`pause_scheduler` and `mute_emails` are set in its site
config). The latest Invoice change in the backup is **3 Nov 2026 12:39**, so these
are production facts as of that moment: evidence level **E4 (data)**. Nothing was
written. Only counts and amounts are reported; no team, person or record id.

The query files are in the session scratchpad (`m1.sql`–`m3.sql`), not in this repo.

## Who is billed

| Measure | Value |
|---|---|
| Billing profiles | 143 (79 internal, **64 external**) |
| External profiles by collection mode | **Prepaid: 64** (52 INR, 12 USD). Auto Charge, Manual Checkout, Action Required: 0 |
| Country vs currency (all profiles) | India/INR 130, other/USD 13. No mismatches |

## D1 Billing setup and payment methods

External teams only.

```mermaid
flowchart LR
  A[64 billing profiles] --> B[9 complete<br/>14%]
  B --> C[6 tried a payment method]
  C --> D[2 with an active method]
  A -.-> W[3 with a credit wallet]
```

| Measure | Value | Bears on |
|---|---|---|
| Profiles with legal name, address line 1, city and country | 9 of 64 | CB-12, D-08 |
| Incomplete profiles (no legal name) | 55, of which **43 have country = India and nothing else required** | CB-12 |
| Payment methods, all teams, by status | Card: 3 Active, 1 Failed, **8 Pending Validation**. UPI Autopay: 1 Active, **5 Pending Validation** | CB-21 |
| Age of Pending Validation methods at backup time | 6 to 20 days; none had become Active | CB-21 |
| Teams whose only methods are Pending Validation | **10** | CB-21 |
| Pending card setups by reference prefix | 5 Stripe Checkout Session (`cs_li…`), 1 test session (`cs_te…`), 2 SetupIntent (`seti_…`) | CB-21 |
| Webhook events matched to a Pending Validation method | UPI: 4 × Razorpay `payment.failed`, all **Ignored**. Card: 1 × `setup_intent.created`, Processed | CB-21 |
| Billing Events "Payment Method Active" | 5 ever | CB-21 |
| Prepaid teams that also hold an active card or UPI method | **4** | CB-04 |
| External teams with a positive wallet balance and an active method | 1 | CB-05 |

**What this does and does not show.** Most teams that start adding a method do not
finish, and the unfinished rows never resolve. `list_payment_methods` hides
Pending Validation rows (`central/billing/api/dashboard/methods.py:34`), so the
customer sees nothing either. Whether the customer abandoned, the bank declined,
or a confirmation was lost is **not established**. The 4 ignored UPI
`payment.failed` events show that at least some were bank failures that left the
row Pending instead of Failed.

## D2 Invoices and collection

| Measure | Value | Bears on |
|---|---|---|
| Billable invoices | 17: **Waived 11** (all internal teams), **Cancelled 4**, **Outstanding 2**, Paid 0 |
| External billable invoices | 6: 4 Cancelled, 2 Outstanding | CB-16 |
| Statuses the customer list can filter | Outstanding, Paid, Overdue. **4 of 6** external invoices are in a status it cannot filter | CB-16 |
| Cancelled external invoices, totals | ₹0.01, ₹0.26, ₹14.04, ₹42.74 | CB-16, D-07 |
| Outstanding external invoices | 2 (₹11,367.17 and ₹2,200.80). **Both** have `hold_reason = Accounting Sync`, no ERPNext invoice, `erpnext_sync_status = Pending` | CB-22 |
| Payment Attempts | **0** | CB-07, CB-09, CB-10 |
| Invoices with credits, top-up GST or TDS applied | 0 of 17 | CB-01 |
| Invoices where `total ≠ expected_collection` | 11, all Waived (expected 0) | CB-01 |
| Webhook events | 46 total: 4 Processed, 42 Ignored | CB-21 |

**What this does and does not show.** At backup time no external customer could
pay an invoice from the console. Both owed invoices were held for accounting
sync, which shows "This invoice is being prepared" (`BillingInvoicesPage.vue:389-393`).
Whether the hold comes from production configuration or was cleared after 3 Nov
is **not established**. Settle that before acting on CB-22. No customer has used
Pay now yet, so the pay-flow problems (CB-07, CB-09, CB-10) have **no measured
frequency**. Their priority comes from how many teams they will reach, not from
incidents.

## How the measurements changed priorities

| Problem | Before measuring | After | Why |
|---|---|---|---|
| CB-21 setup never completes | not known | **P1** | 10 teams stuck; it blocks the welcome credit and servers |
| CB-22 owed invoices unpayable | not known | **P1, confirm first** | 2 of 2 external owed invoices |
| CB-03 / CB-04 collection mode | P1 | P1 | Every external team is Prepaid; 4 also hold a method the backend can debit |
| CB-01 receipt arithmetic | P1 | **P2** | No invoice has credits or TDS yet |
| CB-02 last method removal | P1 | **P2** | No team is on Auto Charge |
| CB-16 status filter | P3 | **P2** | Most external invoices are Cancelled |
| CB-12 country auto-save | P2 | P2 | 43 profile rows fit the pattern; cause not proven |
