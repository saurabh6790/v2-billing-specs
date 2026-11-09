# Module inventory

Line counts are Python only, excluding `tests/`. Snapshot `a95b491e`.

| Sub-package | Lines | Responsibility | Key files |
|---|---|---|---|
| `api/` | 6,011 | All whitelisted endpoints. `dashboard/` (customer), `admin/` (operator), `billing_api.py` (pilot facade) | `api/dashboard/invoices.py`, `account.py`, `methods.py`; `api/admin/corrections.py`, `teams.py` |
| `catalog/` | 3,685 | Plans, rates, composed configs, subscriptions, trust-tier limits, trials | `subscriptions.py` (1,300+ lines), `entitlements.py`, `pricing.py`, `composition.py` |
| `revenue/` | 4,289 | Metering rollups, invoice generation and lifecycle, dunning, credits, tax, rerating | `invoicing/generate.py`, `invoicing/lines.py`, `invoicing/lifecycle.py`, `invoicing/run.py`, `dunning.py`, `credits.py`, `metering.py` |
| `payments/` | 5,617 | Charges, collection on payment date, mandates and pre-debit, refunds, disputes, webhooks, reconciliation, collection mode | `charges.py`, `collection.py`, `emandate.py`, `corrections.py`, `webhooks.py`, `reconciliation.py` |
| `gateways/` | 2,362 | One adapter per provider behind `GatewayAdapter` | `base.py`, `stripe_adapter.py`, `razorpay_adapter.py`, `paypal_adapter.py`, `registry.py` |
| `ingester/` | 1,402 | ERPNext: customers, Sales Invoices, advances, GST status | `erpnext_sync.py`, `customer.py`, `advance.py`, `connection.py` |
| `platform/` | 2,031 | Money-record guard, operator alerts, invariant audit, job helpers, readiness checks | `records.py`, `alerts.py`, `invariants.py`, `jobs.py` |
| `projection/` | 3,098 | Read-only simulator: team and cohort projections, scenarios, cassette replay | `engine.py`, `batch.py`, `cassette.py` |
| `doctype/` | 3,425 | 52 DocTypes and their controllers | see [../02-domain-model/data-dictionary.md](../02-domain-model/data-dictionary.md) |
| `report/` | 6,823 | 41 Query/Script reports | listed in [../08-operations/support-operations-review.md](../08-operations/support-operations-review.md) |
| `demo/` | 1,944 | Demo seed data | not shipped behaviour |
| top level | — | `authz.py` (capability checks), `states.py` (transition authority), `settings.py`, `india_gst.py`, `regions.py` | |

## Customer UI (`dashboard/src`)

| Area | Files | Notes |
|---|---|---|
| Billing pages | `pages/billing/` (3) | Overview, Invoices, Payments |
| Billing components | `components/billing/` (37), `AddMethodDialog.vue`, `TopupDialog.vue` | One component (`MeteredServicesCard.vue`) is not used |
| Billing composables | `composables/useBilling*.ts`, `usePay*.ts`, `useTopup.ts`, `useSpendingLimits.ts`, `usePayingFor.ts`, `useProjects.ts` | Data loading and actions |
| Helpers | `lib/feedback.ts` (errors, toasts), `lib/dunning.ts`, `lib/status.ts`, `lib/format.ts`, `lib/gateway.ts` | |

See [screen-map.md](screen-map.md) for which screen uses what.

## Observations

| # | Observation | Evidence |
|---|---|---|
| 1 | Layering is explicit and documented: only `api/**` is whitelisted for customers, domain functions take a team argument and do not check permissions themselves. | `central/billing/ARCHITECTURE.md` §1; `authz.py:49-77` |
| 2 | Leftover from a retired design: `Entitlement Token` DocType and Ed25519 signing remain. `catalog/entitlements.py:193` `issue_token` has no caller outside tests and demo. ADR 0006 retired the token. | `doctype/entitlement_token/`, `catalog/entitlements.py:13`, `catalog/signing.py` |
| 3 | `catalog/subscriptions.py` carries subscription CRUD, composed-config validation, limit checks, pause/resume, standing changes and backfill in one file. | file length and `def` list |
| 4 | `report/` (6,823 lines) is larger than `revenue/` or `payments/`. | line counts above |
