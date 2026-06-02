# 14 — Retry/dunning + staged suspension

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md), [subscriptions.md](../subscriptions.md)

## What to build

Failed-payment handling end-to-end. Retry at Day 1 / 3 / 7 (each a new `Payment Attempt`, customer notified with the failure reason). After Day 7 → invoice `Overdue`, standing `past_due` (keep running, grace). Continued non-payment → Central issues a **suspend directive on the entitlement-token channel** (cap 0 + `suspend`) → the Agent **stops/powers-off** the resource (data preserved). After ~30 days suspended → terminate. Central-unreachable never triggers a stop; only a deliberate directive does.

## Acceptance criteria

- [ ] Retry scheduler at Day 1/3/7; each a new attempt; notification per retry with failure reason.
- [ ] Day-7 failure → invoice `Overdue`, standing `past_due`, resource still running.
- [ ] Suspend directive rides the token channel; Agent stops the resource on receipt (data preserved).
- [ ] Staged escalation to terminate after the dunning window.
- [ ] Central-unreachable does **not** stop running resources (only a deliberate directive does).

## Blocked by

- #07
- #10
