# API inventory

Snapshot central `a95b491e` (9 Nov 2026). Generated from the code by an AST script (read-only); every row is a source reference. Paths start at the central repo root.

Auth column: the authorization helpers the function body or its decorators call, found by name match in the parsed source. It shows that a call is present (E1), not that the check is correct (that needs a trace, E2).

| Helper | Defined at | What it does (read in code, E2) |
|---|---|---|
| `_resolve_team` | `central/billing/api/dashboard/_shared.py:48-57` | Uses the given team or the caller's default team, then `authz.require_capability(team, require)`; default capability `billing:view` |
| `_require_view` / `_require_manage` | `_shared.py:68-77` | `authz.require_billing_view` / `require_billing_manage` on a team taken from a record |
| `_resolve_resize_team` | `_shared.py:60-65` | Allows a member with `server:resize` on the server, else falls back to `_resolve_team` |
| `require_operator` | `central/billing/authz.py:74` | Operator = `iam.user_has_operator_bypass` (`authz.py:29-31`) |
| `pilot_credential_auth` | decorator used in `central/billing/api/billing_api.py` | Authenticates a pilot credential (implementation not traced in this phase) |
| `process_webhook` | `central/billing/payments/webhooks.py:75-80` | Calls the adapter's `verify_webhook_signature` before anything else |

## Summary

| Group | Endpoints | Guest | Methods = ANY |
|---|---|---|---|
| api/admin (operator) | 49 | 0 | 35 |
| api/billing_api.py | 25 | 25 | 0 |
| api/dashboard (customer console) | 57 | 0 | 30 |
| doctype controllers (Desk form methods) | 11 | 0 | 3 |
| payments/webhooks.py | 3 | 3 | 3 |
| **Total** | **145** | **28** | **71** |

## All endpoints


### api/admin (operator)

