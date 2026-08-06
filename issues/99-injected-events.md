# 99 — Injected events: hypothetical resizes, top-ups and declines

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Overrides change the rules; injected events change what *happens*. This slice lets an operator place
hypothetical events on the projected timeline and watch the real engine react — the difference between
"what will this team be billed" and "what happens if they do this".

Events, each with a date:

- **Resize** a subscription to another plan or composed config — opens a new rate segment at the rate
  resolution would give it on that date, and if it lands within the churn window of another change,
  correctly flips those dates to hourly billing.
- **Provision** a new subscription, or **cancel** an existing one.
- **Top up** the wallet by an amount.
- **Decline** — the *n*th payment attempt on an invoice fails, driving the fallback chain and the
  dunning ladder.

The events merge into the change stream the line engine already reads, so a hypothetical resize is
rated by exactly the code that rates a real one. This requires the change source in the line engine to
be injectable; today it queries Subscription Change directly.

The engine must keep rejecting what production rejects: an injected provision still meets the spend
cap and settlement-source gates, and reports being refused rather than silently succeeding. A scenario
that could not happen is a finding, not a projection.

## Acceptance criteria

- [ ] The line engine's change source is injectable, defaulting to the live query with unchanged
      production behaviour.
- [ ] Injected resize / provision / cancel appear as segments and are rated by the production line
      engine, including hourly billing when inside the churn window.
- [ ] An injected top-up credits the projected wallet on its date and changes downstream settlement.
- [ ] An injected decline drives the real fallback chain (escalate, don't repeat) and shifts the
      dunning calendar accordingly.
- [ ] An injected provision that would breach the effective spend cap or lacks a settlement source is
      reported as refused, with the reason.
- [ ] Events are visible on the swimlane timeline, marked as hypothetical and distinguishable from
      real history.
- [ ] Lines arising from injected events carry basis `assumed`.

## Blocked by

- [#94](94-multi-month-roll-forward.md)
- [#97](97-billing-scenario-and-overrides.md)
