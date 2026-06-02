# 16 — Free/trial cost_report

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [subscriptions.md](../subscriptions.md), [invoicing.md](../invoicing.md)

## What to build

Free/trial as the **entry trust tier**, not a separate path. The whole pipeline (provisioning, event log, metering, price-lock, line-item math) runs identically; Central branches at exactly one point — at invoice generation it emits `invoice_type = cost_report` (compute, **don't charge**) for entry-tier teams. This makes the subsidy figure a true cost. Trial is single-cluster; conversion flips the tier (cost_report → billable, resources keep running); expiry reuses the suspend directive.

## Acceptance criteria

- [ ] Entry-tier team provisions within trial cap (single cluster); usage flows through the normal pipeline.
- [ ] Invoice generated as `invoice_type = cost_report` — computed but **not charged**.
- [ ] Convert-to-paid flips tier; subsequent invoices are `billable`; resources keep running.
- [ ] Trial expiry unconverted → suspend directive (stop, then terminate) via #14 machinery.
- [ ] Subsidy total (for the dashboard) sums cost_report invoices accurately.

## Blocked by

- #07
- #09
