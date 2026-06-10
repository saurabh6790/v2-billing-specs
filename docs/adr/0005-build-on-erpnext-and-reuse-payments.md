# Build the billing platform on ERPNext primitives and reuse frappe/payments

The first iteration of this spec (`/Users/frappe/workspace/billing-specs`) designed a billing
engine **from scratch**: bespoke `Invoice` + `Invoice Line Item`, `Payment Attempt`, `Credit
Ledger Entry`, `Tax Profile`, `Catalog Rate`, and a hand-written `GatewayAdapter` interface — and
it **explicitly decommissioned `frappe/payments`** (old issue #24). That design was built and
merged into the `central` app's `billing` module.

We are re-basing. The billing platform is hosted on a bench that already runs **ERPNext** and
**frappe/payments** (`/Users/frappe/workspace-2/cenral-bench`). ERPNext is a mature, statutory-grade
accounts system: Sales Invoice, Payment Entry, Payment Request, Pricing Rule, Item Price, Sales
Taxes & Charges templates, **Tax Withholding Category (native TDS)**, GST regional compliance,
Currency + exchange, and Subscription. Reimplementing all of that as custom DocTypes was the wrong
trade: it duplicates accounting logic the platform must keep correct, statutory, and auditable, and
it threw away `frappe/payments`' working gateway controllers (Stripe, Razorpay, PayPal, GoCardless,
Paytm, M-Pesa, Braintree, Paymob).

## Decision

**Build the billing platform on ERPNext accounting primitives, and reuse + extend `frappe/payments`
for the gateway layer. Keep custom only the domain ERPNext does not model.** This inverts old issue
#24 (which removed `frappe/payments`) and supersedes the custom money/accounting DocTypes.

### What becomes ERPNext (the accounting + catalog core)

