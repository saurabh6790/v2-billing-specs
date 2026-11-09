# Security review

Snapshot `a95b491e`. Static review; no probe was run in this pass. The 23 Oct 2026
security audit and issues 128–145 hold the detailed payment-security work; this
file records what was seen during the teardown and points to those issues where
they overlap. No exploit detail is given (this repository is public).

## Access control

| Layer | Implementation | Evidence | Assessment |
|---|---|---|---|
| Customer reads and actions | Capability checks per team: `billing:view`, `billing:manage` | `authz.py:49-72`; `_require_manage` / `_resolve_team` in `api/dashboard/*` | Every customer endpoint reviewed calls one (E2) |
| Operator | System Manager through `iam.user_has_operator_bypass` | `authz.py:29-31,74` | One role does everything: catalog, refunds, credits, settings |
| DocType permissions | Only System Manager on every billing DocType | DocType JSON | Customers have no Desk access to billing |
| Row-level permission hooks | None for billing DocTypes (`permission_query_conditions` / `has_permission`) | `central/hooks.py` | Defence in depth missing; any future generic read path is unscoped (issue 140) |
| `ignore_permissions=True` | 128 uses outside tests | grep | Expected given the API-only model; each is a place a missed check becomes a leak |
| Money records | Manual edit/delete refused for 9 DocTypes, Administrator included | `platform/records.py`; `central/hooks.py:215-230` | Present in code (E2); no test or Version check done |

## Public endpoints

| Endpoint group | Count | Guard | Evidence |
|---|---|---|---|
| Gateway webhooks | 3 | Signature verified before any parse or write | `payments/webhooks.py:29-80` |
| Pilot facade | 25 | `pilot_credential_auth` decorator on every one (checked) | `api/billing_api.py` |
| E2E test endpoints | in `tests/e2e.py` | `allow_guest`, hard-gated on `frappe.conf.allow_tests` | `tests/e2e.py:11-31`; issue 143 asks for removal from the shipped package |

## Financial operation permissions

| Operation | Who can | Reason required | Second approval |
|---|---|---|---|
| Cancel invoice | Operator | Yes (`api/admin/corrections.py:18`) | No |
| Cancel and refund | Operator | Yes (`:30`) | No |
| Refund part | Operator | Yes (`:50`) | No |
| Grant / adjust credit | Operator | Desk dialog only; API accepts none (`api/admin/teams.py:67-69`) | No |
| Raise spending limit | Operator | Yes (`billing_profile.py:318`) | No |
| Mark team internal (invoices waived) | Operator | Yes (`billing_profile.py:341-343`) | No |
| Change prices | Operator | No | No |
| Re-rate a period | Operator (console) | Yes (`api/admin/rerating.py:24`) | No |

There is no finance role separate from System Manager (issue 137).

## Sensitive data

| Data | Where | Handling |
|---|---|---|
| Gateway keys and webhook secrets | `Payment Gateway` Password fields; read through `get_credential` | Present in code (E2) |
| Raven bot API key | `Billing Settings.raven_api_key` is **Data**; the secret is Password | Key visible to anyone who can read Billing Settings; low impact alone |
| ERPNext API key/secret | Site config (`ingester/connection.py:23-28`) | Present in code (E2) |
| Card data | Never touches Central (Stripe Elements, gateway pages) | By design: card entry is in gateway-hosted fields (E2) |
| Gateway responses | `Payment Attempt.gateway_response` (JSON) | Pruned on retention; may hold card brand/last4 and customer ids. Retention floor is issue 139 |
| Customer GSTIN, address, phone | Billing Profile | Shown back to the team only |
| Gateway error text | Error Log only, never to customer | `gateways/base.py:130-143` |

## Input handling

| Check | Status | Evidence |
|---|---|---|
| Raw SQL | 2 uses of `frappe.db.sql` in billing (outside tests) | grep |
| CSV formula injection | Escaped (`_safe_cell`) | `api/dashboard/reports.py:262-273` |
| Rate limits on customer money endpoints | 12 `@rate_limit` in `api/dashboard`; pilot money endpoints limited | grep; issue 144 lists remaining gaps |
| Amount validation | Top-up > 0 (`invoices.py:752`); refund within remaining (`corrections.py:93`) | Verified |

## Findings

| ID | Finding | Severity | Ref |
|---|---|---|---|
| S-01 | No row-level permission hooks on team-scoped billing DocTypes | P2 | issue 140 |
| S-02 | One operator role for all money operations; no finance separation, no second approval | P2 | issue 137 |
| S-03 | Credit adjustment API does not require a reason | P2 | `api/admin/teams.py:67-69` |
| S-04 | E2E endpoints ship in the package behind a config flag | P2 | issue 143 |
| S-05 | Raven API key stored as Data | P3 | `doctype/billing_settings/billing_settings.json` |
| S-06 | Customer error messages can carry DocType names and record ids (`states.py:230`) | P3 | error audit |
