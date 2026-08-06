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

**Scale is the real work, and it decides the shape.** A Frappe Query Report executes inside the web
request. Every other billing report gets away with that because it aggregates rows that already exist;
this one *computes* per team. At a few thousand teams that is tens of minutes inside a request with a
two-minute timeout — it does not degrade, it dies.

So the report does not compute. **Materialise the summary; compute the detail on demand.**

- A background batch projects the cohort page by page — the monthly run's own keyset paging — and
  writes **one scalar summary row per team**: projected total per currency, measured/estimated split,
  shortfall, derived outcome, suspension date. About a kilobyte a row, so several thousand teams is a
  few megabytes a batch.
- The report is an **ordinary read** over those rows: instant, sortable, filterable, exactly like every
  other report in the module.
- Drilling into a team computes the **full detail live, for that one team** — a fraction of a second,
  genuinely interactive. Per-team detail is never stored, because it is never needed in bulk.
- Every row carries its batch's as-of timestamp, so last night's picture is never mistaken for now.

A **synchronous fast path** covers small filtered cohorts (a configurable threshold, order of a couple
of hundred teams) so the common "show me the INR credits-only teams" question does not wait for a
batch.

Each page opens **its own read-only transaction**. One transaction held across the whole cohort pins
the InnoDB undo log for minutes and drags on every other query on the box; a read-only commit costs
essentially nothing, and the only thing surrendered is cross-page snapshot consistency — meaningless
for an output stamped as-of a moment.

None of the monthly run's bottlenecks apply here, which is why this scales the way it does: a
projection inserts nothing (no `tabSeries` lock), calls no gateway (no concurrency cap), and locks no
wallet. Per-team state is independent, so the work is linear in teams and scales with workers.

Batching matters in one place especially: the metered estimator's trailing history must be **one
grouped query per page**, not one per team. Written naively it is thousands of extra queries a batch.

## Acceptance criteria

- [ ] A background batch projects a cohort page by page, using the run's keyset paging, and persists
      one summary row per team.
- [ ] Report `Billing Projection` reads persisted rows and performs no projection of its own;
      filterable by currency, country, cluster, trust tier, collection mode and standing.
- [ ] Money is split per currency; no column, tile or total mixes currencies.
- [ ] Each row carries the derived outcome, the measured/estimated split, and where entailed the date
      the team would be suspended.
- [ ] Every row displays the as-of timestamp of the batch that produced it.
- [ ] Each page opens and closes its own read-only transaction; no transaction spans the cohort.
- [ ] Persistence happens outside the read-only transaction and touches only projection DocTypes.
- [ ] A filtered cohort below the configured threshold projects synchronously with progress feedback;
      above it, the batch is enqueued and the user is told.
- [ ] The metered estimator issues one grouped history query per page — a test asserts query count
      does not grow with teams per page.
- [ ] Clicking a row opens the Simulator page for that team, computing full detail live under the same
      scenario.
- [ ] Batches are pruned on a retention window rather than accumulating.
- [ ] Linked from the Billing workspace under the reporting group.
- [ ] Verified at scale: a synthetic cohort of several thousand teams completes without timeout, and
      its summary rows reconcile with individually computed per-team projections.

## Blocked by

- [#92](92-project-one-team-next-month.md)
- [#93](93-derived-payment-outcomes.md)
