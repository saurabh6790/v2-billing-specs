# Frappe Cloud v2 — Billing & Payments Spec

Spec for the **Billing** layer of Central — the sole system of record for money on Frappe Cloud v2. Split into focused domain files (structure modelled on [central-spec](https://github.com/rmehta/central-spec)).

Two applications:
- **Cloud Billing** (Central, `billing.frappe.cloud`) — money, plans, pricing, invoices, credits, tax, dashboards, gateways.
- **Subscription Agent** (per regional cluster) — thin; authoritative for *what actually ran*.

## The one principle everything hangs off

**The Agent is the source of truth for *what ran*; Central owns *intent + money*.** A customer can *request* a plan (intent, on Central) but is *billed* for what the cluster actually ran (observed by the Agent). See [architecture.md](architecture.md).

## Files

| File | Domain |
|------|--------|
| [architecture.md](architecture.md) | Problem statement, two-app split, source-of-truth, data/control flow, cross-cutting decisions |
| [plans-and-pricing.md](plans-and-pricing.md) | Plans, resources, grandfathering (price-lock), plan distribution & price display |
| [provisioning-and-entitlements.md](provisioning-and-entitlements.md) | Regional provisioning, entitlement tokens, trust tiers, caps, enforcement |
| [subscriptions.md](subscriptions.md) | Subscription intent, two-axis state, trial/free, lifecycle |
| [metering.md](metering.md) | Usage Meter — counter/gauge rollups, forecast |
| [invoicing.md](invoicing.md) | Two-phase generation, day-granularity billing, line items, states, corrections |
| [payments.md](payments.md) | Gateway adapter, payment methods, settlement, mandates, webhooks, retry, reconciliation |
| [credits.md](credits.md) | Credit ledger, wallet, settlement waterfall |
| [tax.md](tax.md) | Three-mechanic tax model (output / zero-rating / withholding) |
| [security.md](security.md) | Security standard — trust boundaries, threat model, controls, audit checklist, safe-extension rules |
| [observability.md](observability.md) | Observability standard — two-plane metrics (runtime telemetry + auditable business metrics), catalogue per subsystem, alerting, coverage checklist |
| [subscription-agent.md](subscription-agent.md) | The regional Agent app — DocTypes, sync behaviour |
| [atlas-integration/](atlas-integration/README.md) | Atlas → Agent → Central workflow — lifecycle events, provision gate, enforcement, Atlas usage sources (the Agent is `press_billing_agent`, the Bench Manager is Atlas) |
| [dashboard.md](dashboard.md) | Admin & customer dashboards |
| [migration.md](migration.md) | v1 → v2 migration strategy |
| [testing.md](testing.md) | Testing strategy |
| [roadmap.md](roadmap.md) | Implementation phases & future considerations |
| [misc.md](misc.md) | Decision notes (e.g. why not `frappe/payments`) |

## Status

Draft. Derived from `design-doc-v2.md` (v2.1) and the 22 resolved decisions in `design-doc-v2-decisions.md`. Open items: multi-currency credit handling; the precise terminal-state model for the reconciliation job.

**Central Merge (in progress).** Billing folds into the **Central** app (`frappe/central`) as a `billing` module and adopts Central's capability IAM — see [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md) and issues [#41–#45](issues/README.md#central-merge-milestone-cm). "Cloud Billing (Central)" throughout these specs is a role played by the Central app, not a separate deployable. The billing dashboard UI is **not** migrated (Central rebuilds it against the same APIs); the Subscription Agent stays a separate per-cluster app. Open decision (Central-owned): a platform-staff `billing:operate` capability vs `System Manager` operator bypass for the cross-team admin surface.
