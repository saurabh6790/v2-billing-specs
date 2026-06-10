# 42 — Adopt Central's capability IAM (retire `Billing Admin` / `Billing User`)

**Type:** HITL · **Milestone:** Central Merge (CM) · **Spec:** [ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md) · [security.md](../security.md) §3

## What to build

Replace Billing's bespoke authorisation (`billing/platform/security.py`: two
Frappe roles + `User.billing_team`) with Central's capability IAM
(`central.iam.can(user, team, capability)`). Billing defines **no roles of its
own**; it reuses the `billing:view` / `billing:manage` capabilities already in
Central's fixtures (carried by the `Owner` and `Billing` team roles).

## What to build (changes)

1. **Classify every customer endpoint** view vs manage:
   - **`billing:view`** (reads): `get_team_overview`, `get_trust_tier`,
     `get_billing_profile`, `get_billing_settings`, `get_forecast`,
     `list_subscriptions`, `list_invoices`, `get_invoice`, `list_payment_attempts`,
     `get_credit_balance`, `credit_ledger`, `list_payment_methods`,
     `get_payment_method_options`.
   - **`billing:manage`** (mutations): `save_billing_profile`,
     `save_billing_settings`, `pay_invoice`, `purchase_credits`,
     `create_topup_order`, `confirm_topup`, `initiate_card_setup`, `confirm_card`,
     `add_demo_card`, `setup_payment_method_order`, `confirm_payment_method_order`,
     `set_default_payment_method`, `reorder_payment_methods`, `remove_payment_method`.
2. **Swap the seam at the chokepoint:** `api/dashboard/_shared.py:_resolve_team`
   calls `can(user, team, "billing:view")`; a small `_require_manage(team)` helper
   calls `can(user, team, "billing:manage")` on the mutation endpoints. Replace
   `require_team_access` / `get_user_team` / `is_billing_admin` usages.
3. **Default-team resolution:** `get_user_team()` → `central.iam.get_user_team_names(user)`;
   `list_switchable_teams` maps onto the same. Multi-team users select a current
   team (reuse Central's console mechanism) — never trust a client-supplied team
   without a `can(...)` check.
4. **Admin console → operator bypass:** every `api/admin/*` endpoint gates on
   `central.iam.user_has_operator_bypass(user)` (System Manager) instead of
   `require_billing_admin()`. *(Optional `billing:operate` capability is deferred —
   ADR 0004 §3, Central-owned.)*
5. **Delete** `billing/platform/security.py` (and the `BILLING_ADMIN` /
   `BILLING_USER` constants, `ensure_billing_roles`). Keep optional billing-named
   wrappers in a new `billing/authz.py` only for readability.
6. **Agent isolation preserved:** the cluster Agent API key holds no billing
   capability, so `can(...)` returns False on every customer/admin endpoint — it
   reaches only the sync surface (`platform/sync.py`). Verify this still holds.

## Acceptance criteria

- [ ] No reference to `Billing Admin` / `Billing User` / `billing_team` /
  `require_team_access` / `require_billing_admin` remains in code.
- [ ] A team `Viewer`/`Developer` member is denied billing endpoints; an
  `Owner`/`Billing` member is allowed (view + manage as classified).
- [ ] A non-member passing another team's name → `PermissionError` (403), never
  widened (IDOR defence preserved, security.md §3b).
- [ ] A mutation endpoint denies a `billing:view`-only member; a read endpoint
  allows them.
- [ ] `System Manager` reaches the admin console; a plain member gets 403.
- [ ] The Agent API key gets 403 on every customer/admin endpoint.

## Decisions baked in

- **View/manage split** — Billing's single gate becomes two capabilities.
- **Operator bypass for cross-team admin now; `billing:operate` deferred** (ADR
  0004 §3).

## Blocked by

41 (module must live under Central, importing `central.iam`), and the Team
identity change shares ground with 43 (land 43 alongside or just after).
