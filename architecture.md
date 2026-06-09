# Architecture

## Purpose

Define the system shape for Frappe Cloud v2 billing: a two-application split, the source-of-truth boundary between them, the data/control flow, and the cross-cutting decisions every other spec depends on.

## Problem (what v1 got wrong)

Frappe Cloud v1 (Press) billing accumulated structural debt: prepaid credits as scalar fields (negative, unauditable balances); 10M+ daily usage rows (one per resource per day); no payment state machine ("Pay Now" on locked invoices); credit double-spend under concurrency; SQL injection; webhook signature checked *after* DB lookup (order-ID enumeration); thousands of synchronous ERPNext syncs; a single blocking 1st-of-month invoice loop. v2 is a redesign, not a patch.

## The two applications

**Cloud Billing** (Central — `billing.frappe.cloud`) — sole system of record for **money and the customer's monetary standing**. Owns gateway config, payment methods, plans + pricing, the customer's subscription *intent/contract*, invoices, credit ledger, trust tiers, entitlement tokens, tax, notifications, dashboards. The only component that talks to payment gateways.

**Subscription Agent** (per regional cluster) — deliberately thin, but **authoritative for what actually ran**. Records an immutable event log (subscribed/changed/cancelled, with `resource_id` and `shown_rate`), records metered-usage rollups, enforces Central-issued entitlement tokens locally, and syncs to Central. No financial logic, no gateway calls, no invoice computation — it carries numbers and applies directives; Central decides their meaning.

## Source-of-truth split

**The Agent is the source of truth for *what ran*; Central for *intent + money*.**

- Central's `Subscription` records *intent* — the customer asked for plan X, validated a card, authorised a payment intent.
- The Agent observes *reality* — what physically ran, on which `resource_id`, for how long.
- Billing computes from observed runtime joined to Central's locked prices. A request that never provisioned, or a stopped machine, bills accordingly. This kills the v1 "billed for things that weren't running" class of bug.

## Data & control flow

```
        Central (Cloud Billing)
          │  plan push          ▲  usage push (events + meter rollups)
          │  entitlement token  │  (on-demand primary + daily catch-up)
          ▼                     │
   Cluster — Mumbai        Cluster — Singapore
     Subscription Agent       Subscription Agent
     (4 DocTypes)             (4 DocTypes)
          │
     Bench Manager (provisions resources)
```

- **Plan distribution (Central → Agent):** Central pushes plan definitions + a *display* price to each Agent's local Plan Cache. See [plans-and-pricing.md](plans-and-pricing.md).
- **Provisioning (regional, Central-independent):** happens at the cluster, authorised against a signed entitlement token verified locally. Central's subscription API records intent only. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Usage collection (Agent → Central):** push-primary (on-demand + daily catch-up). Event log + metered rollups. See [subscription-agent.md](subscription-agent.md), [metering.md](metering.md).
- **Payment & invoicing (Central only):** see [invoicing.md](invoicing.md), [payments.md](payments.md).
- **ERPNext (async, one-way):** after payment, enqueue a Sales Invoice sync. Failure never blocks the customer invoice. ERPNext is the statutory accounting SOR.

## Cross-cutting decisions

- **Pure postpaid / in-arrears.** Everything billed on the 1st for the month just ended (fixed + metered), including the partial first month. No charge at sign-up. See [invoicing.md](invoicing.md).
- **No child tables for frequently-changing data.** Subscriptions, events, payment attempts, ledger entries, price-locks are top-level DocTypes linked by field. Child tables only for created-once/read-many (Invoice Line Items, Plan Resources).
- **Trust tier is the cap.** The entitlement cap is the team's trust tier, computed from billing history. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Two orthogonal state axes.** Operational (`running/stopped/terminated`, Agent) vs account standing (`current/past_due/suspended`, Central). Never one enum. See [subscriptions.md](subscriptions.md).
- **Webhook-first, signature-first.** Verify the gateway HMAC as the first operation, before any DB access. See [payments.md](payments.md).
- **Adapter pattern for gateways.** Core logic never imports gateway code. See [payments.md](payments.md).
- **Idempotency everywhere.** Gateway calls carry idempotency keys derived from `payment_attempt.name`; webhooks dedupe on `gateway_event_id`.
- **Append-only ledgers.** Credit ledger and price-lock are append-only; balances computed from sums, never stored as scalars.

## Packaging — Billing is a module of the Central app

"Cloud Billing (Central)" above is a **role**, not a separate deployable. Billing
ships as a **`billing` module inside the Central app** (`frappe/central`), and
uses Central's team-scoped **capability IAM** (`Team` → `Team Role` →
`Capability`, via `central.iam.can`) rather than billing-owned roles — see
[ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md) and issues
[#41–#45](issues/README.md#central-merge-milestone-cm). The customer-facing
**`team`** everywhere in billing is the Central `Team` DocType. Only the
**backend** (data model + business logic + API) is part of this module; the
billing dashboard UI is rebuilt by Central against the same APIs. The
**Subscription Agent** remains its own per-cluster app — the source-of-truth split
is unchanged.

## Notes

- Single billing currency per team at launch (multi-currency per invoice is future).
- Same gateway merchant accounts as v1 (simplifies migration). See [migration.md](migration.md).
- The standalone `Billing Admin`/`Billing User` roles were a pre-merge placeholder
  for Central identity; they are retired by [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md).