| Concern | ERPNext primitive (replaces custom) |
|---------|--------------------------------------|
| The invoice | **Sales Invoice** + **Sales Invoice Item** (was `Invoice` + `Invoice Line Item`) |
| In-period draft | Sales Invoice `docstatus=0` (Draft) → submit on the 1st (was custom `Draft`→`Open`) |
| Payment record | **Payment Entry** + **Payment Request** (was `Payment Attempt`) |
| Reconciliation | **Payment Reconciliation** / **Payment Ledger Entry** (was custom matcher) |
| Catalog | **Item** (bundle / add-on) + **Item Price** (was `Plan`/`Add-on` + `Catalog Rate`) |
| Pricing rules / discounts | **Pricing Rule** (commitment discount, region overrides) |
| Output tax (GST/VAT/SEZ) | **Sales Taxes and Charges Template** + **Tax Category** + India GST regional |
| Withholding (TDS) | **Tax Withholding Category** (native; replaces the custom TDS seam) |
| Statutory ledger | ERPNext **GL Entry** — the Sales Invoice *is* the statutory record (old issue #17 async-sync is gone) |
| Currency / minor-unit factor | **Currency** DocType for display; the `money` module still owns the minor-unit table (see below) |

### What stays custom (the platform domain ERPNext has no model for)

These are Frappe-Cloud-specific and survive from the original design, now **linking to** ERPNext
records instead of custom ones:

- **Subscription (intent) + Subscription Change** — the two-axis state model (operational vs
  account standing). ERPNext Subscription is rejected: it assumes its own invoice cadence and has
  no notion of the Agent-observed runtime / intent split. See [subscriptions.md](../../subscriptions.md).
- **Price-lock** (`resource_id`-keyed grandfathering) — ERPNext Item Price has no per-provision
  rate freeze. See [plans-and-pricing.md](../../plans-and-pricing.md).
- **Trust Tier + Entitlement Token** — offline cluster enforcement; not an accounting concept.
- **Credit Wallet + Credit Ledger Entry** — kept as the append-only customer-facing wallet, but it
  **posts advances into ERPNext** (Payment Entry as advance / unallocated) so the GL stays whole.
  See [credits.md](../../credits.md).
- **Commitment** (team spend-floor + clawback) — the discount is expressed as a **Pricing Rule**;
  the floor rollup and clawback math stay custom. See [ADR 0001](0001-commitment-as-team-spend-floor.md).
- **Usage Meter / Usage Rollup** — edge-aggregated metering; feeds Sales Invoice Items. See
  [metering.md](../../metering.md).
- **Subscription Agent** — the per-cluster app, unchanged.

### Gateway layer — reuse + extend frappe/payments (reverses old #24)

`frappe/payments` already provides the `Payment Gateway` DocType, per-gateway settings controllers
(`Razorpay Settings`, `Stripe Settings`, `PayPal Settings`, …), `get_payment_gateway_controller`,
and `Payment Request` integration. We **reuse** that seam and **extend** it for what the platform
needs that the redirect-checkout controllers don't cover:

- **Off-session recurring charge** (mandate/saved-method charge with an idempotency key) — added as
  a thin capability on top of each gateway's settings controller, not a parallel adapter hierarchy.
- **Signature-first webhook spine** — verify the gateway HMAC as the first operation, before any DB
  access (closes the v1 order-ID enumeration bug). `frappe/payments` controllers don't all do this;
  we wrap their inbound handlers.
- **Mandate ceilings** (UPI Autopay cap = trust tier; ₹1L UPI limit) — platform policy layered over
  the Razorpay controller.
- **Validated, self-wiring setup** (`validate_credentials` on save, `register_webhook` auto-fills
  the secret) — kept from the original spec, implemented against the payments controllers.

The bespoke `GatewayAdapter` class hierarchy is dropped; its **method contract** (charge / refund /
verify_webhook / parse_event / mandate ops) survives as the **extension interface** we add to the
payments controllers. See [payments.md](../../payments.md).

## Considered Options

- **Keep the from-scratch engine, ERPNext as an async sink** (the original design + old #17) —
  rejected: duplicates statutory accounting the platform must keep correct anyway, and the
  built custom `Invoice`/`Payment Attempt`/`Tax Profile` re-derive Sales Invoice / Payment Entry /
  Sales Taxes badly (no GL, no native TDS, no GST regional).
- **Maximal ERPNext, including ERPNext Subscription + credit notes for the wallet** — rejected: the
  two-axis intent/runtime split and `resource_id` grandfathering fight ERPNext Subscription's model;
  forcing them costs more than the custom DocTypes save.
- **Hybrid: ERPNext core + custom platform domain (this ADR)** — accepted.

## Consequences

- **Old issue #17 (ERPNext async Sales Invoice sync) is deleted** — there is no second invoice to
  sync to; the Sales Invoice *is* the invoice. Billing reads/writes ERPNext directly, in-process.
- **Old issue #24 (decommission frappe/payments) is reversed** — payments is a dependency, not a
  thing to remove.
- **Old issues #34–#39 (integer-minor-units refactor) are re-scoped.** ERPNext money fields are
  `Currency` (float) by construction. [ADR 0003](0003-money-as-integer-minor-units.md) still governs
  the **compute core** (proration, metered `qty × rate`, credit ledger, the gateway charge integer),
  but the **Sales Invoice boundary** is where minor units convert to ERPNext's major-unit decimals —
  with ERPNext **round-off disabled** so the grand total equals the paise-precise charge (this is
  exactly what old #39 specified, now the canonical boundary rather than an async-sync edge). The
  `money` module and its curated ISO-4217 exponent table survive; ERPNext's `Currency` DocType is
  still not trusted for the minor-unit factor.
- **Tax simplifies to configuration.** GST + SEZ + TDS become ERPNext templates / Tax Withholding
  Categories instead of the custom three-mechanic `Tax Profile`; the *seam* idea (withholding
  reduces collected, not total) is now native ERPNext behaviour.
- **Catalog becomes Item + Item Price.** Bundles and add-ons are `Item`s; rates are `Item Price`s
  (per price list = currency/region). The bundle-vs-add-on `rate` vs `qty × rate` distinction maps
  to Item `is_stock_item=0` service items with/without quantity. Pricing Rule carries the commitment
  discount and region overrides. The price-lock stays custom on top.
- **Central Merge (#41–#45) is already done** — billing already lives in the `central` app. This
  re-base operates on that module; the IAM decision ([ADR 0004](0004-billing-as-central-module-capability-iam.md))
  is unchanged.
- **Migration is now app-internal**, not greenfield: the existing `central/billing` custom DocTypes
  must be migrated onto ERPNext primitives (or retired). See [migration.md](../../migration.md).

## Status

Accepted 2026-06-10. Re-bases the design in `/Users/frappe/workspace/billing-specs` onto ERPNext +
`frappe/payments`. Supersedes old issues #17 and #24; re-scopes #34–#39. Preserves
[ADR 0001](0001-commitment-as-team-spend-floor.md), [ADR 0002](0002-live-priced-storage-add-ons.md),
[ADR 0003](0003-money-as-integer-minor-units.md) (compute core), and
[ADR 0004](0004-billing-as-central-module-capability-iam.md).
