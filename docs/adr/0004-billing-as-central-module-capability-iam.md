# Billing becomes a module inside the Central app and adopts Central's capability IAM

Billing was built as a standalone Frappe app (`billing`, formerly `press_billing`)
with its **own** authorisation model: two Frappe roles (`Billing Admin`,
`Billing User`) and a `User.billing_team` field, gated through
`billing/platform/security.py`. Meanwhile the platform's console app,
**Central** (`frappe/central`), shipped a richer, team-scoped, **capability-based
IAM** that Atlas and the team console already use: `Team` → `Team Member` →
`Team Role` → `Capability`, resolved by `central.iam.can(user, team, capability)`.

Running two parallel authorisation models on the same platform is untenable — a
customer's billing access and their VM/team access would be governed by different,
divergent rules. Billing's standalone roles were always a placeholder for "real"
platform identity.

## Decision

**Billing ships as a `billing` *module* inside the Central app, and uses
Central's capability IAM as its sole authorisation model.** Billing defines **no
roles of its own**.

1. **Capabilities (already in Central's fixtures, `plane: central`,
   `resource: billing`):**
   - `billing:view` — view billing data → gates every customer **read** endpoint.
   - `billing:manage` — manage billing settings & payment operations → gates every
     **mutation** (pay invoice, buy credits, edit payment methods/settings).
   These come bundled in the system **Team Roles** `Owner` and `Billing`;
   `Admin`/`Developer`/`Viewer` carry neither.

2. **The authz seam moves to `central.iam`.** `require_team_access(team)` →
   `can(user, team, "billing:view"|"billing:manage")`. `billing/platform/security.py`
   is deleted (optionally replaced by thin billing-named wrappers).

3. **Cross-team admin surface uses Central's operator bypass** (`System Manager`,
   `central.iam.user_has_operator_bypass`). A dedicated platform-staff capability
   (e.g. `billing:operate`) is a **deferred, Central-owned** follow-up; it needs a
   team-agnostic staff-seat notion that is Central's to define.

4. **Team identity is the Central `Team` DocType.** Billing's `team` field (a
   `Data` slug on 16 DocTypes) becomes a `Link → Team`. `User.billing_team` is
   removed; multi-team users select a current team (Central's existing mechanism).

5. **The dashboard UI is *not* migrated.** Central rebuilds the billing screens
   against the same whitelisted APIs; the Vue/Frappe-UI SPA, its `/billing` route,
   and the SPA shell are dropped at the boundary. The migration is **data model +
   business logic + API only**.

## Consequences

- **One identity model.** A team's `Owner`/`Billing` member sees and manages
  billing; `Viewer`/`Developer` cannot — consistent with how they see VMs/assets.
- **Access continuity requires a backfill.** Every user who could reach a team's
  billing before must become a `Team Member` of the matching `Team` with a
  billing-capable role, or they lose access at cutover.
- **License + type-annotation gates.** Moved files take Central's **AGPL-3.0**
  header (Billing was MIT), and every whitelisted method must be fully
  type-annotated — Central enforces `require_type_annotated_api_methods` at load.
- **Read/manage split is new.** Billing had one gate; endpoints must now be
  classified view vs manage.
- **The Agent app stays separate.** Only Central-side Billing becomes a module;
  the per-cluster `press_billing_agent` is unchanged. The "Central owns intent +
  money; Agent owns what ran" split (architecture.md) is preserved — "Central" is
  now literally the `central` app.

## Status

Accepted 2026-06-09. Implemented by issues **#41–#45**. Supersedes the standalone
role model documented in [security.md](../../security.md) §3a–§3b (kept as the
pre-merge description).
