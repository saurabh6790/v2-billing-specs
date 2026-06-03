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

## Decision — terminal-state model (resolves the HITL open item)

Decided 2026-06-03, with implementation.

- **Ambiguous (scannable) states** are the non-terminal attempt states `initiated` and `authorised`. **Terminal** states are `captured`, `failed`, `refunded` — never revisited by the job.
- **Grace window:** an attempt is only scanned once it is older than **30 min** since `initiated_at` — webhooks are push-primary and usually arrive in seconds; the grace avoids racing a webhook in flight.
- **Reconciliation only ever READS** the gateway (`adapter.get_transaction_status`); it never calls `charge`. Double-charge is therefore structurally impossible, independent of the idempotency key.
- **Resolution by gateway truth:**
  - gateway success (`succeeded`/`captured`/`paid`) → settle the invoice via the **same** path a webhook uses (`charges._settle_invoice`, idempotent — no double settle); the attempt becomes `captured`.
  - gateway failure (`failed`/`canceled`/`declined`) → attempt `failed` (dunning will retry; the invoice stays Open).
  - **no gateway record** / missing `gateway_transaction_id` (the charge never reached the gateway) → attempt `failed` (safe; never left dangling).
  - still `pending`/unknown → leave as-is; if older than the **24 h** alert threshold, alert ops.
- **Provenance:** every settlement records `resolved_by` on the Payment Attempt — `webhook` (normal) vs `reconciliation` (this job) — so a reconciled payment is distinguishable from a webhook-confirmed one in audit, while the customer-facing effect (invoice `Paid`) is identical.
- **Alerting:** unresolved-after-24 h ambiguous attempts raise an ops alert (Error Log + invoice comment); the customer is not paged for an internal reconciliation gap.

## Blocked by

- #10
