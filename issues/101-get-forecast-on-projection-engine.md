# 101 — Reimplement `get_forecast` on the projection engine

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The customer dashboard's forecast is a projection under one fixed scenario — this team, this month,
live configuration, everything settles. It is currently a second rating path that happens to agree
with the run. Point it at the engine so it cannot stop agreeing.

This is a small slice with a disproportionate payoff: it removes the possibility of the number a
customer sees and the number an operator simulates drifting apart, and it exercises the engine against
the highest-traffic caller in the system.

Two things to preserve carefully. The response shape the customer SPA consumes stays as it is — this
is an internal replacement, not an API change. And forecast keeps its name for exactly this meaning:
the customer-facing, current-month, live-config projection. An operator projecting six months under an
overridden price list is not forecasting.

The engine's metered estimation applies here too, which is an improvement — the current forecast
reports metered usage only as far as rollups have landed month-to-date, with no projection to
month-end. Surfacing the measured/estimated split to customers is a product decision, not an
engineering one: default to keeping the existing single figure and expose the split behind the
existing response fields only if it is asked for.

## Acceptance criteria

- [ ] `get_forecast` is implemented by calling the projection engine with a fixed scenario.
- [ ] The response shape is unchanged; the customer SPA needs no modification.
- [ ] For a team with no metered usage the projected total matches the current implementation exactly.
- [ ] Forecast performance is no worse than today's for a typical team, measured.
- [ ] No second rating path remains: a test asserts forecast and the draft engine produce the same
      fixed-line total for the same team and period.
- [ ] The forecast runs read-only like every other projection.

## Blocked by

- [#92](92-project-one-team-next-month.md)
