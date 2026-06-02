# Invoicing

## Purpose

Generate invoices in arrears from observed runtime + locked prices, dispatched in parallel to avoid the 1st-of-month bottleneck, and correct them without mutation.

## Billing philosophy

**Pure postpaid / in-arrears.** Everything (fixed + metered) is billed on the 1st for the month just ended, including the partial first month. A team joining June 15 gets its first invoice July 1 covering June 15–30, then full months. **No charge at sign-up** — prepaid-for-fixed is rejected because it needs pro-rata credit notes (banned). Bad-debt risk is bounded by the entitlement cap and, for credits-only teams, the wallet.

The billing period is always the calendar month.

## Two-phase generation

**Phase 1 — Draft pre-generation (28th)** — heavy computation, off-peak.

```python
for sub in active_subscriptions:
    enqueue("cloud_billing.billing.generate_draft_invoice", subscription=sub)
```

Each job (**reconcile-then-draft** — sync is push-based, so data is usually already on Central):
1. If the team's last sync is stale, pull events + meter rollups; else use what was pushed.
2. Compute line items per segment using the **locked price** (keyed by `resource_id`) + metered line items.
3. Apply tax ([tax.md](tax.md)).
4. Create a `Draft` invoice — no payment yet.

**Phase 2 — Open & collect (1st)** — one lightweight job per draft, parallel across workers.

```python
for inv in drafts(period_end=last_day_of_prev_month):
    enqueue("cloud_billing.billing.open_and_collect", invoice=inv)
```

Each job: apply credits (`FOR UPDATE` lock) → `Draft → Open` → notify → if amount due > 0, charge via gateway. The scheduler finishes in seconds; workers stagger collection naturally (respecting gateway rate limits).

## Billing computation

Join the Agent event log (time windows) to Central price-locks (locked price). Day-granularity by default.

```
Agent log (resource R):  plan-2vcpu Jun1→Jun10, plan-4vcpu Jun10→Jun22, plan-2vcpu Jun22→Jun30
Locked prices:           plan-2vcpu ₹1000/mo, plan-4vcpu ₹2000/mo
Result (new plan wins the day of change):
  plan-2vcpu Jun1–9   =  9 × (1000/30) = 300.00
  plan-4vcpu Jun10–21 = 12 × (2000/30) = 800.00
  plan-2vcpu Jun22–30 =  9 × (1000/30) = 300.00
```

Rules:
- **New plan wins the day** of a change.
- **`max(1, end − start)` floor** — a resource created *and* destroyed the same day is charged 1 day, not zero (closes the same-day-churn free faucet).
- **Granularity follows `billing_interval`.** The engine is generic over the unit (read from the locked resource). `daily`/`monthly` exercised at launch; `hourly` wired but unused (lights up for GPU/burst tiers later, no rewrite).

## Data Model

**Invoice** (stable)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | INV-YYYY-MM-NNNNN |
| team / subscription | Link | |
| invoice_type | Select | billable / cost_report (free/trial) |
| period_start / period_end | Date | |
| status | Select | Draft / Open / Paid / Overdue / Waived / Cancelled |
| subtotal | Currency | |
| (tax block) | | See [tax.md](tax.md) — output tax, zero-rating, withholding |
| credit_applied | Currency | |
| total | Currency | subtotal + output_tax |
| expected_collection | Currency | total − tds_amount (auto-charge target) |
| amount_paid | Currency | `paid` when amount_paid ≥ expected_collection |
| due_date | Date | |
| erpnext_invoice / pdf_url | Data | |

**Invoice Line Item** (child table — generated once, never updated)

| Field | Type | Notes |
|-------|------|-------|
| subscription_resource | Link | Source of locked price |
| resource_type / unit / quantity | | |
| rate | Currency | Locked price copied at generation |
| days | Int | Whole units active (with max-1 floor) |
| amount | Currency | days × (rate / units_in_period) |

## Invoice states

```
Draft → Open → Paid
              → Overdue → Waived (admin)
              → Cancelled
```

`Paid` only on webhook confirmation, never on the gateway API response. See [payments.md](payments.md).

## Corrections

Invoices are immutable once issued; correct by state, never by mutation:

- **Pre-payment** (Draft/Open): **cancel + reissue** (the 28th→1st buffer exists for this).
- **Post-payment** (Paid):
  - **Full dispute** → refund to source (`adapter.refund()`); invoice **stays `Paid`** + linked `Refund` (no "refunded" state — preserves GST immutability).
  - **Partial overcharge** → difference to the customer's **wallet** ([credits.md](credits.md)), applied next cycle.

All corrections **originate in Cloud Billing** (single money SOR) and sync the credit note **down** to ERPNext (statutory SOR). The credit-note ban is on *automatic proration* only; *admin correction* notes for GST downward revisions are allowed (in ERPNext).

## Forecast API

```
GET /api/method/cloud_billing.billing.get_forecast
    → { period_start, projected_total, credit_balance, shortfall, days_remaining, line_items[] }
```

Driven by the running-total meter rows ([metering.md](metering.md)) + fixed-resource accrual.

## Notes

- ERPNext sync is async, one-way, non-blocking; failure never rolls back the customer invoice.
- The reconciliation job (the "charged-but-never-webhooked" terminal state) is the most important hardening task — see [payments.md](payments.md) and [roadmap.md](roadmap.md).
