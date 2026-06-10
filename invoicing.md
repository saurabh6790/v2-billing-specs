# Invoicing

## Purpose

Generate invoices in arrears from observed runtime + locked prices, as **ERPNext Sales Invoices**,
dispatched in parallel to avoid the 1st-of-month bottleneck, and corrected without mutation.

## Billing philosophy

**Pure postpaid / in-arrears.** Everything (fixed + metered) is billed on the 1st for the month just
ended, including the partial first month. A team joining June 15 gets its first invoice July 1
covering June 15–30, then full months. **No charge at sign-up** — prepaid-for-fixed is rejected (it
needs pro-rata credit notes). Bad-debt risk is bounded by the entitlement cap and, for credits-only
teams, the wallet. The billing period is always the calendar month.

## The invoice is an ERPNext Sales Invoice

There is no custom `Invoice` and no async ERPNext sync (old issue #17 is deleted). Billing computes
line items in the compute core and **writes them straight into a Sales Invoice** in the same
process. The Sales Invoice is both the customer-facing invoice and the statutory record (it posts GL
on submit).

State maps to ERPNext's document lifecycle:

| Stage | ERPNext |
|-------|---------|
| Draft (28th pre-generation) | Sales Invoice `docstatus = 0` |
| Open (1st, issued) | `docstatus = 1` (submitted) → `status = Unpaid` |
| Paid | `status = Paid` (on confirmed Payment Entry) |
| Overdue | `status = Overdue` (past due date, unpaid) |
| Waived / Cancelled | Cancel + (credit note) — see Corrections |

Custom fields on Sales Invoice: `fc_subscription` (Link), `fc_team` (Link → Team),
`fc_invoice_type` (Select: billable / cost_report), `fc_period_start` / `fc_period_end` (Date),
`fc_credit_applied` (Long Int, minor units — informational), `fc_expected_collection` (Long Int,
minor units — the auto-charge target after withholding). Tax (GST/SEZ/TDS) uses ERPNext-native
mechanisms — see [tax.md](tax.md).

## Two-phase generation

**Phase 1 — Draft pre-generation (28th)** — heavy computation, off-peak.

```python
for sub in active_subscriptions:
    enqueue("central.billing.invoicing.generate_draft", subscription=sub)
```

Each job (**reconcile-then-draft** — sync is push-based, so data is usually already on Central):
1. If the team's last sync is stale, pull events + meter rollups; else use what was pushed.
2. Compute line items per segment using the **locked price** (keyed by `resource_id`) + metered
   line items, in the compute core (rate units → minor units).
3. Build a **draft Sales Invoice** (`docstatus = 0`) for the team's ERPNext Customer: one Sales
   Invoice Item per segment, `rate`/`amount` written as **minor→major decimal** (round-off
   disabled), tax via the Customer's Tax Category. No payment yet.

**Phase 2 — Open & collect (1st)** — one lightweight job per draft, parallel across workers.

```python
for inv in draft_sales_invoices(period_end=last_day_of_prev_month):
    enqueue("central.billing.invoicing.open_and_collect", sales_invoice=inv)
```

Each job: apply credits (`FOR UPDATE` on the wallet) → **submit** the Sales Invoice (`Draft → Unpaid`)
→ notify → if amount due > 0, create a **Payment Request** and charge via the gateway
([payments.md](payments.md)). The scheduler finishes in seconds; workers stagger collection naturally.

> **Cost-report (trial)** runs phase 1 only — the draft is kept/flagged `fc_invoice_type =
> cost_report` and **not submitted for collection**, so the subsidy is a true cost without a GL
> charge. See [subscriptions.md](subscriptions.md).

## Billing computation

Join the Agent event log (time windows) to Central price-locks (locked price). Day-granularity by
default. **All math in the compute core is integer/rate-unit** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)):

```
Agent log (resource R):  bundle-2vcpu Jun1→Jun10, bundle-4vcpu Jun10→Jun22, bundle-2vcpu Jun22→Jun30
Locked rates:            bundle-2vcpu ₹1000/mo, bundle-4vcpu ₹2000/mo
  bundle-2vcpu Jun1–9   =  9 × rate / 30 → round_half_up = 30000 paise (₹300.00)
  bundle-4vcpu Jun10–21 = 12 × rate / 30 → round_half_up = 80000 paise (₹800.00)
  bundle-2vcpu Jun22–30 =  9 × rate / 30 → round_half_up = 30000 paise (₹300.00)
```

Each computed minor-unit amount is written to a **Sales Invoice Item** as a major-unit decimal via
`money.from_minor`. Summing into the subtotal is exact integer addition in the core; the Sales
Invoice grand total (round-off disabled) equals the minor-unit total to the paisa, so two
recomputations are bit-identical (the reconciliation job depends on this).

Rules:
- **New plan wins the day** of a change.
- **`max(1, end − start)` floor** — a resource created *and* destroyed the same day is charged 1 day
  (closes the same-day-churn free faucet).
- **Granularity follows `fc_billing_interval`** (read from the locked resource). `daily`/`monthly`
  at launch; `hourly` wired but unused.

## Sales Invoice Item (ERPNext child)

| Field | Source |
|-------|--------|
| `item_code` | the bundle/add-on Item |
| `qty` | 1 for a bundle segment; metered quantity for an add-on |
| `rate` | locked rate as major-unit decimal (from rate units) |
| `amount` | `round_half_up(days × rate / units_in_period)` in minor units → major decimal |
| custom `fc_resource_id` | the price-lock key (provenance) |
| custom `fc_days` | whole units active (with max-1 floor) |

## Corrections

Sales Invoices are immutable once submitted; correct by ERPNext mechanism, never by mutation:

- **Pre-submit** (draft): edit or **cancel + reissue** (the 28th→1st buffer exists for this).
- **Post-submit, unpaid**: ERPNext **cancel** + reissue, or a **debit/credit note**.
- **Post-payment** (Paid):
  - **Full dispute** → **return Sales Invoice (credit note) + Payment Entry refund** to source; the
    original stays Paid (GST immutability preserved). See [payments.md](payments.md).
  - **Partial overcharge** → difference to the customer's **wallet** ([credits.md](credits.md)) via a
    credit ledger entry + a credit-note Sales Invoice in ERPNext, applied next cycle.

All corrections originate in Central (the money SOR) and are reflected in ERPNext **in process** —
there is no separate sync to fail. The credit-note ban is on *automatic proration* only; *admin
correction* credit notes for GST downward revisions are allowed.

## Forecast API

```
GET /api/method/central.billing.invoicing.get_forecast
    → { period_start, projected_total, credit_balance, shortfall, days_remaining, line_items[] }
```

Driven by the running-total meter rows ([metering.md](metering.md)) + fixed-resource accrual; all
projection math integer, divided to a display decimal at the edge.

## Notes

- ERPNext is the statutory SOR **and** runs in-process — failure modes that v1's async sync had
  (sync storms, rollback) are gone.
- The reconciliation job ("charged-but-never-webhooked") is the most important hardening task — see
  [payments.md](payments.md), now built on ERPNext **Payment Reconciliation**.
