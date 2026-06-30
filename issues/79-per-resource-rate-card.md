# 79 — Per-resource rate card: price `Resource Type` via `Catalog Rate`

**Type:** AFK · **Milestone:** CC · **Spec:** [final-plan-pricing.md §5.2/§6](../final-plan-pricing.md), [plan-writeup.md §6.5](../plan-writeup.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)

## What to build

Make a `Resource Type` a **priceable** target so a composed config can be summed from its
parts. This reuses the existing `Catalog Rate` spine — no new rate doctype, no new resolution
path.

- `Catalog Rate.priced_doctype` admits `Resource Type` alongside `Plan`; `priced_for` Dynamic-Links
  to a `Resource Type` (`Compute`, `Memory`, `Disk`). The row's `rate` is a per-unit rate in rate
  units (`$/vCPU`, `$/GB`) — see [ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md).
- Resolution for a `(Resource Type, currency, cluster)` is **regional-over-global**, identical to a
  plan rate: prefer the row whose `cluster` matches, else the blank-cluster (global) row.
- Seed a starter **rate card** (Compute / Memory / Disk) per shipped currency and the global
  default, so a composed config can be priced end-to-end.
- An admin endpoint to set/edit a component rate — a sibling of
  `central.billing.api.admin.catalog.update_plan_rate` (same shape: resource type, currency, rate,
  cluster). Changing a component rate is one document edit and does not touch running configs (the
  grandfathering rule is enforced by the lock in #80).

## Acceptance criteria

- [ ] A `Catalog Rate` row can be created with `priced_doctype = Resource Type`, `priced_for = Compute`, a currency, an optional cluster, and a per-unit rate.
- [ ] Resolving a component rate for `(Compute, INR, ap-south-1)` prefers the regional row and falls back to the blank-cluster global row; missing currency ⇒ no rate (not zero).
- [ ] Compute / Memory / Disk component rates are seeded for the shipped currencies + global default.
- [ ] The admin endpoint sets a component rate; the change is a single document edit, creates no plans, and (verified in #80) leaves locked running configs unaffected.
- [ ] Test: resolve `Σ(qty × component_rate)` for `2 vCPU · 4 GB · 40 GB` against the seeded card and assert the expected total in minor units.

## Blocked by

- [#27](27-rates-standalone-doctype-migration.md) (the `Catalog Rate` Dynamic-Link spine)
- [#75](75-catalog-taxonomy-masters.md) (the `Resource Type` master being priced)
