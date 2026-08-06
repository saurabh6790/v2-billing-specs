# 96 — Cohort projection: the Billing Projection report

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Projection across a filtered cohort rather than one team — the view that answers *which* teams are
about to fail, not just whether this one will. One row per team, drilling through to the Simulator
page.

Filters come from data already held: currency and country from the Billing Profile, cluster/region via
each subscription's asset, plus trust tier, collection mode and `account_standing`. A team running in
two regions legitimately appears under both.

Columns: projected total (measured/estimated split), credit balance, shortfall, settlement source,
next charge date, the derived outcome from #93, and the suspension date where one is entailed. Money
splits into **per-currency columns** using the existing report currency helper — an INR and a USD
projection are never summed into one figure.

**Scale is the real work.** A synchronous projection over the book will time out, and a single
read-only transaction held across it pins the InnoDB undo log for minutes and drags on every other
query on the box. So: page the cohort with the monthly run's own keyset paging, run pages as
background jobs, and give **each page its own read-only transaction**. A read-only commit costs
essentially nothing, and the only thing surrendered is cross-page snapshot consistency — meaningless
for an output stamped as-of a moment.

## Acceptance criteria

- [ ] Query report `Billing Projection`, one row per team, filterable by currency, country, cluster,
      trust tier, collection mode and standing.
- [ ] Money is split per currency; no column, tile or total mixes currencies.
- [ ] Each row carries the derived outcome and, where entailed, the date the team would be suspended.
- [ ] Cohort projection pages via the run's keyset paging and executes as background jobs.
- [ ] Each page opens and closes its own read-only transaction; no transaction spans the cohort.
- [ ] Clicking a row opens the Simulator page for that team with the same scenario applied.
- [ ] Linked from the Billing workspace under the reporting group.
- [ ] Verified against the demo dataset: the run completes without timeout and totals reconcile with
      per-team projections.

## Blocked by

- [#92](92-project-one-team-next-month.md)
- [#93](93-derived-payment-outcomes.md)
