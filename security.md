# Security & Hardening

## Purpose

The authorisation model and the hardening posture for billing. Unchanged in intent by the ERPNext
re-base; the only shift is that ERPNext + `frappe/payments` now own pieces of the surface, so their
permission and webhook behaviour is part of the threat model.

## Authorisation — capability IAM (no billing-owned roles)

Billing uses Central's team-scoped **capability IAM** as its sole authorisation model
([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)). It defines **no roles of its
own**.

- `billing:view` gates every customer **read** endpoint.
- `billing:manage` gates every **mutation** (pay invoice, buy credits, edit payment methods/settings,
  change subscription).
- Resolved by `central.iam.can(user, team, capability)`; the seam is `require_team_access(team)`.
- Cross-team admin uses Central's **operator bypass** (`System Manager`,
  `central.iam.user_has_operator_bypass`). A platform-staff `billing:operate` capability is a
  deferred, Central-owned follow-up.
- The customer-facing **team** is the Central `Team`; the accounting **Customer** is ERPNext's.

### ERPNext permission surface

Sales Invoice / Payment Entry / Item / Item Price now hold billing data. Customer-facing APIs **never
expose ERPNext DocTypes directly** — they go through whitelisted, capability-gated billing methods
that scope to the caller's team→Customer. Desk access to the ERPNext accounting DocTypes is
staff-only (operator bypass). No customer gets a raw `/api/resource/Sales Invoice` grant.

## Webhook hardening (signature-first)

`frappe/payments` controllers are not uniformly signature-first, so billing **owns the inbound
webhook route** and verifies the gateway HMAC as the **first operation, before any DB access** —
closing the v1 order-ID enumeration bug. Dedupe on `gateway_event_id` (unique). No business logic in
the HTTP cycle. See [payments.md](payments.md).

## Money integrity

- Integer minor units in the compute core; major-unit decimals at the Sales Invoice boundary with
  **round-off disabled** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)). Charge ↔
  Payment Entry ↔ Sales Invoice parity to the paisa.
- Idempotency keys on every gateway charge; the `Sales Invoice … FOR UPDATE` lock + in-flight
  Payment Request guard prevent double-charge.
- Append-only credit ledger under `FOR UPDATE` (kills the v1 double-spend); the wallet's ERPNext
  mirror is written in the same transaction.
- Gateway secrets stored encrypted in the `frappe/payments` settings controllers; never returned by a
  customer-facing API; system-managed webhook secret (auto-registered, read-only).

## Load & hardening checklist

- Two-phase invoice generation (28th draft / 1st submit-and-collect) keeps the 1st-of-month off a
  single blocking loop; workers stagger collection (gateway rate limits).
- Reconciliation job (daily) on ERPNext **Payment Reconciliation** + gateway scan resolves
  charged-but-never-webhooked without double-charging — the most important hardening job.
- Webhook Event log pruned on a rolling window; statutory Payment Entries / Sales Invoices never
  pruned.
- Parameterised queries only (kill the v1 SQL injection); fully type-annotated whitelisted methods
  (Central enforces `require_type_annotated_api_methods`).

## Notes

- The standalone `Billing Admin` / `Billing User` roles are retired
  ([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)); any spec text implying
  billing-owned roles predates the Central merge.
