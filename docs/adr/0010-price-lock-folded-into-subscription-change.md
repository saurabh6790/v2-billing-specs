# Price-lock folded into the Subscription Change ledger

Date: 2026-06-30

The runtime spine was born with **two** append-only logs sharing one key. An **event log**
recorded a row per provision/change/cancel (`resource_id`, `event_type`, `effective_from`/`to`)
and gave invoicing its segment windows; a separate **Price Lock** doctype recorded, also keyed by
`resource_id`, the rate the customer was shown at provision (`locked_rate`, `currency`, `cluster`,
`started_at`/`ended_at`) so a later catalog rise touched only *new* provisions. Billing joined the
two at invoice time: event log for the time windows, Price Lock for the rate.

That shape is a fossil of the Agent era. [ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md)
deleted the Agent — Central now provisions, records, and prices in one component — but left the two
doctypes standing, still carrying Agent vocabulary (`source_event_id` = "Agent Plan Subscription
Log", `locked_rate` = "Agent shown_rate"). Meanwhile [issue #04](../../issues/04-subscription-intent-two-axis-state.md)
had already given us a **third** append-only log, `Subscription Change`, the intent/contract history
keyed by `subscription`. Three append-only logs, two of them keyed by `resource_id`, all written in
the same transaction, all describing the same lifecycle events. The event log and the Price Lock were
the same row split in two, and `Subscription Change` recorded the same transition a fourth time
without the one fact billing actually needed: the rate.

## Decision

**`Subscription Change` is the single append-only spine. Each row is the event *and* the price for
that event: `effective_at` is the segment boundary, `locked_rate` + `currency` are the rate billing
honours for the segment the row opens. The standalone `Price Lock` doctype (and `revenue/pricelock.py`)
is retired; the event log is no longer a separate doctype. Billing reads segments directly off
`Subscription Change` — no join, no second lookup.**

- **One ledger, rate-stamped.** `Subscription Change` gains `locked_rate` (Currency) and `currency`
  (Link). The rate is resolved from the catalog *at the moment the row is written* and frozen there;
  billing reads the row's snapshot for its segment, never the live catalog rate. "Rate shown = rate
  locked" still holds for free, because the component that writes the change is the one that resolved
  the rate — there is nothing to keep in sync ([ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md)).

- **Resolution branches on the event, not the doctype.** Whether a change re-prices is a property of
  *what changed*:
  - **`Created` / `Plan Changed`** (a provision or a **resize**) **re-resolve** the live catalog rate
    for `(plan-or-config, currency, cluster)` and stamp a **fresh** `locked_rate`. A resize is the
    `changed`-event re-lock ([issue #54](../../issues/54-changed-event-resize-plan-change.md)): the
    open segment closes at `effective_at`, a new one opens at today's rate. Grandfathering protects
    only the *unchanged* resource — a resized one is priced at current rates.
  - **Stop / start and other non-pricing transitions** (`Paused`, `Resumed`, `Payment Method
    Changed`, `Past Due`, `Suspended`, `Reactivated`) carry **no new rate** and open **no new
    segment**. A stopped resource keeps billing at its **locked** rate (the launch decision — only
    *terminate* ends billing); restart continues the same segment. These rows are operational/account
    history, not price events.
  - **`Cancelled`** closes the open segment at `effective_at` and carries no rate of its own.

- **Invoicing reads segments off the ledger.** The day-weighted line engine walks a subscription's
  `Created` / `Plan Changed` / `Cancelled` rows in `(effective_at, creation)` order: each
  rate-bearing row opens a segment at its `locked_rate` running until the next change (or period
  end); `Cancelled` (and any row with no `locked_rate`) is a boundary, not a billable segment. The
  `max(1, end − start)` same-day-churn floor and the segmented two-phase generation
  ([issue #09](../../issues/09-postpaid-invoice-generation-fixed.md)) are unchanged — only the source
  of the segment is.

## Consequences

- **One fewer doctype and one fewer join.** Segment windows and the locked rate live on the same row,
  so invoicing reads a single ledger. The `resource_id`-keyed event log + Price Lock collapse into the
  `subscription`-keyed change history; the resource identity is reachable via the Subscription's
  `asset_id`.

- **Grandfathering is intact** and now legible: the lock *is* the change that created it, append-only
  and never edited (the controller forbids re-save). The history shows every re-lock inline with the
  event that caused it — the old "two logs that must agree" failure mode is gone.

- **Composed configs (§5.2, [issue #80](../../issues/80-composed-subscription-itemized-invoice.md))**
  do **not** freeze per-resource charges. The **composition** (qty per resource) is locked on the
  **Subscription**; the change row's single `locked_rate` holds the **whole-config rate** —
  `Σ(qty × component_rate)` resolved live at provision (or re-resolved at resize), then frozen as one
  number. The single `locked_rate` Currency field is therefore sufficient for both modes, and billing
  reads one locked rate per segment regardless of mode (preset = the flat bundle rate; composed = the
  locked config total). A resize re-resolves the config total at the current rate card and stamps it
  on the new `Plan Changed` row ([issue #82](../../issues/82-resize-composed-config-changed-event.md)).

- **Migration.** Existing `Price Lock` rows backfill into `Subscription Change` (a `locked_rate`/
  `currency`-stamped `Created`/`Plan Changed`/`Cancelled` per segment, matched to the subscription via
  `resource_id` → `asset_id`); the doctype and `revenue/pricelock.py` are then dropped. See
  [issue #03](../../issues/03-agent-event-log-price-lock.md).

- **Discrepancy logging** (shown ≠ Central's currently-resolved rate) was a hedge against the Agent
  showing a stale cached rate. With no Agent and one component resolving-and-stamping, the two can no
  longer diverge, so the discrepancy fields retire with the doctype.

## Supersedes / amends

- Folds the **event log** and **price-lock** of [issue #03](../../issues/03-agent-event-log-price-lock.md)
  into `Subscription Change`; the doctype model in
  [plans-and-pricing.md](../../plans-and-pricing.md) and the join in [invoicing.md](../../invoicing.md)
  are updated accordingly.
- Refines the `changed`-event re-lock of [issue #54](../../issues/54-changed-event-resize-plan-change.md)
  and [final-plan-pricing.md §9](../../final-plan-pricing.md) to live on the change row.
- Builds on [ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md) (no Agent — one
  component resolves, records, and prices).
