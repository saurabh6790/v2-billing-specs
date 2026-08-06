# 98 — Price-change what-if: grandfathered vs repriced

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The scenario ops most wants to run, and the one they will get most wrong without help.

A price change **does not reprice existing subscriptions**. The rate is snapshotted as `locked_rate`
on each Subscription Change row ([ADR 0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)),
so raising a Catalog Rate touches new provisions and resizes only. Ask anyone outside the team what a
20% rise does to next month's revenue and they will multiply the current book by 1.2. They will be
wrong by roughly everything — and a simulator that modelled it that way would encode the exact
misconception it exists to dispel.

So a simulated rate change is modelled the way the real one behaves: **the new rate opens new segments
from date *D* forward**, applying only to subscriptions created or resized after *D*. Everything else
stays on its locked rate. Results split accordingly:

- **Grandfathered** — subscriptions still billing at their locked rate, unaffected.
- **Repriced** — subscriptions that provisioned or resized after *D* and picked up the new rate.

On a stable book this correctly reports a near-zero month-one impact that grows over quarters, which
is the honest answer and the one worth showing.

Live-priced add-ons are the deliberate exception: their rate is read from the current Catalog Rate each
period rather than locked, so a rate override reaches them immediately. The projection must show that
difference rather than smooth it away.

## Acceptance criteria

- [ ] A scenario can override a Catalog Rate for a `(priced_for, cluster, currency)` from an effective
      date.
- [ ] Existing subscriptions keep their locked rate; the override applies only to segments opened on
      or after the effective date.
- [ ] Projection output separates grandfathered from repriced revenue, per currency, with the counts
      of subscriptions in each.
- [ ] Live-priced add-ons pick up the overridden rate in the next projected period, and are shown as
      distinct from grandfathered bundles.
- [ ] A composed config re-prices from the overridden component rate card only when it resizes after
      the effective date.
- [ ] A rate rise on a book with no churn projects a materially smaller month-one delta than a naive
      multiplication, and the output makes the reason legible.

## Blocked by

- [#97](97-billing-scenario-and-overrides.md)
