# 91 — Split decision from effect in the rating and dunning paths

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The refactor that makes billing answerable without being run. Every billing act currently welds its
decision to its effect; break the weld so the decision half is callable on its own. **Production
behaviour must be byte-identical** — this issue adds no feature and changes no number.

| Act | Extract (pure) | Leaves behind (effect) |
|---|---|---|
| Rate a period | `rate_team_period(team, start, end) -> payload` | `_insert_invoice(payload)` |
| Escalate an unpaid invoice | `dunning_schedule(clock_start, settings) -> [(date, stage)]` | `process_invoice_dunning` *executes* that schedule |
| Warn on wallet coverage | `credit_forecast(..., notify=False)` | `_notify_top_up` |

`generate_team_invoice` becomes `_insert_invoice(rate_team_period(...))`. `generate_draft_invoice`
follows the same shape. `process_invoice_dunning` stops computing days-and-stages inline and starts
driving the extracted schedule, so the ladder the production run walks and the ladder a projection
draws are the same list rather than two readings of one docstring.

Watch the impurity that is easy to drag along: `generate_team_invoice` calls
`commitments.resolve_commitment` (pure) *and* `commitments.mark_breached` (**writes**). The breach
marking stays on the effect side. Getting this wrong is how a later projection permanently marks real
commitments breached.

## Acceptance criteria

- [ ] `rate_team_period` returns the full invoice payload — lines, commitment adjustment, tax block,
      totals, `expected_collection` — and inserts nothing.
- [ ] `generate_team_invoice` and `generate_draft_invoice` are composed of the extracted decision plus
      `_insert_invoice`, with identical behaviour including the concurrency yield on `period_key`.
- [ ] `mark_breached` is not reachable from `rate_team_period`.
- [ ] `dunning_schedule` returns the dated ladder (retries, overdue, suspend, terminate) from a clock
      start and the Billing Settings knobs, with no document reads and no writes.
- [ ] `process_invoice_dunning` drives `dunning_schedule` rather than recomputing the stages, and its
      existing behaviour — idempotent per day, `Cost Report` skip, Action Required / Manual Checkout
      never auto-retried, directive dedupe — is unchanged.
- [ ] `credit_forecast` takes `notify` and performs no notification or realtime publish when false.
- [ ] The existing billing suite passes untouched. A test asserts a known team's invoice payload is
      identical before and after the extraction.

## Blocked by

None — can start immediately.
