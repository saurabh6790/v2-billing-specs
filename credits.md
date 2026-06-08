# Credits

## Purpose

An append-only credit ledger that is the customer's prepaid wallet and an alternative to autopay, with a settlement model that keeps prepaid-in-a-postpaid-system secured.

## Concepts

- Every credit movement is a **Credit Ledger Entry**. Balance is always computed from the ledger sum — **never** stored as a scalar on Team (the v1 negative-balance bug).
- Entries are **append-only**. Credits are booked as advance liability, not income.

## Data Model

**Credit Ledger Entry** (separate DocType)

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| entry_type | Select | credit / debit |
| amount | Long Int | **Minor units** (paisa/cent), always positive — [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). The v1 drift bug was a stored float balance; integer minor units cannot drift |
| running_balance | Long Int | Minor units — balance after this entry (exact integer sum of the ledger; may be signed) |
| reference_type / reference_name | Data | Invoice / Payment Attempt / etc. |
| note | Small Text | |
| created_at | Datetime | |

| Entry type | Direction | Trigger |
|-----------|-----------|---------|
| Top-up | credit | Customer purchases credits |
| Invoice settlement | debit | Credits applied to an open invoice |
| Refund | credit | Partial overcharge / gateway refund |
| Expiry | debit | Unused credits past validity *(open: see Notes)* |
| Admin adjustment | credit/debit | Manual correction |

## Concurrency

Credits applied at invoice time under `SELECT ... FOR UPDATE` on the team's latest ledger entry — preventing the v1 concurrent double-spend race.

## Settlement model

Every team needs **at least one settlement source** at onboarding: **card/mandate autopay** *or* **prepaid credits** (or both). Waterfall when both exist: **credits first, then card**.

- **Autopay teams:** credits applied first, remainder auto-charged. The card is the backstop, so the cap follows the trust tier directly.
- **Credits-only teams:** the bill is drawn from the wallet. Because billing is postpaid, this is unsecured unless the **wallet gates provisioning** → effective cap = `min(tier cap, wallet-covered spend)`. The running forecast continuously compares projected month-end spend to the balance; at ~80% the team is notified to top up, and the next token refresh shrinks the cap (deny new provisions) *before* an overspend. Running resources are never stopped for this — only the residual shortfall at settlement flows into normal dunning.

## API

```
POST /api/method/cloud_billing.credits.purchase        { amount, currency, payment_method } → ledger_entry, new_balance
GET  /api/method/cloud_billing.credits.get_balance     → { balance, currency }
GET  /api/resource/Credit Ledger Entry?order_by=created_at desc
POST /api/method/cloud_billing.admin.adjust_credits    { team, amount, type, note }   # [Admin]
GET  /api/method/cloud_billing.admin.get_credit_ledger?team=TEAM-001                  # [Admin]
```

## Notes

- **Open items:** multi-currency credit handling, and credit-expiry mechanics (validity period, expiry debit timing) — not yet decided.
- Partial-overcharge corrections land here as a `credit` entry (see [invoicing.md](invoicing.md)).
