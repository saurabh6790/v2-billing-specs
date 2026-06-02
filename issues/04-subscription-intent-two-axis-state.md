# 04 — Subscription intent + two-axis state

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [subscriptions.md](../subscriptions.md)

## What to build

Central's `Subscription` as the customer's *intent/contract* (not billing truth), plus `Subscription Change` as append-only history. Implement the **two-axis state model**: `account_standing` (`current/past_due/suspended`, Central-owned) is distinct from operational state (`running/stopped/terminated`, Agent-owned) — never one enum. Customer APIs create/change/cancel intent; each transition writes a `Subscription Change`. The create endpoint records intent only; the authoritative event is born at the cluster (#03).

## Acceptance criteria

- [ ] `Subscription` (intent) + `Subscription Change` (separate DocType, append-only) exist.
- [ ] `account_standing` is a Central-owned axis; no single combined operational/financial enum anywhere.
- [ ] Create / change-plan / cancel each write a `Subscription Change`; history is not directly editable.
- [ ] Invalid standing transitions raise `InvalidTransition` (exhaustively tested).
- [ ] Create endpoint is documented/behaves as intent; reconciliation against the Agent event is wired.

## Blocked by

- #01
