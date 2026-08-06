# 100 — Diff mode and blast radius

**Type:** HITL · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Project twice — once under live configuration, once under a scenario — and show the delta. Per team
this answers "what does this change do to *them*"; across a cohort it answers the question ops
actually has before shipping a pricing or policy change: **what is the blast radius?**

`rerating.preview()` is the existing precedent for the shape: *what this would change, without
changing anything.*

Per-team diff: the two projected invoices side by side, line by line, with changed lines marked and
the collection and dunning calendars overlaid so a moved suspension date is visible as a shift rather
than as two dates to compare by eye.

Cohort aggregate: the summary an operator can take into a decision. Per currency, never summed across.

> **HITL — the metric set is the open question.** Revenue delta is obvious. Beyond it, which numbers
> ops actually needs is a conversation, not a derivation: teams newly failing to settle vs teams newly
> *at risk*; teams newly suspended vs teams whose suspension merely moves; movement in DSO; teams
> crossing a trust-tier threshold in either direction; commitment breaches triggered. Agree the set
> with the accounts team before building it — an aggregate nobody asked for is a number nobody reads.

## Acceptance criteria

- [ ] The metric set for the cohort aggregate is agreed with the accounts team and recorded in the
      issue before implementation.
- [ ] Two scenarios project side by side for one team, with changed lines and shifted dates marked.
- [ ] Cohort diff reports the agreed aggregate, split per currency.
- [ ] The diff states what it held constant — same t₀, same data, differing only in scenario.
- [ ] Estimated lines are marked in the diff, and a delta driven entirely by estimates is labelled as
      such rather than reported as a revenue change.
- [ ] Runs within the paging, bounding and read-only transaction discipline established for cohort
      projection — including the refusal of an over-budget cohort and the stratified-sample
      alternative, since a book-wide blast radius is exactly the request that will exceed it.
- [ ] Where the aggregate is extrapolated from a sample, the output says so wherever a total appears.

## Blocked by

- [#96](96-cohort-billing-projection-report.md)
- [#97](97-billing-scenario-and-overrides.md)
