# 04 — Subscription intent + two-axis state

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [subscriptions.md](../subscriptions.md)

## What to build

Central's `Subscription` as the customer's *intent/contract*, plus `Subscription Change` as append-only history. Implement the **two-axis state model**: `account_standing` (`current/past_due/suspended`, derived from payment) is distinct from operational state (`running/stopped/terminated`, Central's record of cluster-manager state) — never one enum. Customer APIs create/change/cancel intent; each transition writes a `Subscription Change`. The create endpoint records intent and triggers the provision; Central writes the authoritative event when it provisions via the cluster manager ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md), #03).

## Acceptance criteria

- [ ] `Subscription` (intent) + `Subscription Change` (separate DocType, append-only) exist.
- [ ] `account_standing` (payment-derived) and operational state (cluster-manager-reported) are distinct axes; no single combined enum anywhere.
- [ ] Create / change-plan / cancel each write a `Subscription Change`; history is not directly editable.
- [ ] Invalid standing transitions raise `InvalidTransition` (exhaustively tested).
- [ ] Create endpoint records intent + triggers the provision; Central writes the event when it provisions (#03).

## Blocked by

- #01
