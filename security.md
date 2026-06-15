# Security

## Purpose

The living security standard for Frappe Cloud v2 Billing. Two audiences, one document:

- **Build by it** — every new endpoint, gateway, money path, or token must satisfy the relevant
  control here. The "How to extend safely" section is the checklist you follow *before* writing code.
- **Audit against it** — the **Audit checklist** (§9) is a concrete, mostly greppable set of checks a
  reviewer (human or agent) runs to confirm the controls still hold. Each check names the real seam
  it verifies, so an audit is reproducible, not vibes.

This is not generic OWASP boilerplate. It is keyed to *this system's* surfaces and to the specific
v1 failures v2 was built to close. Where a control lives in code, the canonical module is named —
keep this doc in sync when that seam moves.

> Scope: the **Cloud Billing** module inside Central. The Frappe framework's
> own hardening (CSRF tokens, session cookies, password hashing) is assumed and not re-specified;
> this doc covers the billing-domain controls layered on top.

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is no Subscription Agent and no signed Entitlement Token. The trust boundary that mattered (Central ↔ Agent, offline token verification) is replaced by an **outbound Central → cluster manager** integration: Central holds the cluster-manager credential and calls it to provision/stop/terminate. §2 and §5 are updated accordingly.

## 1. What v1 got wrong (the threat baseline)

v2's security posture is defined by the breaches v1 actually suffered ([architecture.md](architecture.md)).
Every one maps to a standing control; an audit's first job is proving each stays closed.

| v1 failure | Class | v2 control (canonical seam) | §  |
|------------|-------|-----------------------------|----|
| Webhook signature checked *after* DB lookup → order-ID enumeration | Broken auth / IDOR | Signature-first, before any DB access | §3 |
| Credit double-spend under concurrency | Race / integrity | `SELECT … FOR UPDATE` on the wallet anchor | §4 |
| Prepaid credits as a scalar field → negative, unauditable balances | Integrity / audit | Append-only ledger, balance = sum | §4 |
| SQL injection | Injection | QueryBuilder / parameterised `%s` only | §6 |
| "Pay Now" on locked invoices, no state machine | Logic / integrity | Webhook-driven state machine, idempotency | §4 |
| Billed for things that weren't running | Integrity | Bill from Central-recorded runtime (written as it provisions), not bare intent | §2 |
| Float money drift | Integrity | Integer minor units ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) | §4 |

## 2. Trust boundaries

Draw the boundaries first; every control is "what crosses this line, and how is it checked."

```
   Browser / Customer ──┐                       ┌── Payment Gateway (Stripe/Razorpay)
     (PCI: PAN never        │   HTTPS + role        │     signed webhooks ↑↓ idempotent charges
      reaches our server)   ▼   + team scope        ▼
                      ┌──────────────────────────────────┐
                      │   Cloud Billing (Central module)  │  ← sole money SOR, sole gateway caller
                      │   roles · ledgers · keys          │
                      └───────┬─────────────────┬─────────┘
        provision / stop /    │ (outbound,      │  one-way, async
        terminate (calls)     ▼  authed)        ▼
                      ┌──────────────────────┐   ┌─────────────────────────┐
                      │  Cluster Manager      │   │  ERPNext (statutory SOR;│
                      │  (per region)         │   │  never writes back)     │
                      └──────────────────────┘   └─────────────────────────┘
```

**Boundary rules:**

- **Central ↔ Gateway** — the *only* component that holds gateway credentials or calls a gateway.
  Inbound is signature-first (§3); outbound is idempotent (§4).
- **Central → Cluster Manager** — an **outbound** integration: Central holds the cluster-manager
  credential and calls it to provision/stop/terminate, and reads operational state back. The cluster
  manager holds *no* gateway keys and *no* money logic. The cap is enforced **by Central before it
  calls** (§5) — there is no signed token to verify and no offline trust placed in the cluster.
- **Browser ↔ Central** — every request is authenticated, role-gated (§3a), and **team-scoped**
  (§3b). Card data never transits Central (PCI, §7).
- **Central → ERPNext** — one-way, async, never blocking; ERPNext cannot write back into the money
  SOR ([erpnext-async-sync](issues/17-erpnext-async-sync.md)).

## 3. Authentication & authorisation

