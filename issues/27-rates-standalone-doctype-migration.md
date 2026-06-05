# 27 — Collapse Plan/Add-on rates into one `Catalog Rate` DocType (Item Price style, Dynamic Link) + data migration

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

Replace the two child tables (`Plan Rate` on `Plan`, `Add-on Rate` on `Add-on`) with **one** standalone DocType, **`Catalog Rate`**, mirroring ERPNext's single `Item Price` table. Each row links its parent via a **Dynamic Link** — `priced_doctype` (Link → DocType, validated to {`Plan`, `Add-on`}) + `priced_for` (Dynamic Link) — and carries `cluster` (`Data`), `currency` (Link → Currency), `rate`. One table prices both bundles and add-ons; no `Plan Rate` + `Add-on Rate` duplication. This keeps plan/add-on identities immutable, lets a rate be created/edited/queried/permissioned on its own, makes "add a region/currency" a new **document**, and lets the `Plan`/`Add-on`/`Currency` forms surface rates via dashboard **connections**.

A data-migration patch is already drafted (`press_billing/patches/v01_rates_to_standalone/`, dormant/commented in `patches.txt`); it needs **reworking** for the single-table model (see below) before it can ship.

## What to build (changes)

1. **New DocType `Catalog Rate`** (standalone): `priced_doctype` (Link → DocType, options filtered/validated to Plan + Add-on), `priced_for` (Dynamic Link → `priced_doctype`), `cluster` (`Data`), `currency` (Link → Currency), `rate` (Currency); `autoname` `{priced_for}-{cluster}-{currency}` (cluster omitted when global); uniqueness on `(priced_doctype, priced_for, cluster, currency)`.
2. **Remove** the old `Plan Rate` / `Add-on Rate` child DocTypes and the `rates` child field from `plan.json` / `add_on.json`.
3. **Call sites** that read `self.rates` / `doc.rates` → query `Catalog Rate`: `plan.py`, `add_on.py`, `admin.py` (`change_plan_rate`), `metering.py`, `demo.py`, `demo_scenarios.py`, `tests/utils.py`, and tests in `test_admin` / `test_plans` / `test_pricelock`. `pricing.resolve_rate(rate_rows, …)` signature stays; feed it the query result.
4. **Connections:** `*_dashboard.py` for `Plan` → `Catalog Rate` (dynamic link, `priced_doctype = Plan`) + price-lock; `Add-on` → `Catalog Rate` (`priced_doctype = Add-on`); `Currency` → `Catalog Rate`.
5. **Rework + activate the migration patch:** merge **both** legacy child tables into `Catalog Rate`, setting `priced_doctype` = `Plan`/`Add-on` and `priced_for` = the old `parent`. The pre-sync snapshot already captures `parent`; the post-sync rebuild must `insert` new `Catalog Rate` docs (the rows can't be renamed in place across tables) and delete the legacy `tabPlan Rate` / `tabAdd-on Rate` data. Keep it idempotent. Then uncomment the `patches.txt` entries (ship with 1–2).

## Acceptance criteria

- [x] One `Catalog Rate` DocType prices both Plan and Add-on via the dynamic link; no `Plan Rate` / `Add-on Rate` child tables remain.
- [x] `Plan` / `Add-on` no longer carry a `rates` child table; `as_pricing` / `get_rate` / sync push read `Catalog Rate` and produce the same output as before.
- [x] `bench migrate` on a populated site converts all existing child rows into `Catalog Rate` docs (`{priced_for}-{cluster}-{currency}`), preserving `cluster` / `currency` / `rate`; idempotent and re-runnable.
- [x] `Plan`/`Add-on`/`Currency` dashboards show their related `Catalog Rate` documents via connections.
- [x] Full `press_billing` test suite green.

**Status: done** (2026-06-05) — migrated `billing.local` (67 Plan + 4 Add-on rows → 71 `Catalog Rate` docs; legacy tables dropped); 229/229 tests pass.

## Decisions baked in

- **`cluster` stays `Data`** for now (no `Cluster` dependency); existing free-text region keys (`eu-frankfurt`, `in-mumbai`, …) are preserved as-is. Upgrade to `Link → Cluster` is a later, separate change once a `Cluster` DocType exists.
- **Single table over two** (Dynamic Link), per the `Item Price` analogy — chosen 2026-06-05.

## Blocked by

01 (catalog scaffold — the DocTypes this reshapes).
