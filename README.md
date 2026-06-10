# Frappe Cloud v2 Billing — built on ERPNext + frappe/payments

The spec for Frappe Cloud v2 billing, **re-based to build on ERPNext** as the accounting engine and
**reuse `frappe/payments`** for gateways, rather than building the money/accounting logic from
scratch.

This repository is a re-base of `/Users/frappe/workspace/billing-specs`. The domain — how Frappe
Cloud prices resources, locks those prices, meters usage, and collects payment — is unchanged. What
changed is the **substrate**: invoices, payments, tax, and the catalog now sit on ERPNext primitives
(Sales Invoice, Payment Entry/Request, Sales Taxes, Tax Withholding, Item + Item Price, Pricing
Rule) instead of bespoke DocTypes, and the gateway layer extends `frappe/payments` controllers
instead of a hand-written adapter hierarchy.

## Start here

1. **[docs/adr/0005-build-on-erpnext-and-reuse-payments.md](docs/adr/0005-build-on-erpnext-and-reuse-payments.md)**
   — the re-base decision, what becomes ERPNext, what stays custom, what disappears.
2. **[erpnext-mapping.md](erpnext-mapping.md)** — the DocType/concept map (old → ERPNext) and the
   money boundary. The fastest way to see the whole re-base on one page.
3. **[architecture.md](architecture.md)** — the two-app split (Central + Agent), the ERPNext base,
   and the cross-cutting decisions.
4. **[CONTEXT.md](CONTEXT.md)** — the domain glossary (bundle, add-on, rate, price-lock, commitment,
   minor units), annotated with its ERPNext landing spot.

## Design docs

| Doc | Concern |
|-----|---------|
| [plans-and-pricing.md](plans-and-pricing.md) | Bundles/add-ons as **Item** + **Item Price**; price-lock grandfathering kept custom |
| [subscriptions.md](subscriptions.md) | Custom **Subscription intent** + two-axis state (not ERPNext Subscription) |
| [invoicing.md](invoicing.md) | Postpaid two-phase generation onto **Sales Invoice** |
| [payments.md](payments.md) | Reuse + extend **frappe/payments** controllers; signature-first webhooks; mandates |
| [credits.md](credits.md) | Custom **Credit Wallet** that posts advances into ERPNext |
| [metering.md](metering.md) | Edge-aggregated **Usage Meter** → Sales Invoice Items |
| [tax.md](tax.md) | GST/SEZ via **Sales Taxes**; TDS via native **Tax Withholding Category** |
| [subscription-agent.md](subscription-agent.md) | The per-cluster Agent app (unchanged) |
| [provisioning-and-entitlements.md](provisioning-and-entitlements.md) | Trust tier + signed entitlement token |
| [migration.md](migration.md) | Moving the already-built `central/billing` custom DocTypes onto ERPNext |
| [security.md](security.md) | Capability IAM ([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)) + hardening |
| [roadmap.md](roadmap.md) | Phasing |

## ADRs

- [0001](docs/adr/0001-commitment-as-team-spend-floor.md) — Commitment as a team spend-floor *(carried)*
- [0002](docs/adr/0002-live-priced-storage-add-ons.md) — Live-priced storage add-ons *(carried)*
- [0003](docs/adr/0003-money-as-integer-minor-units.md) — Money as integer minor units *(carried — governs the compute core; see the money boundary in [erpnext-mapping.md](erpnext-mapping.md))*
- [0004](docs/adr/0004-billing-as-central-module-capability-iam.md) — Billing as a Central module + capability IAM *(carried — already implemented)*
- [0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md) — **Build on ERPNext + reuse frappe/payments** *(the re-base)*

## Issues

[issues/README.md](issues/README.md) — the re-scoped, dependency-ordered slice list.

## Environment

- Bench: `/Users/frappe/workspace-2/cenral-bench` — runs `frappe`, `erpnext`, `payments`, `central`.
- Billing lives as the `billing` module inside the **`central`** app (`central/central/billing/`),
  per [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md). The re-base operates on
  that module.
- The per-cluster **Subscription Agent** (`press_billing_agent`) stays a separate app.
