# 41 — Vendor Billing into the Central app as a `billing` module

**Type:** HITL · **Milestone:** Central Merge (CM) · **Spec:** [ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md)

## What to build

Relocate the **backend** of the standalone `billing` app into the Central app
(`frappe/central`) as a first-class `billing` module, with **no behaviour
change**. This is the structural move that #42–#45 then build on. The dashboard
UI is **explicitly out of scope** — Central rebuilds it against the same APIs
(ADR 0004 §5).

## What to build (changes)

1. **Move the package:** `billing/` (the inner module) → `central/central/billing/`,
   keeping the internal tree intact (`api/ catalog/ revenue/ payments/ gateways/
   platform/ doctype/ demo/ tests/`).
2. **Rewrite imports** repo-wide: `billing.<x>` → `central.billing.<x>`.
3. **DocType module:** set every one of the 25 billing DocTypes' `module` to
   **"Billing"**; add `Billing` to Central's `modules.txt`.
4. **Do NOT move the UI:** leave behind `dashboard/` (Vue source + build),
   `billing/public/dashboard/` (built bundle), `billing/www/billing.html` (SPA
   shell), SPA-only `templates/`, and the `/billing/<path>` `website_route_rules`.
   The whitelisted endpoints under `api/dashboard/` + `api/admin/` **do** move —
   they are the contract Central's new UI consumes.
5. **License:** swap MIT → **AGPL-3.0** headers on every moved file (Central is
   AGPL).
6. **Type-annotation gate:** Central sets `require_type_annotated_api_methods =
   True` and `export_python_type_annotations = True`. Add full parameter + return
   annotations to **every** `@frappe.whitelist()` billing method, or the app will
   not load. Budget for the full API surface (`api/dashboard/*`, `api/admin/*`,
   `payments/webhooks.py`, `platform/sync.py`, gateway whitelisted methods).
7. **Compat shim (transitional):** keep billing's own `platform/security.py`
   working during this slice so the existing suite stays green; #42 removes it.

## Acceptance criteria

- [ ] The billing module lives under `central/central/billing/`; `central` boots
  with it installed.
- [ ] No `billing.` imports remain; all resolve under `central.billing.`.
- [ ] All 25 DocTypes report module **Billing**; `bench migrate` is clean.
- [ ] No SPA assets, `/billing` route, or `www` shell were carried over.
- [ ] Every whitelisted billing method is fully type-annotated; the app loads
  under Central's annotation gate.
- [ ] The full billing test suite (run under Central) is green via the compat shim.

## Decisions baked in

- **Backend-only migration; UI rebuilt by Central** (ADR 0004 §5).
- **AGPL on merge** — the moved files adopt Central's license.

## Blocked by

— (first slice of the merge; depends only on the merge decision, ADR 0004).
