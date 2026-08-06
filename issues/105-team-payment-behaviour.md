# 105 — Payment behaviour: how a team has actually been performing

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Every other slice in this milestone looks forward. This one looks back, because a projection means
almost nothing without it.

*"This team is suspended on the 12th"* reads completely differently next to *"and they have paid late
in three of the last six months"* than next to *"and they have never missed one."* The first is a
collections problem; the second is probably our failure — an expired card, a mandate that lapsed, a
gateway that stopped working — and the response ops should take is the opposite in each case. The
projection states what will happen; this states whether to worry.

It is a **retrospective read over rows that already exist** — invoices, payment attempts, refunds,
subscription changes. No rating, no estimation, no scenario. That puts it in the same cost class as
[#104](104-collection-outlook-sweep.md): cheap enough to compute for a whole cohort without any of the
bounding [#96](96-cohort-billing-projection-report.md) needs.

What it should say about a team:

- **Settlement reliability** — invoices settled on time, settled after retry, settled late, never
  settled; the on-time rate and how it is trending.
- **Lateness** — average and worst days-to-settle, against the due date rather than the deferred
  dunning clock, so our own delays never make a customer look worse than they were.
- **Escalation history** — times dunned, times reaching Overdue, times suspended, times recovered
  after suspension.
- **How they pay** — settlement source mix over time (credits vs card vs manual checkout), method
  failures and fallbacks used, mandate or card churn.
- **Trajectory** — trust tier movement, spend trend, commitment standing.
- **Tenure and scale** — how long they have billed with us and at what level, because a two-month-old
  team missing its first payment is a different fact from a three-year customer missing theirs.

It surfaces in three places: a context panel on the Simulator page beside the projection, a set of
columns on the cohort views, and standalone — "show me chronic late payers" is a question worth
asking on its own.

**One correctness rule.** Lateness is always measured against `due_date`, never against
`dunning_starts_on`. The deferred clock exists to protect customers from *our* collection failures;
letting it feed a behaviour score would quietly blame customers for our outages.

## Acceptance criteria

- [ ] A per-team behaviour summary covering settlement reliability, lateness, escalation history,
      payment-source mix, trajectory and tenure.
- [ ] Lateness is computed from `due_date`; a test asserts a deferred dunning clock does not worsen a
      team's record.
- [ ] Invoices that were never collectable through no fault of the customer — Action Required at the
      threshold, a gateway outage window — are distinguished from genuine non-payment.
- [ ] Cost Report (trial) invoices are excluded from settlement statistics.
- [ ] Money is split per currency; rates and counts are never averaged across currencies.
- [ ] Computed cheaply enough to run across a whole cohort without the bounding #96 requires —
      verified at lakh scale with a realistic delinquent fraction.
- [ ] Renders as a context panel beside the projection on the Simulator page.
- [ ] Available as cohort columns and as a standalone filterable view.
- [ ] Read-only, like every other projection surface.

## Blocked by

None — can start immediately (reads existing data only; pairs with
[#92](92-project-one-team-next-month.md) for the Simulator panel).
