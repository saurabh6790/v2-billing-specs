# Module inventory

Snapshot central `a95b491e` (9 Nov 2026). Counts come from parsing every `.py` file
under `central/billing/` excluding `tests/` (AST, read-only). "Entry points" are
facts from decorators and `central/hooks.py` registrations. "Docstrings say" quotes
the authors' own module docstrings: it is **documentation, not verified behaviour**.
Behaviour is not inferred from file or function names.

## Billing sub-packages

| Module | Files | Lines | Top-level functions | Classes | Entry points hosted (fact) |
|---|---|---|---|---|---|
| `api/` | 26 | 6,011 | 241 | 0 | 131 whitelisted functions: 57 in `api/dashboard/`, 49 in `api/admin/`, 25 in `api/billing_api.py` (all guest) — see [api-inventory.md](api-inventory.md) |
| `payments/` | 18 | 5,617 | 264 | 4 | 3 guest webhook endpoints (`webhooks.py:29,38,48`); 8 scheduled jobs; 5 enqueue calls |
| `revenue/` | 13 | 4,289 | 183 | 2 | 6 scheduled jobs; 5 enqueue calls |
| `catalog/` | 18 | 3,685 | 165 | 0 | 1 scheduled job; 3 `after_install`/`after_migrate`/`before_tests` hooks (`taxonomy_setup.ensure_catalog_masters`) |
| `doctype/` | 105 | 3,425 | 48 | 54 | 51 DocTypes; 11 whitelisted Document methods; controller hooks on 20 DocTypes |
| `projection/` | 17 | 3,098 | 103 | 7 | 1 scheduled job (`batch.prune`); 2 enqueue calls |
| `report/` | 87 | 6,823 | 285 | 7 | 41 report folders |
| `gateways/` | 9 | 2,362 | 41 | 14 | `setup.ensure_gateway_records` on install/migrate/tests |
| `platform/` | 11 | 2,031 | 84 | 1 | 2 scheduled jobs; `records.refuse_manual_edit/delete` doc events on 9 DocTypes; `constraints.ensure_constraints` on install/migrate/tests |
| `ingester/` | 9 | 1,402 | 92 | 2 | 3 scheduled jobs; 8 enqueue calls |
| `demo/` | 3 | 1,944 | 60 | 0 | `demo_scenarios.seed` run by the e2e workflow (`.github/workflows/e2e.yml:122`) |
| `page/` | 2 | 0 | 0 | 0 | Desk page `billing_simulator` (JS) |
| top level | 7 | 811 | 46 | 4 | `authz.py` (7 functions), `states.py` (transitions), `settings.py` (28 functions; 2 install hooks), `india_gst.py`, `regions.py`, `navigation.py` (install hook) |

Non-Python parts: `workspace/billing/billing.json` (Desk workspace),
`number_card/` (4), `custom_html_block/` (1), `insights_workbook/`, report JSON/JS,
DocType JSON/JS.

## What each module's own docstrings say

Quoted from the first docstring line of each file. Not verified in this phase.