> **Authz model by deployment.** Standalone, Billing gates on its own two Frappe roles (§3a-i).
> Merged into the **Central** app (the target — [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md),
> issues [#42](issues/42-adopt-central-capability-iam.md)/[#43](issues/43-team-link-to-central-team-migration.md)),
> it gates on Central's **capability IAM** (§3a-ii) and defines no roles of its own. Either way the
> invariant holds: **every** customer/admin whitelisted endpoint funnels through one guard on its
> first line — the single authz seam; do not hand-roll checks elsewhere. An endpoint with no guard is
> a finding, not a style nit.

### 3a-i. Standalone roles — `billing/platform/security.py` (pre-merge)

- `Billing Admin` — cross-team admin surface. Gate with **`require_billing_admin()`** → `PermissionError`
  (HTTP 403) for anyone lacking the role.
- `Billing User` — a customer, scoped to exactly one team (the `User.billing_team` field). Gate with
  **`require_team_access(team)`**.
- `Administrator` / `System Manager` are treated as admin; this is intentional and must stay explicit
  (not an accidental wildcard).

### 3a-ii. Capability IAM — `central.iam` (post-merge, authoritative)

Central authorises per **team** via `central.iam.can(user, team, capability)`. Billing reuses two
capabilities already in Central's fixtures (`plane: central`, `resource: billing`), carried by the
system Team Roles `Owner` and `Billing` (never `Admin`/`Developer`/`Viewer`):

- **`billing:view`** — gates every customer **read** endpoint → `can(user, team, "billing:view")`.
- **`billing:manage`** — gates every **mutation** (pay, buy credits, edit methods/settings) →
  `can(user, team, "billing:manage")`. This view/manage split replaces Billing's single gate.
- **Cross-team admin** uses Central's **operator bypass** (`System Manager`,
  `user_has_operator_bypass`); a dedicated `billing:operate` platform capability is a deferred,
  Central-owned follow-up.

Any non-billing service principal holds neither capability, so `can(...)` returns False on every
customer/admin endpoint — billing exposes no inbound integration surface (the cluster-manager seam is
outbound: Central calls it, not the reverse).

### 3b. Tenant isolation (IDOR)

The customer dashboards take a `team` argument, but the team a caller may see is **always checked
server-side**, never trusted from the request — *"never silently widened."* This is the defence
against the v1-class enumeration of another tenant's invoices/ledger.

- **Standalone:** `require_team_access(team)` rejects any team that is not the caller's own
  (`get_user_team()` resolves membership from the session, never a client field).
- **Merged:** `can(user, team, "billing:view"|"billing:manage")` is the same check expressed as a
  capability; teams come from `central.iam.get_user_team_names(user)`. A multi-team user selects a
  current team, but every endpoint still re-checks `can(...)` — a passed team is never honoured
  without it.
- Passing another team's name → 403, not an empty result and not that team's data.
- Admin/operator browsing across teams is the *only* widening, and it requires the admin role /
  operator bypass.

### 3c. Webhook endpoints (the only `allow_guest`)

The two gateway webhook routes are unauthenticated by Frappe (no session) **by necessity** — the
gateway has no login. Their "authentication" is the HMAC signature (§3d). No other endpoint may be
`allow_guest=True`; adding one is a finding.

### 3d. Signature-first webhooks — `payments/webhooks.py`

The order of operations is itself a security control (it is what closed v1's enumeration bug):

1. Read **raw bytes** before any JSON parsing.
2. `adapter.verify_webhook_signature()` — the **first operation, before any DB access**. Fail → 400,
   **zero DB writes**.
3. Only then parse → `NormalisedEvent`.
4. Insert `Webhook Event` (unique on `gateway_event_id`) — replays fail silently, return 200.
5. Enqueue a background job. **No business logic runs in the HTTP request cycle.**

Parsing or DB lookup *before* signature verification is a regression of the v1 bug, regardless of
whether it "works."

## 4. Money integrity

Money correctness is a security property here, not just an accounting one.

- **Integer minor units only** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) — no
  `Currency`/float on money; conversion and rounding live solely in the `money` module. Eliminates
  the float-drift class and makes amounts byte-reproducible (the reconciliation job depends on it).
- **Append-only ledgers** — Credit Ledger Entry and Price-Lock are append-only; balances are
  **computed from sums**, never stored as a mutable scalar (the v1 negative-balance bug).
- **Concurrency** — credit application and any balance mutation take `SELECT … FOR UPDATE` on the
  wallet/invoice anchor (`revenue/credits.py`, `payments/charges.py`). These are the *only* sanctioned
  raw-SQL sites and exist because `FOR UPDATE` can't be expressed in QueryBuilder.
- **Idempotency everywhere** — outbound gateway charges carry `idempotency_key = payment_attempt.name`;
  inbound webhooks dedupe on `gateway_event_id`. A retry or replay can never double-charge or
  double-apply.
- **Paid only on webhook** — an invoice reaches `Paid` only on a verified capture webhook, never on
  the synchronous API response. A forged/optimistic "success" cannot settle an invoice.
- **State machines, not free mutation** — invoice and payment-attempt states advance only along their
  defined transitions; out-of-order or unmatched events are no-ops.

## 5. Provisioning cap enforcement

Central enforces the trust-tier cap **synchronously, in the provision call** to the cluster manager
([#07](issues/07-trust-tier-entitlement-token.md), [ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)). There is no signed token and no offline trust placed in the cluster.

- **Authoritative cap, checked by Central** — Central knows every live provision across all clusters
  (it makes each call), so it computes the team-wide total and **rejects an over-cap provision before
  calling the cluster manager**. No per-cluster slices, no signing.
- **Availability vs. integrity, made explicit** — if Central is unreachable, **no new provisions**
  happen, but **running resources are untouched**: the cluster manager stops a VM only on an explicit
  Central call, so an outage never harms a running resource.
- **Cluster-manager credential custody** — the outbound credential Central uses to call the cluster
  manager lives in Central's secret store (§6), is never logged, and is rotatable (§6). A cluster
  compromise yields no money capability and no ability to widen its own cap (Central decides).

## 6. Secrets management

- **Gateway API keys, webhook secrets, and the cluster-manager credential live in site config**
  (`common_site_config.json` / `site_config.json`), read via `frappe.conf` / encrypted-field
  `get_password()` — **never** hard-coded, never in the repo, never in a fixture or seed.
- **Never echo a secret** — not into logs, error messages, notifications, API responses, or test
  output. Webhook `raw_payload` is stored, but secrets are not in the payload.
- **Rotation** — every secret must be rotatable without a code change (config-driven). Webhook secret
  rotation supports an overlap window so in-flight events still verify.
- **Least privilege** — gateway keys are per-`Payment Gateway` config, scoped to the merchant account
  in use; the cluster-manager credential grants only provision/stop/terminate, no money operations.

## 7. PCI scope minimisation

- **The PAN never reaches our server.** Cards are tokenised in the browser — Stripe.js Elements
  against a SetupIntent, Razorpay Checkout — and only an opaque gateway token (`pm_…`, mandate id)
  is sent to Central ([payments.md](payments.md)). Central stores tokens and last-4/brand metadata,
  never the card number or CVV.
- A change that causes raw card data to transit or land in Central is a **PCI-scope expansion** and a
  hard stop — it must be designed out, not logged-around.

## 8. Input handling, injection & output

- **SQL** — QueryBuilder / the ORM for all queries; the only `frappe.db.sql` calls are the
  parameterised `FOR UPDATE` locks and migration patches, all using `%s` binds. **No f-string / `%`
  / `.format` interpolation into SQL, ever.** Enforced by `bandit` + a `grep` gate in CI ([#22](issues/22-security-load-hardening.md)).
- **Permissions on writes** — `ignore_permissions=True` is allowed only in system contexts (migrations,
  signed-webhook background jobs, role bootstrap) — never on a path reachable directly from a customer
  request. Each use should be justifiable.
- **Mass-assignment** — whitelisted endpoints accept named params; never blindly `update(**request)`
  a doc from client input.
- **Output** — money is rendered from integers at the edge; no secret or another team's data is ever
  serialised into a customer response (enforced by §3b scoping).

## 9. Audit checklist

Run this to audit the system. Each item is a control from above; most are greppable. A failing item
is a finding with a known fix location.

**Authentication / authorisation**
- [ ] Every `@frappe.whitelist()` billing method calls a guard (`require_billing_admin` /
      `require_team_access`) on entry. (Enumerate whitelisted methods; diff against guarded set.)
- [ ] `allow_guest=True` appears **only** on the two webhook routes.
- [ ] No role check is hand-rolled outside `billing/platform/security.py`.
- [ ] `get_user_team()` derives team from session/server, not from a request field.
- [ ] Customer endpoint with another team's id in the argument → 403 (test exists and passes).
- [ ] A principal with no billing capability hits any customer/admin endpoint → 403 (test exists).

**Webhooks**
- [ ] Signature verification is the first statement, before any parse or DB access; failure path does
      zero DB writes and returns 400.
- [ ] `Webhook Event` has a unique constraint on `gateway_event_id`; replay → 200, no side effects.
- [ ] No business logic executes in the request cycle (state transition is enqueued).

**Money integrity**
- [ ] No `Currency`/float fieldtype on any money column (grep the doctype JSON); money is `Long Int`
      per [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md).
- [ ] All `× factor` / `/ factor` / rounding goes through the `money` module — nowhere else.
- [ ] Every balance mutation is inside a `FOR UPDATE` block; no stored scalar balance.
- [ ] Outbound charges carry an idempotency key; concurrent charge of one invoice yields one capture.
- [ ] `Paid` is reachable only from a verified capture webhook, never the API response.

**Secrets**
- [ ] No gateway key, webhook secret, or cluster-manager credential in the repo, fixtures, seeds, or
      tests (grep for key-shaped strings + the config keys).
- [ ] No secret in logs / errors / notifications / responses.
- [ ] Each secret is config-driven and rotatable without code change.

**Provisioning enforcement**
- [ ] Over-cap provision is rejected by Central **before** the cluster-manager call (no token).
- [ ] Central unreachable → no new provisions, running resources untouched (test exists).

**Injection / input**
- [ ] Static analysis (`bandit`) clean; no string-interpolated SQL (grep gate green).
- [ ] `ignore_permissions=True` only on system paths, each justified.

**PCI / data**
- [ ] No raw PAN/CVV stored or logged anywhere in Central; only opaque tokens + last-4/brand.
- [ ] ERPNext sync is one-way; nothing writes back into the money SOR.

**Tenant isolation**
- [ ] Cross-team aggregates exist only on admin endpoints; customer endpoints are team-scoped end-to-end.

## 10. How to extend safely

Before writing code, find your change in this table and meet its obligation.

| You are adding… | Obligation |
|-----------------|------------|
| A whitelisted endpoint | First line calls `require_billing_admin()` or `require_team_access(team)`. Never `allow_guest` (except a gateway webhook, which is signature-gated). |
| A new gateway | Implement the adapter contract incl. `verify_webhook_signature`; keys go in `Payment Gateway` config; outbound charge is idempotent; nothing card-shaped reaches the server. |
| A money calculation | Use the `money` module for every conversion/round; store `Long Int`; mutate balances under `FOR UPDATE`; never settle on an API response. |
| A token / signed artifact | Sign in Central with the private key; verify with the public key; include expiry; never trust a client-widened cap. |
| A secret / credential | Site config + `get_password`/`frappe.conf`; rotatable; never logged or committed. |
| A customer-facing query | Team-scope through `require_team_access`; derive team from session; never from the client. |

## 11. Pre-launch gate & backlog

- **Pre-launch gate** — [issue #22](issues/22-security-load-hardening.md) is the gate that proves the
  v1 failure classes are closed (signature/replay tests, role/Agent-key 403s, SQL static analysis,
  concurrent-webhook flood with no duplicate transitions, load run). The §9 checklist generalises it
  into a repeatable audit.
- **Reconciliation** ([#21](issues/21-reconciliation-job.md)) is a security-adjacent control: it
  catches the "charged-at-gateway-but-never-webhooked" terminal state without double-charging — the
  integrity backstop for the one boundary we don't fully control.
- **Future hardening** (post-launch): per-endpoint rate limiting beyond webhook dedupe; signed Agent→
  Central usage push (not just transport auth); secret-rotation runbook + key-id audit log;
  automated secret-scanning in CI; a periodic re-run of §9 as a scheduled audit.

## Notes

- This doc is the security **standard**; per-feature security acceptance criteria live on their
  issues. When a control's canonical seam moves, update §1/§3–§8 references here in the same change.
- Terms (Central, Agent, price-lock, trust tier, minor unit) are defined in [CONTEXT.md](CONTEXT.md).
