# Documentation and tests

Snapshot central `a95b491e` (9 Nov 2026). Files listed from the repository; counts
from an AST scan (test functions) and `grep -c` (Playwright `test(` calls). **No test
was run in this phase**, so pass/fail state is unknown. A test's file or function name
is not taken as proof of what it covers (Rule: no behaviour from names).

## Documentation

### In the central repository

| Document | Lines | Notes |
|---|---|---|
| `central/billing/ARCHITECTURE.md` | 748 | Sub-module map, DocType graph, triggers, flows, cheat-sheet. Treated as a claim; checked only where cited. |
| `central/billing/SETUP-AND-DEMO.md` | 187 | Setup and demo seed |
| `central/billing/demo/README.md` | 190 | Demo scenarios |
| `central/billing/docs/reports.md` | 149 | Report catalogue |
| `central/billing/docs/metered-services-api.md` | 337 | Metering API |
| `docs/content/billing/` (`index.md` 95, `invoices.md` 94, `limits.md` 69, `payment-methods.md` 70) | 328 | Customer-facing docs site content (`.github/workflows/docs.yml`) |
| `spec/*.md` | — | Mention billing: `IAM.md` (10 mentions), `TRIALS_OPERATOR_GUIDE.md` (9), `INTEGRATIONS.md` (5), others 1–3 |
| `AGENTS.md` | — | Lists billing as part of Central (`:10,25,49`) and states "`central/billing/**` is out of scope for the rewrite" (`:57`) |
| DocType `SPEC.md` files | — | None found under `central/billing` |

### In this repository (`billing-specs`)

52 top-level design docs, 25 ADRs (`docs/adr/`), 153 issue files (`issues/`). These are
design intent; they were not compared with the code in this phase.

## Automated tests

### Server tests (`central/billing/tests/`)

119 modules, 1,765 test functions, 29,101 lines. Helpers in the same folder:
`utils.py`, `accounting_fake.py`, `gateway_contract.py`, `provisioning.py`, `e2e.py`.
Two more test modules sit in DocType folders:
`central/billing/doctype/subscription/test_subscription.py`,
`central/billing/doctype/subscription_change/test_subscription_change.py`.
8 modules contain a skip decorator or `requires_accounting_system` (search).

`central/billing/tests/e2e.py` is not a test module: it holds whitelisted endpoints
for the Playwright suite, gated on `frappe.conf.allow_tests` (`e2e.py:11`).

### CI

| Workflow | What it runs (read in the YAML) |
|---|---|
| `.github/workflows/ci.yml` | `scripts/check_patches.py` (`:19-20`); then a fresh site, `set-config allow_tests true` and `bench --site test_site run-tests --app central` (`:109-111`) |
| `.github/workflows/e2e.yml` | Playwright against a real bench and Stripe/Razorpay test sandboxes; seeds `central.billing.demo.demo_scenarios.seed` (`:122`); on push to `develop` and on PRs touching `dashboard/` or `e2e/` |
| `.github/workflows/linter.yml` | Lint (not read) |
| `.github/workflows/docs.yml` | Docs site (not read) |

Whether CI is green on `a95b491e` was not checked.

### Playwright (`e2e/billing/`)

15 spec files, 26 `test(` calls; the spec files and `fixtures.ts` hold 636 lines (`helpers/` not counted).

| Spec | `test(` calls |
|---|---|
| `e2e/billing/dunning.spec.ts` | 1 |
| `e2e/billing/emandate.spec.ts` | 2 |
| `e2e/billing/invoice-generation.spec.ts` | 1 |
| `e2e/billing/invoices.spec.ts` | 3 |
| `e2e/billing/limits.spec.ts` | 1 |
| `e2e/billing/mandate-upi.spec.ts` | 1 |
| `e2e/billing/onboarding.spec.ts` | 1 |
| `e2e/billing/overview.spec.ts` | 3 |
| `e2e/billing/profile.spec.ts` | 2 |
| `e2e/billing/projects.spec.ts` | 2 |
| `e2e/billing/refunds.spec.ts` | 2 |
| `e2e/billing/reports.spec.ts` | 2 |
| `e2e/billing/settlement.spec.ts` | 3 |
| `e2e/billing/topup-razorpay.spec.ts` | 1 |
| `e2e/billing/topup-stripe.spec.ts` | 1 |

### Server test modules

