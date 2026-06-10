# 44 — Merge Billing hooks & fixtures into Central; retire role/field bootstrap

**Type:** AFK · **Milestone:** Central Merge (CM) · **Spec:** [ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md)

## What to build

Fold `billing/hooks.py` into `central/hooks.py` and remove the bootstrap that
created Billing's own roles + team field (now provided by Central's IAM and
#42/#43).

## What to build (changes)

1. **Scheduler events** — merge into Central's `scheduler_events`:
   - daily: `billing.revenue.dunning.run_dunning`,
     `billing.payments.reconciliation.run_reconciliation`,
     `billing.payments.charges.cleanup_payment_logs`
   - hourly: `billing.revenue.erpnext_sync.retry_failed_syncs`
   - monthly: `billing.payments.payments.expire_payment_methods`
   (rewrite dotted paths to `central.billing.*`).
2. **`override_doctype_dashboards`** — merge the `Currency → currency_dashboard`
   entry (backend desk dashboard — keep).
3. **Drop the SPA routing** — do **not** carry `website_route_rules`
   (`/billing/<path>`); it served the old SPA shell, which is not migrated.
4. **Delete the `after_migrate` bootstrap** — remove
   `billing.platform.security.ensure_billing_roles` and
   `billing.api.dashboard.ensure_billing_team_field`. Roles/capabilities come from
   Central fixtures; the team field is removed by #43.
5. **Fixtures** — Billing contributes **no** `Role` / `Team Role` fixtures. If the
   deferred `billing:operate` capability (ADR 0004 §3) is approved, add it to
   Central's `capability.json` and grant it on the relevant role — a Central
   fixtures change, reviewed by Central owners (out of scope here unless approved).
6. **App metadata** — fold `pyproject.toml` gateway deps (`stripe>=15`,
   `razorpay`) into Central's; PayPal needs none.

## Acceptance criteria

- [x] All billing scheduler jobs run under Central with `central.billing.*` paths.
- [x] No `ensure_billing_roles` / `ensure_billing_team_field` / billing
  `website_route_rules` remain.
- [x] `bench migrate` is clean; no orphan `Billing Admin`/`Billing User` roles are
  created (a v04 patch deletes the two roles the old bootstrap left behind).
- [x] Gateway SDK deps resolve from Central's `pyproject.toml`.

**Status:** Done on `merge-billing` (cenral-bench). The hooks/fixtures merge —
scheduler events on `central.billing.*`, `Currency → currency_dashboard` override,
SPA `website_route_rules` dropped, both `after_migrate` shims removed, and the
`stripe>=15` / `razorpay` deps in Central's `pyproject.toml` — landed with #41/#42.
This issue adds the missing cleanup: patch
`v04_drop_orphan_billing_roles.drop_billing_roles` deletes the orphan `Billing
Admin` / `Billing User` roles the retired `ensure_billing_roles` shim wrote before
#42 removed it (idempotent; a fresh Central never had them). `bench migrate` clean.

The **desk Workspace** (distinct from the dropped customer SPA) was also migrated:
the thin one carried from the standalone app (still `app: "billing"`) was rebuilt
ERPNext-style (Accounting/Manufacturing pattern) — a shortcut row + function-grouped
cards (Revenue, Credits, Subscriptions & Usage, Catalog, Payments & Gateways, Trust
& Entitlements, Customer Configuration, Notifications) over all 23 Billing DocTypes,
`app` → `central`. Patch `v05_billing_workspace` force-reloads it on migrate so
sites holding the old copy converge (timestamp gating skips it otherwise).

## Decisions baked in

- **No billing-owned roles/fixtures** (ADR 0004) — reuse Central's Team Roles.
- **SPA routing dropped** — UI not migrated.

## Blocked by

41 (paths), 42 (security bootstrap removal), 43 (team-field removal).
