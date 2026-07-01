# 88 — ADR 0012: verb-first catalog administration Desk workspace

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md](../catalog-pricing-decisions.md) · **ADR:** [0012](../docs/adr/0012-catalog-administration-verb-first-desk-workspace.md)

## What to build

Replace the doctype-first Billing workspace with a **verb-first** one for the accounts team
(laypeople in Desk). Actions are phrased as tasks, not tables; the Plan Configurator is the front door.

- Verb shortcuts — *Launch a plan*, *Launch an add-on (metered)*, *Update prices*, *Retire a
  plan/add-on* — each opening the Configurator (retire → a filtered `Plan` list with deactivate).
- A short "how it works" block stating the model in plain words on the page.
- An *Add-ons (metered)* list/report showing each offering's **allowance** (`Plan Includes.quantity`)
  and **overage per currency** (`Catalog Rate`) as one row.
- Demote masters (`Plan Category`, `Plan Sub-Category`, `Resource Type`, `Catalog Rate`) under an
  *Advanced* group; prune retired links (`Trust Tier`, `Price Lock`) so the workspace stops lying.
- The Configurator stays the only write path; the workspace is navigation + visualisation over it.

## Acceptance criteria

- [ ] The Billing workspace fixture (`workspace/billing/billing.json`) leads with the verb shortcuts,
      each wired to the Configurator (or filtered list for retire).
- [ ] The "how it works" block renders on the workspace.
- [ ] The *Add-ons (metered)* list/report shows allowance + per-currency overage together, one row per
      metered add-on.
- [ ] Masters are under an *Advanced* group; no link to `Trust Tier` or `Price Lock` remains.
- [ ] Demo path works: open workspace → click a verb → fill one Configurator form → the offering
      appears in the at-a-glance list (~30s, no doctype archaeology).

## Blocked by

- [#86](86-finish-adr0010-pricelock-read-migration.md) (so `Price Lock` is actually retired before its
  workspace link is pruned)
- [#87](87-configurator-authors-component-rate-card.md) (the all-currency Configurator step that makes
  *Launch a plan* a single form)
