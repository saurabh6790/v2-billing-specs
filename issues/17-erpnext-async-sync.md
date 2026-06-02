# 17 — ERPNext async Sales Invoice sync

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [invoicing.md](../invoicing.md), [architecture.md](../architecture.md)

## What to build

After an invoice is `Paid`, enqueue an async job to create the corresponding Sales Invoice in ERPNext (the statutory accounting SOR). One-way, non-blocking: failure retries with exponential backoff (3 attempts, then alerts ops) and **never blocks or rolls back** the customer-facing invoice. Cloud Billing remains the SOR for the customer-facing balance.

## Acceptance criteria

- [ ] Post-payment hook enqueues an ERPNext Sales Invoice sync job.
- [ ] Retries with exponential backoff (3 attempts), then alerts ops.
- [ ] **Failure isolation:** ERPNext 500 → invoice stays `Paid`, customer notified, sync queued for retry, no rollback.
- [ ] `erpnext_invoice` reference stored on success.
- [ ] Sync is one-way; correction credit notes (from #15) flow down to ERPNext, not back.

## Blocked by

- #10