| Function | Location | HTTP | Guest | Other decorators | Auth calls found |
|---|---|---|---|---|---|
| `check_accounting_setup` | `central/billing/api/admin/accounting.py:12` | ANY |  | — | require_operator |
| `get_manual_setup_gaps` | `central/billing/api/admin/accounting.py:19` | ANY |  | — | require_operator |
| `get_catalog` | `central/billing/api/admin/catalog.py:15` | ANY |  | — | require_operator |
| `create_configured_plan` | `central/billing/api/admin/catalog.py:55` | POST |  | — | require_operator |
| `update_plan_rate` | `central/billing/api/admin/catalog.py:84` | POST |  | — | require_operator |
| `get_cluster_consumption` | `central/billing/api/admin/catalog.py:140` | ANY |  | — | require_operator |
| `get_plan_consumption` | `central/billing/api/admin/catalog.py:159` | ANY |  | — | require_operator |
| `get_conversion` | `central/billing/api/admin/catalog.py:181` | ANY |  | — | require_operator |
| `get_trial_detail` | `central/billing/api/admin/catalog.py:206` | ANY |  | — | require_operator |
| `get_trial_costs_detail` | `central/billing/api/admin/catalog.py:263` | ANY |  | — | require_operator |
| `cancel_invoice` | `central/billing/api/admin/corrections.py:12` | POST |  | — | require_operator |
| `cancel_and_refund` | `central/billing/api/admin/corrections.py:24` | POST |  | — | require_operator |
| `retry_failed_refunds` | `central/billing/api/admin/corrections.py:35` | POST |  | — | require_operator |
| `refund_part` | `central/billing/api/admin/corrections.py:44` | POST |  | — | require_operator |
| `get_gateways` | `central/billing/api/admin/gateways.py:16` | ANY |  | — | require_operator |
| `get_effective_routing` | `central/billing/api/admin/gateways.py:45` | ANY |  | — | require_operator |
| `set_default_gateway` | `central/billing/api/admin/gateways.py:84` | POST |  | — | require_operator |
| `project_team` | `central/billing/api/admin/projection.py:20` | ANY |  | — | require_operator |
| `project_team_months` | `central/billing/api/admin/projection.py:46` | ANY |  | — | require_operator |
| `start_cohort_projection` | `central/billing/api/admin/projection.py:72` | POST |  | — | require_operator |
| `sample_cohort` | `central/billing/api/admin/projection.py:112` | POST |  | — | require_operator |
| `size_cohort` | `central/billing/api/admin/projection.py:142` | ANY |  | — | require_operator |
| `project_scenario` | `central/billing/api/admin/projection.py:154` | ANY |  | — | require_operator |
| `save_scenario_result` | `central/billing/api/admin/projection.py:165` | POST |  | — | require_operator |
| `compare_scenario` | `central/billing/api/admin/projection.py:175` | ANY |  | — | require_operator |
| `scenario_library` | `central/billing/api/admin/projection.py:185` | ANY |  | — | require_operator |
| `project_from_library` | `central/billing/api/admin/projection.py:195` | ANY |  | — | require_operator |
| `check_scenario_drift` | `central/billing/api/admin/projection.py:215` | ANY |  | — | require_operator |
| `compare_cohort_batches` | `central/billing/api/admin/projection.py:225` | ANY |  | — | require_operator |
| `preview_rerating` | `central/billing/api/admin/rerating.py:13` | ANY |  | — | require_operator |
| `apply_rerating` | `central/billing/api/admin/rerating.py:20` | POST |  | — | require_operator |
| `correct_rollup_terms` | `central/billing/api/admin/rerating.py:29` | POST |  | — | require_operator |
| `get_summary` | `central/billing/api/admin/revenue.py:21` | ANY |  | — | require_operator |
| `get_revenue_trend` | `central/billing/api/admin/revenue.py:49` | ANY |  | — | require_operator |
| `get_cluster_breakdown` | `central/billing/api/admin/revenue.py:84` | ANY |  | — | require_operator |
| `get_team_breakdown` | `central/billing/api/admin/revenue.py:103` | ANY |  | — | require_operator |
| `get_payment_analytics` | `central/billing/api/admin/revenue.py:118` | ANY |  | — | require_operator |
| `get_overdue_aging` | `central/billing/api/admin/revenue.py:143` | ANY |  | — | require_operator |
| `get_free_trial_costs` | `central/billing/api/admin/revenue.py:166` | ANY |  | — | require_operator |
| `list_all_invoices` | `central/billing/api/admin/revenue.py:195` | ANY |  | — | require_operator |
| `get_team_services` | `central/billing/api/admin/services.py:18` | ANY |  | — | require_operator |
| `subscribe_team_service` | `central/billing/api/admin/services.py:35` | POST |  | — | require_operator |
| `get_team_billing` | `central/billing/api/admin/teams.py:33` | ANY |  | — | require_operator |
| `adjust_team_credits` | `central/billing/api/admin/teams.py:69` | POST |  | — | require_operator |
| `get_retention` | `central/billing/api/admin/teams.py:83` | ANY |  | — | require_operator |
| `get_metrics` | `central/billing/api/admin/teams.py:113` | ANY |  | — | require_operator |
| `list_teams` | `central/billing/api/admin/teams.py:146` | ANY |  | — | require_operator |
| `get_payment_failures` | `central/billing/api/admin/teams.py:183` | ANY |  | — | require_operator |
| `get_delinquent_teams` | `central/billing/api/admin/teams.py:206` | ANY |  | — | require_operator |

### api/billing_api.py

