# Architecture

## Purpose

Define the system shape for Frappe Cloud v2 billing **on an ERPNext base**: a two-application split,
the source-of-truth boundary between them, which concerns ride ERPNext primitives vs stay custom,
and the cross-cutting decisions every other spec depends on.

## Problem (what v1 got wrong)

Frappe Cloud v1 (Press) billing accumulated structural debt: prepaid credits as scalar fields
(negative, unauditable balances); 10M+ daily usage rows; no payment state machine; credit
double-spend under concurrency; SQL injection; webhook signature checked *after* DB lookup
(order-ID enumeration); thousands of synchronous ERPNext syncs; a single blocking 1st-of-month
invoice loop. v2 is a redesign.

The **first v2 design** over-corrected: it rebuilt the accounting layer (invoice, payment, tax,
catalog) as bespoke DocTypes and removed `frappe/payments`. That duplicated statutory accounting
ERPNext already does correctly and discarded working gateway controllers. This re-base
([ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md)) puts the money/accounting core
back on **ERPNext** and the gateways back on **`frappe/payments`**, keeping custom only the
platform domain ERPNext has no model for.

## The two applications

**Central** (`frappe/central`, `billing.frappe.cloud`) — sole system of record for **money and the
customer's monetary standing**. Billing is a **module inside the Central app**
([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)). It owns gateway config
(via `frappe/payments`), payment methods, the catalog (ERPNext Items + Item Prices), the customer's
subscription *intent/contract*, invoices (**ERPNext Sales Invoices**), the credit wallet, trust
tiers, entitlement tokens, tax (**ERPNext Sales Taxes + Tax Withholding**), notifications,
dashboards. The only component that talks to payment gateways. **ERPNext runs in the same bench**,
so billing reads/writes Sales Invoices and Payment Entries **in process** — there is no async sync.

**Subscription Agent** (per regional cluster) — deliberately thin, **authoritative for what actually
ran**. Immutable event log (subscribed/changed/cancelled, with `resource_id` and `shown_rate`),
metered-usage rollups, local enforcement of Central-issued entitlement tokens, push to Central. No
financial logic, no gateway calls, no invoice computation. Unchanged by the re-base.

## Source-of-truth split

**The Agent is the source of truth for *what ran*; Central (on ERPNext) for *intent + money*.**

- Central's custom `Subscription` records *intent* — the customer asked for plan X, validated a
  card, authorised a payment intent.
- The Agent observes *reality* — what physically ran, on which `resource_id`, for how long.
- Billing computes from observed runtime joined to Central's locked prices, then **writes the result
  as an ERPNext Sales Invoice**. A request that never provisioned, or a stopped machine, bills
  accordingly. This kills the v1 "billed for things that weren't running" bug class.

## What rides ERPNext vs what stays custom

```
            ┌──────────────────── Central app ────────────────────┐
            │  billing module (custom domain)   │  ERPNext (core)  │
            │                                    │                  │
  intent ── │  Subscription · Subscription Change│                  │
  grandfath.│  Price-lock (resource_id)          │                  │
  entitle.  │  Trust Tier · Entitlement Token    │                  │
  wallet ── │  Credit Wallet · Credit Ledger ────┼─▶ Payment Entry  │
  metering  │  Usage Meter · Usage Rollup ───────┼─▶ Sales Invoice  │
  catalog   │  (price-lock over) ────────────────┼─▶ Item·Item Price│
  commit.   │  Commitment (floor/clawback) ──────┼─▶ Pricing Rule   │
  tax       │  (policy) ─────────────────────────┼─▶ Sales Taxes ·  │
            │                                    │   Tax Withholding│
  gateways  │  Payment Method · webhook spine ───┼─▶ frappe/payments│
            └────────────────────────────────────┴──────────────────┘
```

See [erpnext-mapping.md](erpnext-mapping.md) for the full table.

## Data & control flow

```
        Central (Cloud Billing on ERPNext)
          │  plan push          ▲  usage push (events + meter rollups)
          │  entitlement token  │  (on-demand primary + daily catch-up)
          ▼                     │
   Cluster — Mumbai        Cluster — Singapore
     Subscription Agent       Subscription Agent
          │
     Bench Manager (provisions resources)
```

- **Catalog distribution (Central → Agent):** Central pushes Item identity + composition + a
  *display* price (from Item Price) to each Agent's local cache. See [plans-and-pricing.md](plans-and-pricing.md).
- **Provisioning (regional, Central-independent):** at the cluster, authorised against a signed
  entitlement token verified locally. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Usage collection (Agent → Central):** push-primary. Event log + metered rollups. See
  [subscription-agent.md](subscription-agent.md), [metering.md](metering.md).
- **Invoicing & payment (Central only):** compute → **Sales Invoice** → **Payment Request** →
  gateway via `frappe/payments` → **Payment Entry** on webhook confirmation. See
  [invoicing.md](invoicing.md), [payments.md](payments.md).
- **Statutory accounting:** the **Sales Invoice posts GL Entries in process** — ERPNext *is* the
  statutory SOR. No async push, no second invoice (old issue #17 deleted).

## Cross-cutting decisions

- **Pure postpaid / in-arrears.** Everything billed on the 1st for the month just ended, including
  the partial first month. No charge at sign-up. See [invoicing.md](invoicing.md).
- **No child tables for frequently-changing data.** Subscriptions, events, payment records, ledger
  entries, price-locks are top-level DocTypes linked by field. (Sales Invoice Item is ERPNext's
  child — created-once/read-many, which is fine.)
- **Trust tier is the cap.** The entitlement cap is the team's trust tier, computed from billing
  history. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Two orthogonal state axes.** Operational (`running/stopped/terminated`, Agent) vs account
  standing (`current/past_due/suspended`, Central). Never one enum. The Sales Invoice `status`
  (Unpaid/Paid/Overdue) is a third, payment-document axis — not conflated with either.
- **Webhook-first, signature-first.** Verify the gateway HMAC as the first operation, before any DB
  access — even though `frappe/payments` controllers don't all do this; we wrap them. See [payments.md](payments.md).
- **Reuse + extend frappe/payments.** Core billing logic talks to gateways only through the payments
  `Payment Gateway` controller seam, extended with off-session charge / webhook / mandate methods.
  See [ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md), [payments.md](payments.md).
- **Idempotency everywhere.** Gateway calls carry idempotency keys; webhooks dedupe on
  `gateway_event_id`.
- **Append-only ledgers.** The credit ledger and price-lock are append-only; balances computed from
  sums, never stored as scalars. The credit ledger posts advances into ERPNext so the GL is whole.
- **Money: integer minor units in the compute core, major-unit decimal at the Sales Invoice
  boundary.** [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) governs proration, metered
  `qty × rate`, the credit ledger, and the gateway charge integer; the Sales Invoice writes
  major-unit decimals with **ERPNext round-off disabled** so the grand total equals the paise-precise
  charge. See the money boundary in [erpnext-mapping.md](erpnext-mapping.md).

## Packaging

Billing is the **`billing` module inside the Central app** (already merged,
[ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)), using Central's team-scoped
**capability IAM** (`central.iam.can`). The customer-facing **team** is the Central `Team` DocType;
it maps to an **ERPNext Customer** for the accounting side. The **Subscription Agent** remains its
own per-cluster app.

## Notes

- Single billing currency per team at launch (multi-currency per invoice is future). ERPNext
  Customer carries the team's billing currency / price list.
- Same gateway merchant accounts as v1 (simplifies migration), now configured as `frappe/payments`
  gateway settings. See [migration.md](migration.md).
