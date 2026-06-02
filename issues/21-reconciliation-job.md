# 21 — Reconciliation job (charged-but-never-webhooked)

**Type:** HITL · **Milestone:** Phase 4 · **Spec:** [payments.md](../payments.md), [roadmap.md](../roadmap.md)

## What to build

A daily job that scans ambiguous payment states against gateway APIs and resolves the **"charged-at-gateway-but-never-webhooked"** terminal state — without double-charging (idempotency key) or leaving revenue uncollected. **HITL:** the precise terminal-state model is an open design item and needs a decision before/with implementation (what states are terminal, how a resolved-by-reconciliation payment is recorded vs a webhook-confirmed one, alerting thresholds).

## Acceptance criteria

- [ ] **Decision recorded** for the terminal-state model (resolve the open item) before merge.
- [ ] Daily scan queries the gateway for attempts stuck in ambiguous states.
- [ ] A charge confirmed at the gateway but missing a webhook is reconciled to `Paid` idempotently (no double-charge).
- [ ] An attempt with no gateway record is safely failed/retried, not left dangling.
- [ ] Ops alerted for states the job cannot resolve automatically.

## Blocked by

- #10
