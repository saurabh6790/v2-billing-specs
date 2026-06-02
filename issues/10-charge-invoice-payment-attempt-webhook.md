# 10 — Charge invoice → Payment Attempt → webhook → Paid

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [invoicing.md](../invoicing.md)

## What to build

Close the money loop. When an invoice is `Open` with amount due, create a `Payment Attempt` (idempotency_key = its name), charge via the adapter, and **mark `Paid` only on webhook confirmation** — never on the gateway API response. Each attempt is a new record. The webhook (from #02) drives the `Open → Paid` transition and the ledger debit.

## Acceptance criteria

- [ ] `Payment Attempt` DocType (separate) with unique idempotency_key, status `initiated/authorised/captured/failed/refunded`.
- [ ] `open_and_collect` (or `pay_invoice`) initiates a charge with the idempotency key; never marks paid on the API response.
- [ ] Inbound webhook transitions the invoice to `Paid` and records `amount_paid`.
- [ ] **Concurrent `pay_invoice` on one invoice → only one attempt reaches `captured`.**
- [ ] Full Stripe test-mode cycle: open → charge → webhook → `Paid`, notification logged.

## Blocked by

- #02
- #05
- #09
