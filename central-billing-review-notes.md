# central/billing — review notes (for a future iteration)

A module sweep done after the composable-pricing work (#79–#84). These are
**mismatches and debt to fix next**, not blockers — ranked by consequence, each with
where it lives and a suggested fix. Companion to [catalog-pricing-decisions.md](catalog-pricing-decisions.md).

The module is in good shape overall: no `TODO/FIXME` debt markers, no raw `frappe.db.sql`
in production (reads use `frappe.qb`), authz is consistent, and the change ledger is
append-only. The items below are the seams worth tightening.

---

## 1. Price Lock ↔ Subscription Change duality is half-migrated (highest)

[ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) folded the price-lock
into the `Subscription Change` ledger, but only the **write** path moved. `Price Lock` is
still the **read** source in production:

- `api/dashboard/account.py:184,218` — "resources used" counts active `Price Lock` rows.
- `api/admin/_shared.py:69` (`_active_locks`) — admin cluster/plan consumption.
- `api/admin/catalog.py:25` — a plan's `active_resources`.
- `api/dashboard/_shared.py:52,62` — `_team_clusters` and the currency fallback.
- `revenue/pricelock.py` — the whole legacy agent lock path + discrepancy fields
  ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) says retire these).
- `catalog/subscriptions.py::reconcile_subscription_resource` reads `Price Lock`.

**The concrete bug this creates:** a **composed** subscription writes *no* `Price Lock`
(only a `Subscription Change`). So composed servers are **invisible** to every reader above —
undercounted in "resources used", missing from admin consumption and `_team_clusters`, and
skipped by the currency fallback. Meanwhile #83 moved `get_eligible_plans`' run-rate onto the
ledger, so the catalog now has **two different "what is this team running" computations** that
disagree for composed configs.

**Fix:** finish [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md) —
migrate every `Price Lock` read to the `Subscription Change` ledger (a shared
`team_active_segments(team)` helper), backfill remaining locks, then drop the `Price Lock`
doctype, `revenue/pricelock.py`, and the discrepancy fields. One source of truth for "what's
running".

## 2. N+1 in `team_run_rate` on a hot read

`catalog/subscriptions.py:333` sums `current_segment_rate(s)` (`:317`) — **one query per
subscription** — and is called from `get_eligible_plans` (frequent customer read) and from
every provision/resize. Regresses an N+1 the original `get_eligible_plans` deliberately
avoided. **Fix:** one batched query of the team's rate-bearing changes ordered by
`(subscription, effective_at desc, creation desc)`, pick the first per subscription in Python.
(Folds naturally into #1's shared helper.)

## 3. `memory_ratio` is a redundant second source for the ratio

[ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)/#81 made
numeric `ram_ratio` authoritative, but the legacy `memory_ratio` Select is still carried and
read in `catalog/configurator.py`, `catalog/taxonomy_setup.py`,
`doctype/plan_configurator/plan_configurator.py`, `doctype/plan_sub_category`. Two fields that
must agree = a drift risk. **Fix:** derive the `1:N` label from `ram_ratio` everywhere and drop
`memory_ratio` (a small patch + the configurator's own ratio field).

## 4. Component rate card authoring is split (ADR 0011, not yet implemented)

Plan rates go through the Plan Configurator; the component card goes through a seed +
`update_component_rate`. This already caused a real incident (an incomplete USD card → a
`$0` design-your-own estimate). Decision is recorded in
[ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md); implementation
pending — fold component-card authoring into the Configurator and make its pricing step
capture all shipped currencies inline.

## 5. `Plan.includes` is optional but shouldn't be

`is_metered_single_resource()` keys off `len(includes) == 1`; an empty composition is a price
with no subject. Decided in principle (every Plan declares what it bills). **Fix:** set the
`includes` Table field `reqd: 1` + a clear validate message. Low effort.

## 6. Money model mismatch — ADR 0003 vs reality

[ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) calls for integer minor units, but
`Catalog Rate.rate` is a `Currency` (float) and live data uses fractional **major** units
(e.g. `0.12`/vCPU, `0.8` overage). The "minor units" wording in issues #79/#80 is aspirational,
not what's stored. **Fix:** reconcile — either move money to integer minor units as ADR 0003
intends (a real migration across rates/invoices), or amend ADR 0003 to record that rates are
major-unit Currency. Today the ADR and the code disagree.

## 7. Composed-config input validation is implicit (hardening)

`validate_composition` constrains `Compute/Memory/Disk` but doesn't reject **foreign resource
types** or **non-positive quantities** in a composed `includes` payload — it leans on "unpriced
→ rejected" to filter junk. MANAGE-gated, so low severity, but make the invariant explicit:
reject `resource_type ∉ {Compute, Memory, Disk}` and `quantity ≤ 0` up front. Also the RAM
check uses float equality (`flt(ram) != flt(expected)`) — safe for the current integer-ratio /
power-of-two ladder, latent if a fractional ratio is ever introduced; add a tolerance or assert
integer ratios.

## 8. Patches lack isolated tests

Backfill patches (v23 ram_ratio/bounds, v24 vCPU ladder, and earlier ones) ran clean on the dev
site but have no tests asserting the **mapping** on a populated table — the highest-risk,
least-tested area. **Fix:** a small test per data patch (before→after on seeded rows).

## 9. Intentional mid-request commit (note only)

`payments/payments.py:88` commits a freshly-minted Gateway Customer id mid-request (guarded by
`not frappe.in_test`, documented) so a later failure can't orphan it. It does break request
atomicity by design — acceptable and acknowledged, but worth keeping on the radar if that path
grows.

## 10. Admin workspace is doctype-first + lists retired doctypes

`workspace/billing/billing.json` is organised by doctype and still links `Trust Tier` and
`Price Lock` (retired). Addressed by [ADR 0012](docs/adr/0012-catalog-administration-verb-first-desk-workspace.md)
(verb-first redesign); until then it mis-advertises the schema.

---

## Suggested order

1. **#5** enforce `Plan.includes ≥ 1` (tiny, removes ambiguity).
2. **#1 + #2** complete the ADR 0010 migration with a shared, batched `team_active_segments`
   helper — kills the composed-invisibility bug *and* the N+1 together, and retires Price Lock.
3. **#4** implement ADR 0011 (Configurator authors the component card).
4. **#10** build the ADR 0012 workspace on top.
5. **#3, #7, #8** cleanups alongside; **#6** decide the money model deliberately.
