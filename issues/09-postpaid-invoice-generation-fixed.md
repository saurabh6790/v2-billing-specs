# 09 — Postpaid two-phase invoice generation (fixed resources)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [invoicing.md](../invoicing.md)

## What to build

Postpaid, in-arrears invoice generation for **fixed** resources, in two phases. **28th — reconcile-then-draft:** for each active subscription, reconcile sync if stale, then compute day-granularity line items (event-log time windows × locked price, with the `max(1, end−start)` floor), apply nothing yet, create a `Draft`. **1st — open & collect:** one parallel job per draft transitions `Draft → Open`, no double-processing. Partial first month is billed on the following 1st (no charge at sign-up). Line-item engine is generic over `billing_interval` (daily exercised, hourly wired).

## Acceptance criteria

- [ ] `Invoice` + `Invoice Line Item` (child, generated-once); status `Draft/Open/Paid/Overdue/Waived/Cancelled`.
- [ ] 28th job drafts one invoice per active subscription with correct day-weighted line items from the event log × locked price.
- [ ] `max(1,…)` floor: same-day provision+destroy charges 1 day, not 0.
- [ ] 1st job opens all drafts in parallel (10 workers) with **no invoice processed twice**.
- [ ] New-plan-wins-the-day verified; partial first month billed on the 1st, nothing at sign-up.

## Blocked by

- #03
- #04
