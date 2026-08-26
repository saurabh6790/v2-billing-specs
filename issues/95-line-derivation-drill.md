# 95 — Line derivation drill: why each line is that amount

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The feature that makes the simulator a debugging tool rather than a pretty picture. For any line on a
projected invoice, show the derivation that produced the amount — and answer the support ticket
"why was I charged this" without reconstructing it backwards by hand.

The line engine already computes all of this structure and then collapses it into a single `amount`.
This slice stops throwing it away:

- which **Subscription Change** segments the line came from, each with its `effective_at`,
  `locked_rate` and the config it opened;
- whether the date billed **daily or hourly**, and if hourly, *why* — a segment held under the churn
  window turns every date it touches into an hourly date, and the daily and hourly passes partition
  the period so the total stays exact;
- for metered lines, **quantity vs allowance vs overage**, the locked terms the rollup carried, and
  (for a projected month) the trailing history the estimate came from;
- the commitment adjustment and the tax block as applied to *this* invoice, not in the abstract.

Ops should be able to read a hourly-billed date off the screen and understand that the customer
resized twice in a day, without knowing what `CHURN_WINDOW_HOURS` is.

## Acceptance criteria

- [ ] Every projected line can be expanded to its derivation: contributing segments, their locked
      rates and effective dates, the day/hour denominators, and the arithmetic.
- [ ] A churn (hourly) date shows which segments touched it and why the date became hourly.
- [ ] Metered lines show quantity, allowance, overage and the terms used; estimated ones show the
      history the estimate was drawn from.
- [ ] Daily and hourly portions visibly partition the period — the drill demonstrates no date is
      billed twice.
- [ ] The derivation is produced by the same computation that produced the amount, not recomputed
      alongside it.
- [ ] A resize-twice-in-a-day team renders a correct and legible derivation end to end.

## Blocked by

- [#92](92-project-one-team-next-month.md)
