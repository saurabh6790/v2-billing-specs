# System overview

**Phase 1: System discovery.** Snapshot central `upstream/develop` at `a95b491e`
(9 Nov 2026; upstream had not moved when checked). Read-only: the code was extracted
to a scratch folder with `git archive`, parsed with Python's `ast` module and read.
Nothing in central was changed, run or migrated.

Evidence levels: **E1** found (search, import, registration), **E2** traced (lines
read), **E3** test-backed, **E4** seen in production. Phase 1 reached E1–E2 only.
Behaviour is not inferred from file, class or function names; where a module's role
is given, it is either an entry point registered in code or the author's own
docstring, labelled as such.

## Deliverables

| Asked for | File |
|---|---|
| 1. Application modules and boundaries | [module-inventory.md](module-inventory.md) |
| 2. Core business entities | [data-model-map.md](data-model-map.md) (DocTypes), this file §Entities |
| 3. API entry points | [api-inventory.md](api-inventory.md) |
| 4. Background jobs and scheduled tasks | [jobs-and-hooks.md](jobs-and-hooks.md) |
| 5. External integrations | [outbound-call-sites.md](outbound-call-sites.md), this file §Integrations |
| 6. Database models and relationships | [data-model-map.md](data-model-map.md) |
| 7. Important business workflows | [workflows.md](workflows.md) |
| 8. Documentation and existing tests | [docs-and-tests.md](docs-and-tests.md) |
| Module dependencies | [dependency-map.md](dependency-map.md) |
| Customer screens | [screen-map.md](screen-map.md) |
| Architecture overview, unknowns, Phase 2 targets | [phase-1-summary.md](phase-1-summary.md) |

## Scope of "Central Billing"

| Part | Location | Evidence |
|---|---|---|
| Billing backend | `central/billing/` (Frappe module inside the `central` app) | directory |
| Customer billing UI | `dashboard/src/pages/billing/`, `dashboard/src/components/billing/`, `AddMethodDialog.vue`, `TopupDialog.vue`, billing composables | `dashboard/src/router/index.ts:114-130` |
| Operator UI | Frappe Desk: `central/billing/workspace/billing/billing.json`, DocType forms, 41 report folders, `page/billing_simulator` | files |
| Registrations | `central/hooks.py` lines 139-146, 215-230, 302-328, 334-358, 387, 440-501 | [jobs-and-hooks.md](jobs-and-hooks.md) |
| Billing code outside `central/billing` | `central/permissions.py:355-365` (billing permission hooks); 9 patches in `central/patches/v0_0/` that import billing | [dependency-map.md](dependency-map.md) |

## Size

| Measure | Value | Source |
|---|---|---|
| Python lines, `central/billing` excluding tests | 41,498 (incl. 1,944 demo) | AST scan |
| Test lines / modules / functions | 29,101 / 119 / 1,765 | AST scan |
| DocTypes | 51 (33 documents, 17 child tables, 1 single) | DocType JSON |
| Whitelisted functions | 145 (28 guest) | AST scan |
| Scheduled jobs | 21 (13 daily, 6 hourly, 2 monthly) | `central/hooks.py:302-328` |
| `enqueue` call sites | 22 | AST scan |
| Outbound client call sites | 80 | AST scan |

## Entities

51 DocTypes; full table with links, child tables, unique fields, indexes and controller
hooks in [data-model-map.md](data-model-map.md). Grouped by the DocType each one links
to (fact) and by name (label only):

| Group | DocTypes |
|---|---|
| Linked to `Team` | Billing Profile, Tax Profile, Subscription, Subscription Change, Invoice, Payment Attempt, Payment Method, Refund, Credit Ledger Entry, Credit Wallet, Top-up Order, Usage Rollup, Project, Commitment, Gateway Customer, Billing Event, Billing Notification Log, Billing Run Team, Billing Scenario, Billing Projection Summary, Entitlement Token |
| Catalog | Plan, Plan Category, Plan Sub-Category, Resource Type, Catalog Rate, Plan Configurator (+4 child tables), Plan Includes, Plan Category Resource Type |
| Limits | Trust Tier Level, Trust Tier Threshold (child) |
| Gateway config | Payment Gateway, Payment Gateway Currency (child), Payment Gateway Webhook Event (child), Webhook Event |
| Runs and settings | Billing Run, Billing Run Team, Rerating Run, Billing Settings (single) + 4 child tables |
| Simulator | Billing Scenario (+2 child), Billing Projection Batch, Billing Projection Summary |

## Integrations

| System | Direction | Where in code | Facts found |
|---|---|---|---|
| Stripe | out / in | `gateways/stripe_adapter.py` (19 call sites); `payments/webhooks.py:29` | API version constant `stripe_adapter.py:32`; `stripe.max_network_retries = 2` `:181`; no `timeout=` at call sites |
| Razorpay | out / in | `gateways/razorpay_adapter.py` (24 call sites), `razorpay_recurring.py`; `webhooks.py:38` | Client built with auth only (`:65`); no `timeout` in the file |
| PayPal | out / in | `gateways/paypal_adapter.py` (12 `requests` calls); `webhooks.py:48` | `timeout=30` on all 12 |
| ERPNext | out | `ingester/connection.py` (5 `requests` calls, all with timeout; `TIMEOUT_SECONDS = 30` `:11`), used by `ingester/*` and `payments/corrections.py` | Auth header from site config (`connection.py:23-28`) |
| Raven | out | `platform/alerts.py:354` | timeout set |
| Atlas | out | via `central.integrations` / `central.resource_actions` (outside billing) | not traced |
| Grove, Cargo, pilot sites | in | `api/billing_api.py` (25 guest endpoints with `pilot_credential_auth`) | decorator present on all 25 |
| Customer email / in-app | out | `platform/notifications.py`; `central.notification` import | not traced |

## Architecture overview

See [phase-1-summary.md](phase-1-summary.md#system-architecture-overview).
