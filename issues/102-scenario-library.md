# 102 — Scenario library: the canned failure catalogue

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

A shelf of named scenarios an operator can apply to any real team in one click — the training tool
that answers "what can go wrong" by showing it, and the fastest way for someone new to the accounts
team to learn how billing actually behaves.

The catalogue already exists in prose: the demo seed enumerates the cases worth exercising, and each
becomes a scenario here rather than a fixture.

- No payment method · card expires mid-cycle · primary declines and a backup captures
- INR invoice above the e-mandate threshold → Action Required
- UPI mandate cap below the invoice
- Credits-only team whose wallet runs dry mid-projection
- Welcome credit expires mid-projection (promotional expires, purchased does not)
- SEZ zero-rated · TDS withholding leaving a residual
- Commitment breach → clawback
- Trial converting to paid mid-month
- Two resizes inside 24 hours → hourly billing
- Multi-region team consolidating into one invoice
- A billing run three days late — does `defer_dunning` actually protect them?

Each entry is a scenario definition (overrides plus injected events), applied to a chosen team, with a
short plain-English statement of what it demonstrates and what to look for in the result. The last one
matters most: it is the case where the correct answer is "nothing bad happens", and being able to
*show* that is worth more than asserting it.

## Acceptance criteria

- [ ] Each catalogue entry is a named scenario applicable to any team, with a plain-English
      description of what it demonstrates.
- [ ] Applying an entry from the Simulator page requires one action and no scenario authoring.
- [ ] Entries are defined declaratively, so adding one needs no engine change.
- [ ] Where a scenario cannot apply to the chosen team, it says why rather than projecting something
      misleading.
- [ ] The late-run scenario demonstrably shows dunning dates moving with `dunning_starts_on` while
      `due_date` holds.
- [ ] Each entry has a test asserting the behaviour it claims to demonstrate.

## Blocked by

- [#99](99-injected-events.md)
