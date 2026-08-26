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

This slice covers the **expensive** cohort question — what teams will be *billed*, which requires
rating each one. The cheap question ("who gets suspended, and when") scales with delinquency rather
than with the book and is [#104](104-collection-outlook-sweep.md); it is not subject to any of the
bounds below.

**Scale decides the shape, twice over.**

First, a Frappe Query Report executes inside the web request. Every other billing report gets away
with that because it aggregates rows that already exist; this one *computes* per team. At a few
thousand teams that is tens of minutes inside a request with a two-minute timeout — it does not
degrade, it dies. So the report does not compute: **materialise the summary; compute the detail on
demand.**

Second, and more importantly: **an unbounded cohort projection is not slow, it is impossible.** At a
few lakh teams a six-month projection is on the order of days of compute, on a system concurrently
provisioning new signups and their billing artefacts. Queueing it does not help — it converts a long
wait into a multi-day load. So scope is bounded **by construction**:

- **The projection estimates itself before it runs.** Count the cohort with a cheap indexed query,
  multiply by a measured per-team-month cost, and compare against a configured wall-clock budget.
- **Over budget is refused, not queued.** The refusal states the cohort size, the estimate and which
  filters would bring it in range. A warning that can be clicked through is not a bound.

  Ship the refusal as a **designed panel, not a `frappe.throw` modal**: a query report's `execute()`
  returns `(columns, result, message, chart, report_summary, skip_total_row)`, and the `message` slot
  renders HTML above the table. Return zero rows plus the panel as `message` — count, estimate, the
  budget it exceeded, and the ways forward including the sample. A dead end with no next step is how
  a bound becomes something people route around.
- **Book-wide questions are answered by sampling, not by grinding.** A stratified sample across
  currency, trust tier and plan mix, extrapolated, with the sample size and strata stated on the
  output. Minutes, and the uncertainty is visible rather than implied.

**Load discipline is a separate constraint from duration.** Even a bounded batch competes with
production traffic:

- Projections get **their own queue** — never the `billing` queue. A projection starving the monthly
  run of workers on the 1st is exactly backwards.
- A cohort projection **refuses to start while the run is drafting or collecting**; `billing_run_status()`
  already reports that.
- Route to the replica where `read_from_replica` is configured.
- Cap concurrent batches globally, and give each a wall-clock budget that aborts with partial results
  rather than running unattended for hours.

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

- [ ] A cohort is sized and cost-estimated before any projection work begins, and an over-budget
      request is **refused** with the count, the estimate and the filters that would narrow it.
- [ ] The refusal renders through the query report's `message` slot as a panel with next steps —
      not as a thrown error — and nothing is queued when it fires.
- [ ] Report lives at `/desk/query-report/Billing Projection`; no header or column label is
      uppercased.
- [ ] There is no code path that projects an unbounded cohort — a test asserts the ceiling cannot be
      bypassed by an empty filter set.
- [ ] Stratified sampling is offered as the alternative to a refused cohort, and its output states the
      sample size and strata; an extrapolated figure is never presented as a measured one.
- [ ] Projections execute on their own queue, not the queue the monthly run uses.
- [ ] A cohort projection refuses to start while the monthly run is drafting or collecting.
- [ ] Concurrent batches are capped, and each aborts on a wall-clock budget with partial results
      retained and clearly marked partial.
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
