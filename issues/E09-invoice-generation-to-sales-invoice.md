# E09 — Postpaid two-phase generation → Sales Invoice

**Builds on:** ERPNext · **Replaces:** old #09 · **Phase:** P3 · **Type:** AFK
**Blocked by:** E01, E02, E04, E05

## Goal

Generate postpaid, in-arrears invoices from observed runtime + locked prices as **ERPNext Sales
Invoices**, in two phases (28th draft, 1st submit-and-collect), with no async sync. See
[invoicing.md](../invoicing.md).

## Scope

- Custom fields on **Sales Invoice**: `fc_subscription`, `fc_team`, `fc_invoice_type`
  (billable/cost_report), `fc_period_start`, `fc_period_end`, `fc_expected_collection` (Long Int,
  minor units), `fc_credit_applied` (Long Int).
- **Phase 1 (28th):** per subscription, reconcile-then-draft → compute line items per segment
  (locked price keyed by `resource_id`, via E02 money core) → build a **draft Sales Invoice**
  (`docstatus=0`) for the team's Customer; one Sales Invoice Item per segment with `fc_resource_id`,
  `fc_days`, `rate`/`amount` written minor→major (round-off off).
- **Phase 2 (1st):** apply credits (E11, `FOR UPDATE`) → **submit** the Sales Invoice → notify → if
  due > 0, hand to charge (E10). Cost-report (trial) runs phase 1 only, flagged, not submitted for
  collection.
- Proration rules: new plan wins the day; `max(1, end−start)` floor; granularity per
  `fc_billing_interval`.

## Acceptance

- A team joining mid-month gets its first Sales Invoice on the 1st covering the partial month; no
  charge at sign-up.
- The submitted Sales Invoice posts GL in-process; `grand_total` equals the minor-unit total to the
  paisa; two recomputations are identical.
- A trial team's run produces a cost-report (no GL charge, no collection).
- The 1st-of-month scheduler returns in seconds (one lightweight job per draft); workers stagger
  collection.

## Out of scope

The charge/Payment Entry flow (E10); metered line items (E12); tax (E13).
