# Central audit — remediation plan

Source: security audit of the Central control-plane billing surface (ssiyad gist,
2026-07). Verified line-by-line against `apps/central/central` on `develop` (HEAD
`6ac5246`). **All ten findings reproduce in the current code.** No false positives.

## The one root cause

Billing *service-layer primitives* carry `@frappe.whitelist()`. `@frappe.whitelist()`
is authentication (is there a logged-in session?), not authorization (may this session
act on this team?). Frappe does **not** implicitly gate a whitelisted method on the
caller's roles — verified against framework source in the audit (`handler.py`
`execute_cmd` runs only `is_whitelisted` + `is_valid_http_method`). The one implicit
backstop — billing doctypes being System-Manager-only — is disabled because every
primitive writes with `ignore_permissions=True` / raw `frappe.db.set_value`.

The guarded `api/dashboard/*` wrappers authorize correctly (`_resolve_team(team,
authz.MANAGE)` / `_require_manage`). The bug is that the primitives they wrap are
*independently reachable* over `/api/method/...`.

**Key fact that makes the fix cheap and safe:** I traced every flagged primitive.
Each is called internally only as a plain Python function — by its guarded wrapper,
by a sibling billing module (`charges`, `collection`, `settlement`), or by tests.
**No internal caller depends on the `@frappe.whitelist()` decorator.** Removing it
breaks nothing; it only closes the unguarded HTTP door.

## Validity + fix, per finding

| # | Finding | Sev | Valid? | Fix |
|---|---|---|---|---|
| 1 | `credits.purchase`, `credits.adjust_credits` — mint balance for any team | **Critical** | Yes | Remove `@whitelist`. `purchase` stays reachable via guarded `confirm_topup`. `adjust_credits` → new operator-gated admin wrapper. |
| 2 | Payment-method IDOR: `delete/set_default/reorder/initiate/confirm_payment_method` | **High** | Yes | Remove `@whitelist` from all five; guarded twins already live in `api/dashboard/methods.py`. |
| 3 | `charges.pay_invoice` — force a charge on any invoice | **High** | Yes | Remove `@whitelist`; add guarded wrapper (`_require_manage` on `inv.team`) for the "Pay now" button. `collection.py` calls it internally. |
| 4 | `confirm_topup` Razorpay branch credits client-supplied `amount` | **High** | Yes | Derive amount from the gateway on the Razorpay path (fetch the captured payment via the adapter), never trust the request figure — mirror the Stripe/PayPal branches. |
| 5 | `catalog.plans.create_configured_plan` — any user creates catalog Plans | Medium | Yes | Remove `@whitelist`; add `require_operator()` (operator-only catalog authoring). |
| 6 | `credits.get_balance` — discloses any team's balance | Medium | Yes | Remove `@whitelist`; balance is already served by a view-gated dashboard endpoint. Internal callers use the plain function. |
| 7 | `erpnext_sync.sync_invoice` — trigger sync for any Paid invoice | Medium | Yes | Remove `@whitelist`; `require_operator()` if a manual re-sync button is needed. |
| 8 | `admin/gateways.py` calls non-existent `authz.require` → `AttributeError` | Low | Yes | Replace all three `authz.require(authz.MANAGE)` with `authz.require_operator()`. Fails closed today, but the feature is dead. |
| 9 | Debug `print(f"gateway: {gateway}")` in `billing_api.py:196` | Low | Yes | Delete it. (Or `frappe.logger().debug` if genuinely wanted.) |
| 10 | 11× `frappe.set_user("Administrator")` without restore in `billing_api.py` | Low | Yes | Wrap in try/finally restoring the prior user, or scope with a context manager, so later permission-sensitive code in the request doesn't silently run as Administrator. |

Notes on the two that need more than decorator removal:

- **#4 (Razorpay amount)** is a real second bug, not subsumed by #1. Even after `purchase`
  is de-whitelisted, `confirm_topup` is a *legitimately reachable* endpoint (it correctly
  does `_resolve_team(team, MANAGE)`), so a team's own manager could pay ₹1 and self-credit
  ₹1,000,000. The Razorpay signature binds `order_id|payment_id`, **not** the amount. Fix
  requires an adapter call to read the captured amount server-side.
- **#10** is contained today (team bound to the pilot credential, records checked via
  `_assert_owns`) but is a latent footgun — treat as hardening, not emergency.

## Sequencing

1. **Hotfix branch, ship first:** #1 (credit minting) and #4 (Razorpay inflation).
   These are the only two with direct, trivially-exploitable financial impact. #1 is a
   pure decorator removal + one small admin wrapper; #4 is a localized adapter call.
2. **Same PR or fast follow:** #2, #3, #5, #6, #7 — the remaining de-whitelisting +
   two guarded wrappers (`pay_invoice`, catalog authoring).
3. **Hygiene PR:** #8, #9, #10.

Each step is guarded by the existing test suite — the primitives are called directly in
`billing/tests/*`, so a broken internal call surfaces immediately. Add one regression
test per exploit: a non-operator, non-member session calling each de-whitelisted method
must get `PermissionError`, and a Razorpay `confirm_topup` with a mismatched amount must
credit the gateway figure, not the request figure.

## Don't repeat this — make the invariant mechanical

The striking part: `security.md` **already** states this exact rule.

> §3: "every customer/admin whitelisted endpoint funnels through one guard on its first
> line — the single authz seam … An endpoint with no guard is [a bug]."
> §9 checklist: "Every `@frappe.whitelist()` billing method calls a guard on entry.
> (Enumerate whitelisted methods; diff against guarded set.)"

The rule existed and was violated anyway, because the check was **manual and never run**.
A prose standard nobody diffs against is not a control. Prevention = convert the checklist
line into an automated gate:

1. **CI lint / test that enumerates whitelisted billing methods and fails on any that
   lack a guard.** Walk `central/billing/**`, collect every function decorated with
   `@frappe.whitelist()`, and assert its source either (a) calls one of
   `require_billing_view / require_billing_manage / require_operator /
   require_capability` (or a dashboard helper `_resolve_team` / `_require_manage`) before
   any write, or (b) is on an explicit, reviewed allowlist (webhooks, which are
   signature-gated). Anything else fails the build. This is the checklist item as code;
   run it in CI so a new unguarded `@whitelist` can't merge.

2. **Structural rule: service-layer modules do not import `frappe.whitelist` at all.**
   The bug is that `credits.py` / `payments.py` / `charges.py` / `plans.py` — the *domain*
   layer — expose HTTP endpoints. Keep the seam clean: only `billing/api/**` may carry
   `@frappe.whitelist()`; everything under `billing/revenue`, `billing/payments`,
   `billing/catalog`, `billing/platform` is plain functions. A grep-based test
   (`@frappe.whitelist()` must not appear outside `billing/api/`) is trivial and catches
   the whole class at the layer boundary, not endpoint-by-endpoint.

3. **`ignore_permissions=True` is a load-bearing signal, not boilerplate.** It means "the
   caller already authorized this" — so it must only appear *below* a guarded entry point.
   The §9 checklist already asks for each use to be justified; fold that into the same CI
   walk (flag `ignore_permissions=True` reachable from a `@whitelist` function that has no
   guard).

4. **Review reflex to add to `security.md` §10 (extend-safely table):** a new
   `@frappe.whitelist()` in a domain module is not "add a guard" — it's "move it to
   `billing/api/`." The endpoint layer and the domain layer are different jobs.

Rule 2 is the highest-leverage single control: it makes the layer boundary the thing CI
enforces, so this specific mistake becomes structurally impossible rather than
checklist-dependent.
