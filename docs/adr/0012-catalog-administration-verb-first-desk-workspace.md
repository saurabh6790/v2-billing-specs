# Catalog administration is a verb-first Desk workspace

Date: 2026-06-30

[ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md) made the Plan
Configurator the single tool that prices the catalog. But the people who *run* the
catalog day to day are the **admin and accounts team, in the Frappe Desk** — laypeople
with no model of the underlying doctypes, who live in Desk far more than the customer
console. For them the question is never "which doctype holds the overage rate?"; it is
"how do I spin up — or take down — a plan or add-on?"

Today's Billing workspace answers the wrong question. It is **doctype-first**: shortcuts
to two dozen lists grouped by area (`Plan`, `Catalog Rate`, `Subscription`, …), several of
them now retired (`Trust Tier`, `Price Lock`). To create one offering an admin must *know*
that "a plan = `Plan` + `Plan Includes` + `Catalog Rate`" and edit three docs in the right
order. That memorisation is the operational risk — it is slow, error-prone (the half-filled
component card that produced a `$0` estimate), and undemoable.

The tool to remove the burden already exists: the **Plan Configurator** is a single guided
form that writes a bundle (`rungs`), a metered add-on (`simple_plans`), *and* its prices
(`base_rates`) in one place. What is missing is the framing that points the accounts team at
it.

## Decision

**The catalog is administered through a verb-first Desk workspace whose front door is the
Plan Configurator. Actions are phrased as tasks, not tables; the underlying doctypes are not
the entry point.**

- **Verb-first actions.** The workspace leads with task shortcuts — *Launch a plan*,
  *Launch an add-on (metered)*, *Update prices*, *Retire a plan/add-on* — each opening the
  Plan Configurator (or, for retire, a filtered `Plan` list with deactivate). A layperson
  fills **one guided form**, never three raw doctypes.

- **The mental model lives on the page.** A short "how it works" block states the model in
  plain words (*a Plan is something you sell, in a Family; it lists what's included and its
  price per currency; a metered add-on includes an allowance, then charges per unit over
  it*), so nothing has to be memorised.

- **Metered add-ons read as one row.** A dedicated *Add-ons (metered)* list shows each
  offering's **allowance** (from `Plan Includes.quantity`) and **overage per currency**
  (from `Catalog Rate`) together — the scattered truth surfaced as a single line, so "what
  does Email include and cost over that?" is answerable at a glance.

- **Masters are demoted, retired links pruned.** `Plan Category`, `Plan Sub-Category`,
  `Resource Type`, and `Catalog Rate` move under an *Advanced* group for power users;
  retired doctypes (`Trust Tier`, `Price Lock`) are removed so the workspace stops lying.

- **The Configurator stays the only write path** ([ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md)).
  The workspace is the navigation-and-visualisation layer over it, not a second authoring
  surface.

## What does not change

The model, doctypes, storage, and resolution are untouched
([ADR 0007](0007-polymorphic-catalog-category-masters.md)/[0008](0008-add-on-as-metered-single-resource-plan.md)/[0009](0009-composable-resource-pricing-design-your-own-config.md)/[0011](0011-plan-configurator-is-the-single-pricing-authority.md)).
This is an admin information-architecture decision — how the catalog is *navigated and
authored by humans* — not a data change. The customer-facing console picker
([issue #84](../../issues/84-customer-config-slider-ui.md)) is a separate surface for a
separate audience and is unaffected.

## Consequences

- **Two small enablers** make the one-form promise real: the Configurator's pricing step
  should capture **every shipped currency inline** (so *Launch a plan* never bounces to
  `Catalog Rate`), and a small **"Add-ons (metered)" report/Quick List** powers the
  at-a-glance line. Both are in service of [ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md).

- **Demoability becomes a property of the system**: open the workspace → click a verb →
  fill one form → the offering appears in the at-a-glance list. ~30 seconds, no code, no
  doctype archaeology.

- **Audiences are cleanly split**: the accounts team in Desk (this workspace) vs the
  customer in the console (the slider picker). Each sees only its own flow.

- The workspace is a **fixture** (`central/billing/workspace/billing/billing.json`); it must
  be kept in step as families and offerings evolve.

## Considered and rejected

- **A bespoke Frappe-UI "Catalog Studio" SPA** (a console-style single page for the whole
  catalog). Rejected for the admin audience: the accounts team lives in Desk, and the Desk
  workspace + the existing Configurator form already deliver the guided, demoable flow at a
  fraction of the build. Revisit only if admin needs outgrow what Desk can express.

- **Keep the doctype-first workspace and train the team.** Rejected: the memorisation burden
  is the recurring risk we are trying to remove, and training does not survive turnover.

## Supersedes / amends

- Complements [ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md): single
  authoring authority (the Configurator) now has a single navigational front door (the
  workspace).
- Replaces the doctype-first layout of the Billing workspace
  (`central/billing/workspace/billing/billing.json`).
