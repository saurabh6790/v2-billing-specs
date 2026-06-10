# Migration

## Purpose

Move the **already-built** `central/billing` custom DocTypes onto ERPNext primitives. Unlike the
original spec (greenfield), this is an **app-internal migration**: billing already lives in the
`central` app ([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)) with custom
`Invoice`, `Payment Attempt`, `Tax Profile`, `Catalog Rate`, `Plan`, `Add-on`, `Payment Gateway`,
`Refund` DocTypes. The re-base ([ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md))
retires those in favour of Sales Invoice / Payment Entry / Item / Item Price / Sales Taxes /
`frappe/payments`.

## Principles

- **Convert stored values, never recompute.** Settled (`Paid`) records carry the exact amounts that
  were charged and reported to the gateway and (under the old design) to ERPNext. Backfilling onto
  ERPNext copies the **stored** amount (minor→major decimal, round-off disabled) — never re-derives
  it from rates, which could shift a historical total by a paisa and desync the gateway receipt.
  This is [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)'s migration rule, now applied at
  the custom-Invoice → Sales-Invoice boundary.
- **Idempotent, per-team, reversible.** Migrate one team at a time behind a flag; each step is
  re-runnable; keep the old DocTypes read-only until cutover is proven per team.
- **Verification pass.** For every migrated record assert `old_total == new Sales Invoice grand_total`
  (to the paisa) and `old_paid == Σ Payment Entries` before retiring the old row.

## Order of operations

1. **Catalog → Item + Item Price.** For each `Plan`/`Add-on`, create a service `Item` (carry
   `fc_billing_type`, `fc_resource_type`, `fc_pricing_mode`, `fc_includes`). For each `Catalog Rate`,
   create an `Item Price` in the currency's price list (+ Pricing Rule for region overrides). The
   **Price-lock** DocType stays as-is (it already keys on `resource_id`; just re-point `plan` →
   `item`).
2. **Teams → Customers.** Ensure every billing `Team` has a linked ERPNext **Customer** with the
   right currency, default price list, **Tax Category** (GST state / SEZ / export), and address.
3. **Gateways → frappe/payments.** Recreate each `Payment Gateway` as a `frappe/payments`
   `Payment Gateway` + `<Gateway> Settings` (same merchant accounts as v1), run the
   validate-credentials + register-webhook setup ([payments.md](payments.md)). Re-point
   `Payment Method.gateway`.
4. **Open invoices → Sales Invoices.** Re-issue *unpaid* custom `Invoice`s as draft→submitted Sales
   Invoices (these can be recomputed since unsettled). **Paid** invoices are migrated by **copying
   the stored total** into a submitted+paid Sales Invoice with matching Payment Entries (never
   recomputed).
5. **Payments → Payment Entries.** Map terminal `Payment Attempt`s to Payment Entries against the new
   Sales Invoices; `Refund`s to return-invoice + Payment Entry pairs.
6. **Tax Profiles → Tax Categories.** Replace each custom `Tax Profile` with the Customer's Tax
   Category + Tax Withholding Category; drop the custom tax block.
7. **Credit ledger** stays (custom), but **mirror balances into ERPNext** as advance Payment Entries
   so the GL opening matches each wallet ([credits.md](credits.md)).
8. **Retire** the custom `Invoice`, `Invoice Line Item`, `Payment Attempt`, `Tax Profile`,
   `Catalog Rate`, `Plan`, `Add-on`, `Payment Gateway`, `Refund` DocTypes after the per-team
   verification passes.

## What does NOT migrate (stays custom)

`Subscription`, `Subscription Change`, `Price Lock`, `Trust Tier(/Level)`, `Entitlement Token`,
`Credit Ledger Entry`, `Credit Wallet`, `Commitment`, `Usage Meter`, `Usage Rollup`, `Webhook Event`,
`Billing Notification Log`, `Notification Preference`. These have no ERPNext equivalent (see
[erpnext-mapping.md](erpnext-mapping.md)); only their **link targets** change (e.g. `→ Item`,
`→ Customer`, `→ Sales Invoice`).

## Gradual rollout (HITL)

Per-team, behind a feature flag, with sign-off — same posture as the original migration tooling
slice. The Agent app is untouched (it carries no money). ERPNext runs in-process, so there is no
async-sync backfill to manage.
