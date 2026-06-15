# 14 — Retry/dunning + staged suspension

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md), [subscriptions.md](../subscriptions.md)

## What to build

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** Suspension/termination is **Central calling the cluster manager API** to stop/terminate the team's VMs — there is no Agent and no cap-0 entitlement token. Also note: dunning is **collection-mode-aware** ([#50](50-inr-collection-mode-threshold-action-required.md)) — `manual_checkout`/`action_required` teams are not silently retried.

Failed-payment handling end-to-end. Retry at Day 1 / 3 / 7 (each a new `Payment Attempt`, customer notified with the failure reason). After Day 7 → invoice `Overdue`, standing `past_due` (keep running, grace). Continued non-payment → Central **calls the cluster manager API to stop/power-off** the resource (data preserved). After ~30 days suspended → Central calls the cluster manager to terminate. Central-unreachable never triggers a stop; only a deliberate Central call does.

## Acceptance criteria

- [ ] Retry scheduler at Day 1/3/7; each a new attempt; notification per retry with failure reason (mode-aware copy, #50).
- [ ] Day-7 failure → invoice `Overdue`, standing `past_due`, resource still running.
- [ ] On exhausted dunning, Central calls the cluster manager API to stop the resource (data preserved).
- [ ] Staged escalation: Central calls the cluster manager to terminate after the dunning window.
- [ ] Central-unreachable does **not** stop running resources (the cluster manager only acts on a Central call).

## Blocked by

- #07
- #10
