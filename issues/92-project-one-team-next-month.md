# 92 — Project one team's next month (tracer bullet)

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The first end-to-end projection: pick a team and a future month, see the invoice it will be sent, the
dates it will be collected on, and the dunning ladder that follows if it is not paid. Live
configuration, everything-settles assumption, one period. This is the skeleton every later slice hangs
on.

**The engine** (`central/billing/projection/`) calls the decision functions from #91 — it does not
model billing, it *is* billing asked a question. Fixed lines project into a future month for free (the
last open rate segment clamps to the period end). Metered lines do not: no `Usage Rollup` rows exist
for a month that has not happened, so they would silently come back empty and understate the bill.
The engine therefore estimates metered quantities from trailing per-`(resource_type, cluster)` history,
and **every projected line declares where its quantity came from**:

```
basis = measured    # already a fact — locked rate over elapsed days, a rollup that landed
      | estimated   # inferred from history, because the period has not happened
      | assumed     # a human asserted it in the scenario (later slices)
```

A projected total is never rendered without its measured/estimated split.

**Inability to write is a database guarantee.** The engine runs inside
`frappe.db.begin(read_only=True)`, so any DML at any call depth fails with MariaDB 1792 — surfaced as
a named error, because a projection that attempted a write is a bug in the extraction and must read
as one. Where `read_from_replica` is configured, route there too. A grep test covers what the database
cannot see: no `publish_realtime`, `enqueue`, `sendmail`, or gateway adapter import in the projection
package or the extracted decision functions. (`enqueue` matters most — the job would run later on a
writable connection.)

**The surface** is a Desk page, `Billing Simulator` — the first Desk page in the app, so there is no
house pattern to copy. Team + period picker, the projected invoice rendered as an invoice, and a
horizontal swimlane calendar with a lane each for subscriptions, invoice, payments, dunning and
entitlement. Custom SVG; Frappe Gantt is a poor fit for point events.

The engine accepts an optional read recorder and an optional replay source. Both are unused here and
exist so #103 does not require reworking the engine.

## Acceptance criteria

- [ ] `project(scenario)` returns a plain data structure — projected invoice, dated collection and
      dunning calendar, per-line basis — and is composed of the #91 decision functions.
- [ ] The whole engine call runs inside a read-only transaction; a deliberate write in a test raises
      the named error rather than persisting.
- [ ] Grep test bans `publish_realtime` / `enqueue` / `sendmail` / gateway imports across the
      projection package and the extracted decision functions.
- [ ] Fixed lines project as `measured` for a future month; metered lines project as `estimated` from
      trailing history; a team with no history projects no metered line rather than a zero one.
- [ ] The trailing-history lookup is expressed so it can be issued once for a batch of teams rather
      than once per team — the cohort path in #96 depends on it not being an N+1.
- [ ] Totals are split measured vs estimated, and no view shows a bare projected total when any line
      is estimated.
- [ ] The dunning calendar is produced by `dunning_schedule` and reflects the live Billing Settings
      ladder, counted from `dunning_starts_on` when present.
- [ ] Desk page renders the invoice, the calendar and the swimlane for a chosen team and period; it is
      reachable from the Billing workspace.
- [ ] Access is gated on the Billing-Admin capability via `authz.py`, and each projection records who
      ran it over which team.
- [ ] `project` accepts `recorder=` and `source=` parameters, both optional and unused.

## Blocked by

- [#91](91-split-decision-from-effect-rating-dunning.md)
