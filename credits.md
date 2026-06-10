# Credits

## Purpose

An append-only credit ledger that is the customer's prepaid wallet and an alternative to autopay,
with a settlement model that keeps prepaid-in-a-postpaid-system secured — **kept custom**, but
posting advances into ERPNext so the GL stays whole.

## Why custom (not ERPNext advances/credit notes alone)

ERPNext models advance payments and credit notes, but not a **customer-facing running wallet** whose
balance is the sum of an append-only ledger with concurrency-safe spend. The v1 bug was a *stored
scalar balance* that drifted negative; the fix is an append-only ledger, which is a custom DocType.
We keep it — and **reflect each movement into ERPNext** as a Payment Entry (advance / unallocated)
or a credit-note allocation, so the statutory ledger matches the wallet. See
[ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

## Concepts

- Every credit movement is a **Credit Ledger Entry**. Balance is always computed from the ledger sum
  — **never** stored as a scalar on Team (the v1 negative-balance bug).
- Entries are **append-only**. Credits are booked as advance liability, not income — mirrored in
  ERPNext as an unallocated/advance **Payment Entry** on the team's Customer.

## Data Model

**Credit Ledger Entry** (custom DocType)

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| customer | Link → Customer | the ERPNext Customer mirrored to |
| entry_type | Select | credit / debit |
| amount | Long Int | **Minor units**, always positive ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) |
| running_balance | Long Int | Minor units — exact integer sum after this entry (may be signed) |
| reference_type / reference_name | Data | Sales Invoice / Payment Entry / Refund / etc. |
| erpnext_payment_entry | Link → Payment Entry | the mirrored advance / allocation |
| note | Small Text | |
| created_at | Datetime | |

| Entry type | Direction | Trigger | ERPNext mirror |
|-----------|-----------|---------|----------------|
| Top-up | credit | Customer purchases credits | advance Payment Entry (unallocated) |
| Invoice settlement | debit | Credits applied to a Sales Invoice | allocate advance to the invoice |
| Refund | credit | Partial overcharge / gateway refund | credit note / Payment Entry |
| Expiry | debit | Unused credits past validity *(open — see Notes)* | journal/write-off |
| Admin adjustment | credit/debit | Manual correction | journal entry |

## Concurrency

Credits applied at invoice time under `SELECT … FOR UPDATE` on the team's latest ledger entry (the
**Credit Wallet** anchor row), preventing the v1 concurrent double-spend race. The ERPNext mirror is
written in the same transaction, so wallet and GL never diverge.

## Settlement model

Every team needs **at least one settlement source** at onboarding: **card/mandate autopay** *or*
**prepaid credits** (or both). Waterfall when both exist: **credits first, then card**.

- **Autopay teams:** credits applied first (allocated against the Sales Invoice), remainder
  auto-charged via Payment Request. Cap follows the trust tier directly.
- **Credits-only teams:** the bill is drawn from the wallet. Because billing is postpaid, this is
  unsecured unless the **wallet gates provisioning** → effective cap = `min(tier cap, wallet-covered
  spend)`. The running forecast continuously compares projected month-end spend to the balance; at
  ~80% the team is notified to top up, and the next token refresh shrinks the cap (deny new
  provisions) *before* an overspend. Running resources are never stopped for this — only the residual
  shortfall at settlement flows into normal dunning.

## API

```
POST /api/method/central.billing.credits.purchase     { amount, currency, payment_method } → ledger_entry, new_balance
GET  /api/method/central.billing.credits.get_balance   → { balance, currency }
GET  /api/resource/Credit Ledger Entry?order_by=created_at desc
POST /api/method/central.billing.admin.adjust_credits  { team, amount, type, note }   # [Admin]
GET  /api/method/central.billing.admin.get_credit_ledger?team=TEAM-001                # [Admin]
```

## Notes

- **Open items:** multi-currency credit handling, and credit-expiry mechanics — not yet decided.
- Partial-overcharge corrections land here as a `credit` entry (see [invoicing.md](invoicing.md)).
- Reads gated by `billing:view`, mutations by `billing:manage` ([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)).
