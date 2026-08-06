# 93 — Derived payment outcomes: why collection will fail

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Whether a card will succeed is unknowable, so the projection never pretends. But a great deal of
failure is not a guess at all — it is *entailed* by state we already hold, and asserting only that is
what turns the simulator from a picture into a pre-flight check on the book.

Add the three outcome modes, explicit in the output:

- **Optimistic** — everything settles on time (what #92 ships).
- **Assumed** — the operator declares the outcome per invoice: pays on time, pays after retry *n*,
  never pays.
- **Derived** — the engine asserts failure only where state entails it, and is silent otherwise.

Derived mode is the valuable one. Every conclusion it reaches is a fact, not a forecast:

| Condition | Projected outcome |
|---|---|
| No active autopay method | Will not auto-charge |
| INR invoice above the e-mandate threshold | Action Required — never silently auto-charged ([ADR 0005](../docs/adr/0005-inr-collection-emandate-threshold-prepaid.md)) |
| Collection mode is Manual Checkout | Customer must act; dunning escalates without retrying |
| UPI mandate `effective_cap` below the invoice | Debit will be refused |
| Card's printed expiry inside the projected window | Will expire mid-cycle |
| Credits-only team, wallet below projected total | Shortfall of *X* |
| Commitment spend below floor | Clawback of *X* |

Reuse `collection_mode.evaluate`, `mandates.effective_cap`, `settlement.settlement_sources` and
`collection.next_method_for` rather than restating their rules — the whole point is that the simulator
and the collector agree because they are the same code.

## Acceptance criteria

- [ ] The scenario carries an outcome mode; the projection output states which mode produced it.
- [ ] Derived mode reports each entailed failure with its reason and the state that entails it, and
      reports nothing where the outcome is genuinely unknown.
- [ ] Every derived conclusion is reached by calling the production collection/settlement helpers, not
      by reimplementing their conditions.
- [ ] Assumed mode accepts a per-invoice declared outcome and drives the dunning calendar from it.
- [ ] The Desk page shows the projected outcome and its reason alongside the collection calendar.
- [ ] A team with an active card and sufficient balance yields no derived failure.

## Blocked by

- [#92](92-project-one-team-next-month.md)
