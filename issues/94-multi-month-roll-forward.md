# 94 — Multi-month roll-forward and the state seam

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Projecting six months is not six independent projections. Month 2 is downstream of month 1 — the
wallet was drawn, an invoice went Overdue, standing moved to past_due, a suspension stopped accrual
mid-month, a settled invoice promoted the trust tier and with it the spend cap. This slice is where
ops learns the thing they cannot get any other way: *this team runs out of credits in month 3 and is
suspended in month 4.*

**The state seam.** A decision function can be free of writes and still be un-projectable, because it
reads *now*. `settlement.effective_spend_cap` and the credits waterfall both call
`credits.get_balance`, which returns today's wallet — so a month-4 projection would draw against the
balance the team holds right now, refilling it every month and never reporting a shortfall.

The seam is an **optional parameter that defaults to the database**, so production is untouched:

```python
cap = settlement.effective_spend_cap(team)                # production — reads the DB
cap = settlement.effective_spend_cap(team, source=state)  # projection — reads the roll-forward
```

The rule for which readers get the seam is one question — *does my projection change this?*

- **Evolving state** (seam required): wallet balances per currency, live invoices and their statuses,
  `account_standing` per subscription, trust tier and effective cap, payment methods, the change stream.
- **Reference data** (no seam, read live): tax profile, commitment terms, catalog rates, plan
  definitions, the tier ladder. `resolve_tax`, `resolve_commitment` and rate resolution are not touched.

**Seeding.** State is seeded from the real team at t₀ — including **invoices that are already Open or
Overdue**, whose in-flight ladders continue. A projection that only started ladders for invoices it
drafted itself would miss the most urgent case in the book.

**The loop** advances a virtual clock: per day, maybe draft, maybe settle, advance dunning, apply to
state. One read of the database, then arithmetic.

## Acceptance criteria

- [ ] Evolving-state readers accept an optional `source`; every call site without one behaves exactly
      as today, and the production suite proves it.
- [ ] `resolve_tax`, `resolve_commitment` and rate resolution are unchanged.
- [ ] State seeds from live data at t₀, including existing Open/Overdue invoices with their real
      `dunning_starts_on`, and continues their ladders.
- [ ] Wallet drawdown carries across months: a wallet exhausted in month 2 produces a shortfall in
      month 3, not a refilled balance.
- [ ] Promotional credit expiry is honoured across the projected window (soonest-first draw).
- [ ] Standing advances through the ladder across months, and a suspension halts accrual from its date
      rather than billing a stopped resource.
- [ ] A settled invoice that crosses a trust-tier threshold changes the effective cap for later months.
- [ ] Projecting N months for a team with no activity equals N copies of the single-month projection.

## Blocked by

- [#92](92-project-one-team-next-month.md)
