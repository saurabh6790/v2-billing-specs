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

Each job (**draft from Central's own records** — Central recorded the change rows + metered rollups as it provisioned/metered, so there is nothing to pull; [ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)):
1. Read the team's `Subscription Change` ledger + meter rollups (already in Central; refresh the current period's metered figures from the cluster manager if stale).
2. Compute line items per segment using the **locked price snapshot carried on each change row** + metered line items.
3. Apply tax ([tax.md](tax.md)).
4. Create a `Draft` invoice — no payment yet.

**Phase 2 — Open & collect (1st)** — one lightweight job per draft, parallel across workers.

```python
for inv in drafts(period_end=last_day_of_prev_month):
    enqueue("cloud_billing.billing.open_and_collect", invoice=inv)
```

Each job: apply credits (`FOR UPDATE` lock) → `Draft → Open` → notify → if amount due > 0, charge via gateway. The scheduler finishes in seconds; workers stagger collection naturally (respecting gateway rate limits).

## Billing computation

Walk the subscription's `Subscription Change` ledger ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)): each rate-bearing row (`Created` / `Plan Changed`) opens a segment at its **own `locked_rate` snapshot**, running until the next change; `Cancelled` (and any row with no rate — stop/start, payment-method, standing changes) is a boundary, not a billable segment. The time window and the locked price are the **same row**, so there is no join. Day-granularity by default.

```
Change ledger (resource R):  Created plan-2vcpu @₹1000  Jun1
                             Plan Changed plan-4vcpu @₹2000  Jun10   (resize → re-resolved)
                             Plan Changed plan-2vcpu @₹1000  Jun22
Each row carries its own locked_rate snapshot (display ₹/mo).
Result (new plan wins the day of change), all math in float major units:
  plan-2vcpu Jun1–9   =  9 × ₹1000 / 30 → round(·, 2) = ₹300.00
  plan-4vcpu Jun10–21 = 12 × ₹2000 / 30 → round(·, 2) = ₹800.00
  plan-2vcpu Jun22–30 =  9 × ₹1000 / 30 → round(·, 2) = ₹300.00
```

> Rate is a `Currency` float in **major units**, quantity/days are exact, and the divide rounds
> to 2 decimals once per line item; summing line items into the subtotal is float addition. Two
> independent recomputations of an invoice agree (the reconciliation job depends on this).
>
> *(Deprecated — [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)'s integer minor-units
> model, where rate was held in "rate units" (minor × 10⁶) and rounded half-away-from-zero to the
> minor unit, was never implemented. Money is stored as float `Currency` in major units throughout;
> the only minor-unit conversion is at a gateway boundary that requires it.)*

Rules:
- **New plan wins the day** of a change.
- **`max(1, end − start)` floor** — a resource created *and* destroyed the same day is charged 1 day, not zero (closes the same-day-churn free faucet).
- **Granularity follows `billing_interval`.** The engine is generic over the unit (read from the locked segment). `daily`/`monthly` exercised at launch; `hourly` wired but unused (lights up for GPU/burst tiers later, no rewrite).

## Data Model

**Invoice** (stable)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | INV-YYYY-MM-NNNNN |
| team / subscription | Link | |
| invoice_type | Select | billable / cost_report (free/trial) |
| period_start / period_end | Date | |
| status | Select | Draft / Open / Paid / Overdue / Waived / Cancelled |
| subtotal | Currency | Float, **major units**. Σ of already-rounded line-item amounts. (Not integer minor units — [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) deprecated.) |
| (tax block) | | See [tax.md](tax.md) — output tax, zero-rating, withholding |
| credit_applied | Currency | Float, major units |
| total | Currency | Float, major units — subtotal + output_tax |
| expected_collection | Currency | Float, major units — total − tds_amount (auto-charge target) |
| amount_paid | Currency | Float, major units — `paid` when amount_paid ≥ expected_collection |
| due_date | Date | |
| erpnext_invoice / pdf_url | Data | |

**Invoice Line Item** (child table — generated once, never updated)

| Field | Type | Notes |
|-------|------|-------|
| subscription_resource | Link | The provisioned resource (`asset_id`) the segment billed |
| resource_type / unit / quantity | | |
| rate | Currency | Float, **major units** per month — the `Subscription Change` row's `locked_rate` snapshot, copied at generation |
| days | Int | Whole units active (with max-1 floor) |
| amount | Currency | Float, major units — `round(days × rate / units_in_period, 2)`; rounded **once, here** |

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
