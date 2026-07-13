# Frappe Cloud v2 — Billing & Payments Spec

Spec for the **Billing** layer of Central — the sole system of record for money on Frappe Cloud v2. Split into focused domain files (structure modelled on [central-spec](https://github.com/rmehta/central-spec)).

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** The earlier two-app design (Central + a per-cluster **Subscription Agent**) is retired. There is **one application**: Central provisions VMs by calling the **cluster manager** API, records usage events itself, and enforces dunning by calling the cluster manager. All Agent logic now lives in `central/billing`.

**Cloud Billing** is a `billing` module inside Central (`billing.frappe.cloud`) — money, plans, pricing, the event log + price-locks, metering, invoices, credits, tax, dashboards, gateways — and the component that drives provisioning + enforcement through the cluster manager.

## The one principle everything hangs off

**Central is the source of truth for *intent + money + what ran*.** A customer *requests* a plan (intent); Central provisions it via the cluster manager and, in the same step, records the runtime it is *billed* for. The component that provisions is the component that records — so billing never charges for something that never ran. See [architecture.md](architecture.md).

## Files

| File | Domain |
|------|--------|
| [architecture.md](architecture.md) | Problem statement, single-app shape, cluster-manager seam, source-of-truth, data/control flow, cross-cutting decisions |
| [v2-architecture.md](v2-architecture.md) | Code shape of `central/billing`: the transition authority + Billing Event spine ([ADR 0016](docs/adr/0016-billing-event-stream-and-single-transition-authority.md)), why report-first is a write-path property, and the five moves that make it readable |
| [plans-and-pricing.md](plans-and-pricing.md) | Plans, resources, grandfathering (price-lock), plan distribution & price display |
| [bundle-and-resource-picker.md](bundle-and-resource-picker.md) | Plain-language architecture tour: curated bundles vs the design-your-own resource picker, the per-resource rate card, and how a config reaches the bill ([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)) |
| [provisioning-and-entitlements.md](provisioning-and-entitlements.md) | Central-driven provisioning (cluster-manager API), trust tiers, caps, enforcement |
| [subscriptions.md](subscriptions.md) | Subscription intent, two-axis state, trial/free, lifecycle |
| [metering.md](metering.md) | Usage Meter — counter/gauge rollups, forecast |
| [invoicing.md](invoicing.md) | Two-phase generation, day-granularity billing, line items, states, corrections |
| [payments.md](payments.md) | Gateway adapter, payment methods, settlement, mandates, webhooks, retry, reconciliation |
| [credits.md](credits.md) | Credit ledger, wallet, settlement waterfall |
| [commitment.md](commitment.md) | Commitment — team spend-floor, discount, clawback |
| [tax.md](tax.md) | Three-mechanic tax model (output / zero-rating / withholding) |
| [security.md](security.md) | Security standard — trust boundaries, threat model, controls, audit checklist, safe-extension rules |
| [observability.md](observability.md) | Observability standard — two-plane metrics (runtime telemetry + auditable business metrics), catalogue per subsystem, alerting, coverage checklist |
| [subscription-agent.md](subscription-agent.md) | **RETIRED** ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) — tombstone mapping the old Agent responsibilities to their new homes in `central/billing` |
| [atlas-integration/](atlas-integration/README.md) | Atlas (Bench Manager / cluster manager) ↔ Central workflow — lifecycle events, provision gate, enforcement, usage sources. Central calls the cluster manager directly; the former Agent middle-tier is retired ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) |
| [dashboard.md](dashboard.md) | Admin & customer dashboards |
| [migration.md](migration.md) | v1 → v2 migration strategy |
| [testing.md](testing.md) | Testing strategy |
| [roadmap.md](roadmap.md) | Implementation phases & future considerations |
| [terminology.md](terminology.md) | Plain-English definitions for jargon used across the specs |
| [misc.md](misc.md) | Decision notes (e.g. why not `frappe/payments`) |

## Status

Draft. Derived from `design-doc-v2.md` (v2.1) and the 22 resolved decisions in `design-doc-v2-decisions.md`. Open items: multi-currency credit handling; the precise terminal-state model for the reconciliation job.

**Central Merge (done) + Agentless (ADR 0006).** Billing is a `billing` module inside the **Central** app (`frappe/central`) and uses Central's capability IAM — see [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md) and issues [#41–#45](issues/README.md#central-merge-milestone-cm). "Cloud Billing (Central)" throughout these specs is a role played by the Central app, not a separate deployable. The billing dashboard UI is rebuilt by Central against the same APIs. There is **no Subscription Agent** ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) — Central provisions, records usage, and enforces via the cluster manager API. Open decision (Central-owned): a platform-staff `billing:operate` capability vs `System Manager` operator bypass for the cross-team admin surface.
