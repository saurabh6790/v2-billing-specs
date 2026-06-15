# 12 — Metered billing — Usage Meter (counter/gauge)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [metering.md](../metering.md)

## What to build

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** No Agent: the cluster manager rolls usage up at the edge and Central **records** it in its own Usage Meter (no push/sync).

The metered stream. The cluster manager rolls cluster metrics up at the edge (Central never stores raw samples) and exposes per-`(resource_id, meter_type, period)` figures Central records: `counter` (summed deltas, e.g. transfer) and `gauge` (GB-days integral, e.g. snapshot). A single **running-total row per current period** is overwritten daily for the live forecast and collapses at close. Central computes metered line items as `max(0, quantity − locked_allowance) × locked_rate` (rate + allowance locked at provision, #03). Rollups are idempotent (re-record replaces, never adds).

## Acceptance criteria

- [ ] Central `Usage Meter` with `meter_type` (counter/gauge) and correct aggregation math for each.
- [ ] Running-total row per `(resource_id, meter_type, current_period)` overwritten daily; collapses to final at close.
- [ ] Central never stores raw samples — only rollups (bounded row count).
- [ ] Metered line item = `max(0, qty − allowance) × rate` using locked rate/allowance.
- [ ] Idempotent re-record of a period replaces the figure (no double count).

## Blocked by

- #03
- #09