| Module | Test functions | Lines |
|---|---|---|
| `test_accounting_setup.py` | 17 | 324 |
| `test_adapter_isolation.py` | 1 | 24 |
| `test_admin.py` | 12 | 226 |
| `test_advance_sync.py` | 15 | 159 |
| `test_alerts.py` | 30 | 336 |
| `test_bare_metal_yield.py` | 5 | 87 |
| `test_billing.py` | 65 | 1104 |
| `test_billing_data_patches.py` | 19 | 539 |
| `test_billing_profile.py` | 23 | 207 |
| `test_billing_run.py` | 7 | 75 |
| `test_billing_run_outcomes.py` | 18 | 226 |
| `test_billing_settings.py` | 6 | 45 |
| `test_capacity_filter.py` | 1 | 30 |
| `test_catalog_taxonomy.py` | 10 | 124 |
| `test_catalog_workspace.py` | 12 | 137 |
| `test_charges.py` | 33 | 799 |
| `test_clear_default_mandate_currency.py` | 3 | 55 |
| `test_collection.py` | 9 | 221 |
| `test_collection_mode.py` | 28 | 531 |
| `test_commitments.py` | 7 | 185 |
| `test_component_card.py` | 13 | 157 |
| `test_composed_subscription.py` | 5 | 121 |
| `test_composition.py` | 14 | 104 |
| `test_corrections.py` | 24 | 460 |
| `test_cost_reports.py` | 10 | 161 |
| `test_create_server.py` | 10 | 142 |
| `test_credit_funded_provisioning.py` | 36 | 467 |
| `test_credits.py` | 31 | 424 |
| `test_customer_record_rule.py` | 7 | 96 |
| `test_customer_sync.py` | 21 | 233 |
| `test_dashboard.py` | 55 | 1129 |
| `test_dashboard_catalog.py` | 20 | 300 |
| `test_dashboard_overview.py` | 56 | 974 |
| `test_dashboard_subscriptions.py` | 2 | 78 |
| `test_disputes.py` | 14 | 261 |
| `test_dunning.py` | 50 | 902 |
| `test_eligibility_composed.py` | 12 | 187 |
| `test_emandate.py` | 9 | 235 |
| `test_entitlements.py` | 6 | 126 |
| `test_erpnext_sync.py` | 20 | 322 |
| `test_gateway_currency.py` | 12 | 130 |
| `test_gateway_events.py` | 5 | 153 |
| `test_gateway_fallback.py` | 25 | 504 |
| `test_gateway_parity.py` | 2 | 37 |
| `test_gst_status.py` | 20 | 260 |
| `test_hardening.py` | 9 | 225 |
| `test_hosted_checkout.py` | 17 | 333 |
| `test_internal_teams.py` | 12 | 196 |
| `test_invariants.py` | 19 | 313 |
| `test_invoice_hold.py` | 10 | 154 |
| `test_live_pricing.py` | 3 | 85 |
| `test_mandates.py` | 38 | 693 |
| `test_metered_plan.py` | 5 | 186 |
| `test_metering.py` | 8 | 221 |
| `test_metrics.py` | 4 | 62 |
| `test_money_records.py` | 5 | 60 |
| `test_notifications.py` | 8 | 104 |
| `test_ops_reports.py` | 13 | 266 |
| `test_payment_day.py` | 17 | 276 |
| `test_payment_gateway.py` | 25 | 370 |
| `test_payment_method_mix.py` | 4 | 125 |
| `test_payment_notices.py` | 9 | 175 |
| `test_payments.py` | 23 | 375 |
| `test_paypal_adapter.py` | 15 | 340 |
| `test_plan_configurator.py` | 30 | 491 |
| `test_plans.py` | 6 | 93 |
| `test_pricing.py` | 4 | 32 |
| `test_product_families.py` | 9 | 163 |
| `test_profile_provisioning.py` | 3 | 73 |
| `test_projection_api.py` | 5 | 79 |
| `test_projection_blast.py` | 14 | 112 |
| `test_projection_cassette.py` | 16 | 141 |
| `test_projection_cohort.py` | 48 | 588 |
| `test_projection_derivation.py` | 12 | 189 |
| `test_projection_engine.py` | 19 | 302 |
| `test_projection_estimate.py` | 8 | 138 |
| `test_projection_events.py` | 23 | 415 |
| `test_projection_guard.py` | 10 | 109 |
| `test_projection_library.py` | 15 | 140 |
| `test_projection_outcomes.py` | 25 | 285 |
| `test_projection_outlook.py` | 19 | 237 |
| `test_projection_purity.py` | 2 | 75 |
| `test_projection_reachable.py` | 1 | 62 |
| `test_projection_repricing.py` | 21 | 309 |
| `test_projection_rollforward.py` | 15 | 191 |
| `test_projection_scenario.py` | 21 | 205 |
| `test_projection_state_seam.py` | 11 | 128 |
| `test_rate_card.py` | 8 | 85 |
| `test_razorpay_adapter.py` | 24 | 391 |
| `test_readiness.py` | 23 | 252 |
| `test_reconciliation.py` | 25 | 494 |
| `test_refunds.py` | 8 | 186 |
| `test_repair_billing_audit_findings.py` | 11 | 164 |
| `test_report_paging.py` | 3 | 28 |
| `test_rerating.py` | 8 | 144 |
| `test_resize_composed.py` | 35 | 585 |
| `test_revenue_reports.py` | 3 | 91 |
| `test_rollup_terms.py` | 7 | 80 |
| `test_scale.py` | 5 | 109 |
| `test_server_billing.py` | 5 | 113 |
| `test_service_metering.py` | 33 | 685 |
| `test_settlement.py` | 12 | 246 |
| `test_states.py` | 10 | 124 |
| `test_status_boundary.py` | 2 | 102 |
| `test_storage_usage.py` | 7 | 112 |
| `test_stripe_adapter.py` | 30 | 506 |
| `test_subscriptions.py` | 13 | 167 |
| `test_sync.py` | 2 | 65 |
| `test_tax.py` | 17 | 198 |
| `test_team_notifications.py` | 10 | 163 |
| `test_token_issue.py` | 4 | 58 |
| `test_trial_provisioning.py` | 14 | 209 |
| `test_trials.py` | 4 | 130 |
| `test_unit_economics.py` | 12 | 178 |
| `test_wallet_draw.py` | 12 | 178 |
| `test_wallet_drift.py` | 6 | 51 |
| `test_webhook_of_another_product.py` | 4 | 61 |
| `test_webhooks.py` | 23 | 437 |
| `test_whitelist_boundary.py` | 4 | 196 |