| Module | Files and their docstrings |
|---|---|
| `payments/` | `charges.py` "Charge an open invoice and settle it on the webhook"; `collection.py` "Settlement fallback: primary -> backup payment methods"; `collection_mode.py` "Collection mode + the ₹15,000 'Action Required' threshold"; `corrections.py` "Cancel a paid invoice, and give each part of its payment back the way it came"; `decline.py` "Which declines are final"; `disputes.py` "Card disputes (chargebacks) reported by the gateway's webhooks"; `emandate.py` "Off-session collection with the RBI pre-debit notice"; `instruments.py` "What the customer picks, on which surface, and which rail it lands on"; `mandates.py` "UPI Autopay mandate lifecycle"; `payments.py` "Card Payment Method lifecycle"; `provisioning.py` "One-time provisioning when a team completes its billing profile"; `reconciliation.py` "the charged-but-never-webhooked safety net"; `refunds.py` "Post-payment corrections — refunds"; `settlement.py` "Settlement sources + credits-only wallet gating"; `webhooks.py` "Signature-first webhook receiver"; `profile.py`, `payment_notices.py` (none / helpers) |
| `revenue/` | `credits.py` "Credit ledger — the customer's prepaid wallet"; `dunning.py` "Retry / dunning + staged suspension"; `gst_status.py` "GSTIN status: looked up from the GST portal"; `metering.py` "Central metered-usage ingestion + billing"; `rerating.py` "Re-issuing a period's invoices after a price was found to be wrong"; `tax.py` "three structurally different mechanics"; `invoicing/generate.py` "Phase 1 (heavy): reconcile-if-stale, then draft — one team at a time"; `invoicing/lifecycle.py` "Phase 2 (light/parallel) + pre-payment corrections"; `invoicing/lines.py` "The time-weighted line-item engine"; `invoicing/run.py` "The monthly billing run — orchestration only"; `storage_usage.py` (none) |
| `catalog/` | `subscriptions.py` "Subscription intent + the two-axis state model"; `entitlements.py` "Trust tiers — the entitlement cap"; `pricing.py` "Rate resolution — region x currency"; `server_plans.py` "Server plans available under a Team billing policy and spending limit"; `composition.py` "Composed-config shape validation"; `commitments.py` "Commitment discount at invoice generation"; `trials.py` "Free/trial as the entry trust tier"; `signing.py` "Ed25519 signing for entitlement tokens"; `configurator.py`, `component_card.py`, `rate_card.py`, `plans.py`, `services.py`, `plan_setup.py`, `taxonomy_setup.py`; `public_ips.py`, `snapshots.py` (none) |
| `gateways/` | `base.py` "the single seam between core billing and payment gateways"; one adapter each for Stripe, Razorpay, PayPal; `registry.py` "Resolve a Payment Gateway config row to its GatewayAdapter"; `capabilities.py` "What a gateway may do in one currency"; `setup.py` "Seed the fixed roster of Payment Gateway rows" |
| `ingester/` | `connection.py` "HTTP client for the accounting system"; `customer.py` customer/address/contact sync; `erpnext_sync.py` "Sales Invoice sync — async, one-way, non-blocking"; `advance.py` "Push each wallet top-up … as an advance with its GST"; `gst.py`; `locks.py` "A lock held until the current transaction ends"; `setup.py` "Check that every name Central reads from the accounting system is there" |
| `platform/` | `alerts.py` "Operator alerts"; `constraints.py` "Database-level money invariants — rung 1"; `invariants.py` "Rung 4 … invariants no constraint can hold"; `notifications.py` "Cloud Billing is the sole sender"; `sync.py` "Usage recording — Central writes the runtime it bills from"; `metrics.py` "Billing counters, emitted as one parseable JSON line"; `jobs.py`, `kinds.py`, `readiness.py`, `records.py` (none) |
| `projection/` | 16 files; e.g. `engine.py` "What billing will do to one team, next period"; `guard.py` "it cannot write"; `batch.py` "Projecting a cohort" |

## Customer console (outside `central/billing`)

| Area | Location | Count | Evidence |
|---|---|---|---|
| Billing pages | `dashboard/src/pages/billing/` | 3 | `dashboard/src/router/index.ts:114-130` |
| Billing components | `dashboard/src/components/billing/` + `AddMethodDialog.vue`, `TopupDialog.vue` | 39 | file list |
| API method map | `dashboard/src/api/methods.ts` | — | calls 54 of the 57 `api/dashboard` endpoints (see [api-inventory.md](api-inventory.md#customer-endpoints-with-no-caller)) |
| Screen map | [screen-map.md](screen-map.md) | — | from the earlier pass; same snapshot |

## Boundaries

| Boundary | What enforces it in code | Level |
|---|---|---|
| Customer → billing data | `api/dashboard/*` calls capability helpers (see api-inventory); DocType reads by non-operators denied by `billing_record_query_conditions` / `billing_record_has_permission` on 21 DocTypes (`central/hooks.py:440-462,481,501`; `central/permissions.py:355-365`) | E2 for the helpers and hooks; per-endpoint correctness E1 |
| Operator → billing | `authz.require_operator` in `api/admin/*` (49 of 49 endpoints, see api-inventory) | E1 |
| Sites/pilot → billing | `pilot_credential_auth` on all 25 `api/billing_api.py` endpoints | E1 (decorator present; implementation not traced) |
| Gateways → billing | `verify_webhook_signature` called in `process_webhook` before work (`payments/webhooks.py:80`) | E2 |
| Billing → gateway SDKs | Gateway SDK imports found only in `gateways/` (search) | E1 |
| Manual edits of money records | `platform/records.refuse_manual_edit/delete` on 9 DocTypes (`central/hooks.py:215-230`) | E1 (registration); behaviour not traced |
