# 104 — Collection outlook: the cheap sweep over invoices that already exist

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

*Which teams are going to be suspended in the next 21 days, and on what date?*

Answering that requires **no rating at all**. Every input is a fact already in the database: invoices
that are `Open` or `Overdue`, their real `dunning_starts_on` (already correctly deferred when
collection failed on our side), and the live ladder from Billing Settings. It is `dunning_schedule`
applied to rows that exist — pure date arithmetic.

That makes this surface categorically different from cohort revenue projection, and it is worth
building separately because **its cost scales with delinquency, not with the book**. Most teams pay.
At a few lakh teams the unpaid set is still a few thousand invoices, so this runs over *everything*,
on demand, in under a second, and keeps doing so as the business grows. Revenue projection ([#96](96-cohort-billing-projection-report.md))
has to be filter-bounded precisely because it cannot make that claim.

The output is the list ops acts on in the morning: team, invoice, amount outstanding, currency,
current dunning stage, next scheduled action and its date, the date suspension lands, the date
termination lands. Nothing is estimated, nothing is assumed, no scenario is involved — every column is
either a stored fact or arithmetic over one.

It should also answer the inverse, which is what makes it a debugging tool: given a team, *why* is it
at this stage on this date — which invoice, which clock start, and whether that clock was ever
deferred because we failed to collect on time.

## Acceptance criteria

- [ ] A report lists every team with an unpaid billable invoice and its projected escalation dates,
      computed by `dunning_schedule` from stored state only.
- [ ] It runs unbounded over the whole book, synchronously, and is fast enough to be interactive —
      verified against a synthetic book with a realistic delinquent fraction at lakh scale.
- [ ] Nothing in the output is estimated or assumed; no rating is performed.
- [ ] `dunning_starts_on` is honoured where present, and a deferred clock is visibly marked as
      deferred with the reason.
- [ ] Cost Report invoices, Manual Checkout and Action Required teams are represented correctly —
      escalating without silent retries, per the collection-mode rules.
- [ ] Money is split per currency; no column mixes currencies.
- [ ] Filterable by currency, country, cluster, stage and horizon (next N days).
- [ ] Runs read-only, and drills through to the Simulator page for a team.
- [ ] Linked from the Billing workspace.

## Blocked by

- [#91](91-split-decision-from-effect-rating-dunning.md)