| Function | Location | HTTP | Guest | Other decorators | Auth calls found |
|---|---|---|---|---|---|
| `get_payment_gateways` | `central/billing/api/billing_api.py:261` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `add_payment_method` | `central/billing/api/billing_api.py:273` | POST | yes | rate_limit(limit=20, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `confirm_payment_method` | `central/billing/api/billing_api.py:315` | POST | yes | rate_limit(limit=20, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `create_payment_method_checkout` | `central/billing/api/billing_api.py:356` | POST | yes | rate_limit(limit=20, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `confirm_payment_method_checkout` | `central/billing/api/billing_api.py:423` | POST | yes | rate_limit(limit=300, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `remove_payment_method` | `central/billing/api/billing_api.py:447` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `reconcile_payment_setup` | `central/billing/api/billing_api.py:461` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `get_available_plans` | `central/billing/api/billing_api.py:495` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `change_plan` | `central/billing/api/billing_api.py:517` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `list_service_plans` | `central/billing/api/billing_api.py:571` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `subscribe_service` | `central/billing/api/billing_api.py:584` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `get_service_subscription` | `central/billing/api/billing_api.py:597` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `check_service_allowance` | `central/billing/api/billing_api.py:607` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `report_usage` | `central/billing/api/billing_api.py:625` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `get_credit_balance` | `central/billing/api/billing_api.py:698` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `get_billing_profile` | `central/billing/api/billing_api.py:726` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `save_billing_profile` | `central/billing/api/billing_api.py:742` | POST | yes | pilot_credential_auth | pilot_credential_auth |
| `get_billing_summary` | `central/billing/api/billing_api.py:762` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `get_plan_options` | `central/billing/api/billing_api.py:841` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `list_payment_methods` | `central/billing/api/billing_api.py:966` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `create_topup_checkout` | `central/billing/api/billing_api.py:985` | POST | yes | rate_limit(limit=30, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `list_server_invoices` | `central/billing/api/billing_api.py:1017` | GET | yes | pilot_credential_auth | pilot_credential_auth |
| `get_server_invoice_pdf` | `central/billing/api/billing_api.py:1028` | POST | yes | rate_limit(limit=30, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `create_invoice_checkout` | `central/billing/api/billing_api.py:1038` | POST | yes | rate_limit(limit=30, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |
| `get_checkout_status` | `central/billing/api/billing_api.py:1108` | POST | yes | rate_limit(limit=300, seconds=60 * 60), pilot_credential_auth | pilot_credential_auth |

### api/dashboard (customer console)

| Function | Location | HTTP | Guest | Other decorators | Auth calls found |
|---|---|---|---|---|---|
| `whoami` | `central/billing/api/dashboard/account.py:33` | ANY |  | — | is_operator |
| `get_billing_profile` | `central/billing/api/dashboard/account.py:43` | ANY |  | — | _resolve_team |
| `recheck_gst_status` | `central/billing/api/dashboard/account.py:85` | POST |  | rate_limit(limit=5, seconds=60 * 60, methods='POST') | _resolve_team |
| `get_billing_geo` | `central/billing/api/dashboard/account.py:102` | ANY |  | — | **none found** |
| `save_billing_profile` | `central/billing/api/dashboard/account.py:139` | POST |  | — | _resolve_team |
| `get_billing_settings` | `central/billing/api/dashboard/account.py:190` | ANY |  | — | _resolve_team |
| `save_billing_settings` | `central/billing/api/dashboard/account.py:220` | POST |  | — | _resolve_team |
| `get_collection_status` | `central/billing/api/dashboard/account.py:244` | ANY |  | — | _resolve_team |
| `set_collection_mode` | `central/billing/api/dashboard/account.py:275` | POST |  | — | _resolve_team |
| `get_team_overview` | `central/billing/api/dashboard/account.py:285` | ANY |  | — | _resolve_team |
| `get_trust_tier` | `central/billing/api/dashboard/account.py:308` | ANY |  | — | _resolve_team |
| `get_eligible_plans` | `central/billing/api/dashboard/catalog.py:20` | ANY |  | — | **none found** |
| `provision_composed_config` | `central/billing/api/dashboard/catalog.py:45` | POST |  | — | _resolve_team |
| `get_composed_config` | `central/billing/api/dashboard/catalog.py:96` | ANY |  | — | **none found** |
| `get_forecast` | `central/billing/api/dashboard/invoices.py:33` | ANY |  | — | _resolve_team |
| `list_subscriptions` | `central/billing/api/dashboard/invoices.py:123` | ANY |  | — | _resolve_team |
| `pause_subscription` | `central/billing/api/dashboard/invoices.py:262` | POST |  | — | _require_manage |
| `resume_subscription` | `central/billing/api/dashboard/invoices.py:273` | POST |  | — | _require_manage |
| `set_subscription_project` | `central/billing/api/dashboard/invoices.py:284` | POST |  | — | _require_manage |
| `list_invoices` | `central/billing/api/dashboard/invoices.py:297` | ANY |  | — | _resolve_team |
| `download_invoice_pdf` | `central/billing/api/dashboard/invoices.py:324` | GET |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _require_view |
| `get_invoice` | `central/billing/api/dashboard/invoices.py:338` | ANY |  | — | _require_view |
| `list_payment_attempts` | `central/billing/api/dashboard/invoices.py:512` | ANY |  | — | _resolve_team |
| `get_credit_balance` | `central/billing/api/dashboard/invoices.py:556` | ANY |  | — | _resolve_team |
| `credit_ledger` | `central/billing/api/dashboard/invoices.py:572` | ANY |  | — | _resolve_team |
| `download_topup_receipt` | `central/billing/api/dashboard/invoices.py:601` | GET |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _require_view |
| `pay_invoice` | `central/billing/api/dashboard/invoices.py:619` | POST |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _require_manage |
| `get_fallback_offer` | `central/billing/api/dashboard/invoices.py:630` | ANY |  | — | _require_manage |
| `pay_invoice_checkout` | `central/billing/api/dashboard/invoices.py:665` | POST |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _require_manage |
| `confirm_invoice_checkout` | `central/billing/api/dashboard/invoices.py:678` | POST |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _require_manage |
| `get_topup_options` | `central/billing/api/dashboard/invoices.py:698` | ANY |  | — | _resolve_team |
| `create_topup_order` | `central/billing/api/dashboard/invoices.py:728` | POST |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _resolve_team |
| `confirm_topup` | `central/billing/api/dashboard/invoices.py:838` | POST |  | rate_limit(limit=30, seconds=60 * 60, user_based=True) | _resolve_team |
| `list_payment_methods` | `central/billing/api/dashboard/methods.py:25` | ANY |  | — | _resolve_team |
| `get_payment_method_options` | `central/billing/api/dashboard/methods.py:54` | ANY |  | — | _resolve_team |
| `initiate_card_setup` | `central/billing/api/dashboard/methods.py:110` | POST |  | rate_limit(limit=20, seconds=60 * 60, user_based=True) | _resolve_team |
| `confirm_card` | `central/billing/api/dashboard/methods.py:127` | POST |  | rate_limit(limit=20, seconds=60 * 60, user_based=True) | _require_manage |
| `setup_payment_method_order` | `central/billing/api/dashboard/methods.py:149` | POST |  | rate_limit(limit=20, seconds=60 * 60, user_based=True) | _resolve_team |
| `confirm_payment_method_order` | `central/billing/api/dashboard/methods.py:210` | POST |  | rate_limit(limit=20, seconds=60 * 60, user_based=True) | _require_manage |
| `remove_payment_method` | `central/billing/api/dashboard/methods.py:234` | POST |  | — | _require_manage |
| `set_default_payment_method` | `central/billing/api/dashboard/methods.py:244` | POST |  | — | _require_manage |
| `reorder_payment_methods` | `central/billing/api/dashboard/methods.py:254` | POST |  | — | _resolve_team |
| `get_next_payment` | `central/billing/api/dashboard/outlook.py:74` | ANY |  | — | _resolve_team |
| `get_payment_schedule` | `central/billing/api/dashboard/outlook.py:115` | ANY |  | — | _resolve_team |
| `list_projects` | `central/billing/api/dashboard/projects.py:28` | ANY |  | — | _resolve_team |
| `create_project` | `central/billing/api/dashboard/projects.py:73` | POST |  | — | _resolve_team |
| `rename_project` | `central/billing/api/dashboard/projects.py:96` | POST |  | — | _require_manage |
| `set_project_enabled` | `central/billing/api/dashboard/projects.py:110` | POST |  | — | _require_manage |
| `set_project_spending_limit` | `central/billing/api/dashboard/projects.py:123` | POST |  | — | _require_manage |
| `get_spend_history` | `central/billing/api/dashboard/reports.py:33` | ANY |  | — | _resolve_team |
| `get_statement` | `central/billing/api/dashboard/reports.py:65` | ANY |  | — | _resolve_team |
| `get_tax_summary` | `central/billing/api/dashboard/reports.py:137` | ANY |  | — | _resolve_team |
| `list_refunds` | `central/billing/api/dashboard/reports.py:202` | ANY |  | — | _resolve_team |
| `export_csv` | `central/billing/api/dashboard/reports.py:246` | ANY |  | — | _resolve_team |
| `get_metered_services` | `central/billing/api/dashboard/services.py:17` | ANY |  | — | _resolve_team |
| `subscribe_metered_service` | `central/billing/api/dashboard/services.py:32` | POST |  | — | _resolve_team |
| `get_cycle_costs` | `central/billing/api/dashboard/spend.py:20` | ANY |  | — | _resolve_team |

### doctype controllers (Desk form methods)

| Function | Location | HTTP | Guest | Other decorators | Auth calls found |
|---|---|---|---|---|---|
| `send_test_alert` | `central/billing/doctype/billing_settings/billing_settings.py:55` | POST |  | — | **none found** |
| `pull_webhook_events` | `central/billing/doctype/payment_gateway/payment_gateway.py:285` | POST |  | — | **none found** |
| `update_webhook_events` | `central/billing/doctype/payment_gateway/payment_gateway.py:294` | POST |  | — | **none found** |
| `revalidate_and_register_webhook` | `central/billing/doctype/payment_gateway/payment_gateway.py:337` | POST |  | — | **none found** |
| `populate_rungs` | `central/billing/doctype/plan_configurator/plan_configurator.py:104` | POST |  | — | **none found** |
| `preview` | `central/billing/doctype/plan_configurator/plan_configurator.py:113` | ANY |  | — | **none found** |
| `enqueue_generation` | `central/billing/doctype/plan_configurator/plan_configurator.py:138` | POST |  | — | **none found** |
| `seed_component_rows` | `central/billing/doctype/plan_configurator/plan_configurator.py:238` | POST |  | — | **none found** |
| `apply_component_card` | `central/billing/doctype/plan_configurator/plan_configurator.py:256` | POST |  | — | **none found** |
| `component_card_status` | `central/billing/doctype/plan_configurator/plan_configurator.py:277` | ANY |  | — | **none found** |
| `pricing_warnings` | `central/billing/doctype/plan_configurator/plan_configurator.py:287` | ANY |  | — | **none found** |

### payments/webhooks.py

| Function | Location | HTTP | Guest | Other decorators | Auth calls found |
|---|---|---|---|---|---|
| `stripe` | `central/billing/payments/webhooks.py:30` | ANY | yes | — | process_webhook |
| `razorpay` | `central/billing/payments/webhooks.py:39` | ANY | yes | — | process_webhook |
| `paypal` | `central/billing/payments/webhooks.py:49` | ANY | yes | — | process_webhook |

## Rows marked "none found", read by hand (E2)

| Endpoint | What guards it |
|---|---|
| `get_billing_geo` (`central/billing/api/dashboard/account.py:102-111`) | No team check. It returns the Country list and India's GST state list, no team data. Any logged-in user can call it (not guest). |
| `get_eligible_plans`, `get_composed_config` (`central/billing/api/dashboard/catalog.py:20,96`) | `_resolve_resize_team` (`_shared.py:60-65`), a helper the name match did not include. `get_eligible_plans` reads one Subscription's `server_id` filtered by the given team before calling it (`catalog.py:31-34`); the value is not returned on its own. |
| 11 DocType controller methods (`billing_settings.py:55`, `payment_gateway.py:285,294,337`, `plan_configurator.py:104-287`) | Each is a method on the Document class (checked by AST), so Frappe calls it through its document-method path on a loaded document. The DocTypes grant permissions only to System Manager (DocType JSON). Which permission type Frappe checks on that path was not traced in this phase. |

## Customer endpoints with no caller

Searched `dashboard/src/**/*.{ts,vue}` and every `.js` under `central/` for the dotted
path of each of the 57 `api/dashboard` endpoints. Three have no caller:

| Endpoint | Location |
|---|---|
| `whoami` | `central/billing/api/dashboard/account.py:33` |
| `provision_composed_config` | `central/billing/api/dashboard/catalog.py:45` |
| `get_fallback_offer` | `central/billing/api/dashboard/invoices.py:630` |

They may be called by something outside this repository (not checked).

## Endpoints accepting any HTTP method

71 endpoints have no `methods=` restriction. None of them calls a write
(`save`, `insert`, `db_set`, `set_value`, `delete`, `commit`, `enqueue`) **directly
in its own body** (AST check). Whether any writes through a function it calls was
not traced. This matters because Frappe rolls back writes made during a GET request.
