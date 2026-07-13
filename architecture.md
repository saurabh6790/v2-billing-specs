# Architecture

## Purpose

Define the system shape for Frappe Cloud v2 billing: a single application (Central) that owns money, intent, and the recorded runtime it bills from, the seam to the cluster manager it provisions and enforces through, the data/control flow, and the cross-cutting decisions every other spec depends on.

> **Scope.** This document is the *system* shape — what Central is, where the seams are, what flows between them. The *code* shape of `central/billing` — who owns state, what a report reads, where a new engineer looks first — lives in [v2-architecture.md](v2-architecture.md). A fact belongs in exactly one of the two.

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** The earlier **two-application** design (Central + a per-cluster **Subscription Agent**) is retired. There is **no Agent**: Central provisions VMs by calling the cluster manager API, records usage events itself, and enforces dunning by calling the cluster manager. All Agent logic moves into `central/billing`. Sections below describe the agentless model; the Agent framing in older specs is superseded.

## Problem (what v1 got wrong)

Frappe Cloud v1 (Press) billing accumulated structural debt: prepaid credits as scalar fields (negative, unauditable balances); 10M+ daily usage rows (one per resource per day); no payment state machine ("Pay Now" on locked invoices); credit double-spend under concurrency; SQL injection; webhook signature checked *after* DB lookup (order-ID enumeration); thousands of synchronous ERPNext syncs; a single blocking 1st-of-month invoice loop. v2 is a redesign, not a patch.

## The single application

**Cloud Billing is a module inside Central** (`billing.frappe.cloud`) — the sole system of record for **money, the customer's monetary standing, and the recorded runtime billing computes from**. Owns gateway config, payment methods, plans + pricing, the customer's subscription *intent/contract*, the event log + price-locks, metered-usage rollups, invoices, credit ledger, trust tiers, tax, notifications, dashboards. The only component that talks to payment gateways — and the component that drives provisioning and enforcement by calling the **cluster manager** (Bench Manager) API.

The **cluster manager** is not a billing component: it is the external executor Central calls to create/change/stop/terminate VMs, and the source Central reads operational state from. It holds no financial logic, no pricing, no entitlement state.

## Source of truth

**Central is the source of truth for *intent + money + what ran*.**

- Central's `Subscription` records *intent* — the customer asked for plan X, validated a card, authorised a payment.
- When Central provisions (via the cluster manager), it records *reality* in the same step — the event log row + price-lock for that `resource_id`, and the operational state it reads back from the cluster manager.
- Billing computes from that recorded runtime joined to the locked prices. A request that never provisioned, or a stopped machine, bills accordingly. This kills the v1 "billed for things that weren't running" class of bug — without a second app, because the component that provisions is the component that records.

## Data & control flow

```
                 Central (Cloud Billing module)
        intent · money · event log + price-lock · metering · enforcement
              │  provision / change / stop / terminate   (calls)
              │  read operational state + metered usage   (reads)
              ▼
        Cluster Manager (Bench Manager) — per region
              │
         provisions / runs / meters the VMs
```

- **Plan catalog (Central):** plans + rates live in Central; the cluster manager needs no plan cache (Central resolves price at provision and locks it). See [plans-and-pricing.md](plans-and-pricing.md).
- **Provisioning (Central-driven):** Central checks the trust-tier cap, calls the cluster manager API to provision, and writes the event log + price-lock at that moment. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Usage collection (Central):** Central records the event log itself and records/reads metered-usage rollups from the cluster manager. No push/ack protocol, no Sync Log. See [metering.md](metering.md).
- **Enforcement (Central → cluster manager):** dunning suspension/termination is Central calling the cluster manager to stop/terminate. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md), [#14](issues/14-retry-dunning-suspension.md).
- **Payment & invoicing (Central):** see [invoicing.md](invoicing.md), [payments.md](payments.md).
- **ERPNext (async, one-way):** after payment, enqueue a Sales Invoice sync. Failure never blocks the customer invoice. ERPNext is the statutory accounting SOR.

## Cross-cutting decisions

- **Pure postpaid / in-arrears.** Everything billed on the 1st for the month just ended (fixed + metered), including the partial first month. No charge at sign-up. See [invoicing.md](invoicing.md).
- **No child tables for frequently-changing data.** Subscriptions, events, payment attempts, ledger entries, price-locks are top-level DocTypes linked by field. Child tables only for created-once/read-many (Invoice Line Items, Plan Resources).
- **Trust tier is the cap.** The provisioning cap is the team's trust tier, computed from billing history, enforced by Central synchronously at provision time (no signed token). See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Two orthogonal state axes.** Operational (`running/stopped/terminated`) vs account standing (`current/past_due/suspended`). Never one enum. Both are recorded by Central — the operational axis from the cluster manager's reported state. See [subscriptions.md](subscriptions.md).
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
billing dashboard UI is rebuilt by Central against the same APIs. There is **no
separate Subscription Agent app** — Central provisions, records, and enforces by
calling the cluster manager API ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).

## Notes

- Each team has one billing currency. Gateways are configured to handle multiple currencies via the `Payment Gateway Currency` child table; adding a new currency is a config change, not a code change. Multi-currency per invoice (one invoice spanning multiple currencies) remains a future consideration.
- Same gateway merchant accounts as v1 (simplifies migration). See [migration.md](migration.md).
- The standalone `Billing Admin`/`Billing User` roles were a pre-merge placeholder
  for Central identity; they are retired by [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md).
