# 10 — Charge invoice → Payment Attempt → webhook → Paid

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [invoicing.md](../invoicing.md)

## What to build

Close the money loop. When an invoice is `Open` with amount due, create a `Payment Attempt` **against that invoice** (idempotency_key = its name), charge via the adapter, and **mark `Paid` only on webhook confirmation** — never on the gateway API response. Each attempt is a new record. The webhook (from #02) is the single driver of both the `Open → Paid` transition (+ ledger debit) **and** the Payment Attempt status: the attempt listens to its respective gateway callback and advances `initiated → authorised → captured / failed / refunded`. High-volume `Payment Attempt` / `Webhook Event` logs are kept on a rolling 3-month window and pruned daily.

## Acceptance criteria

- [ ] `Payment Attempt` DocType (separate) linked to `Invoice`, with unique idempotency_key, status `initiated/authorised/captured/failed/refunded`.
- [ ] `open_and_collect` (or `pay_invoice`) initiates a charge with the idempotency key; never marks paid on the API response (attempt left at `initiated`).
- [ ] Inbound webhook resolves back to its Payment Attempt (via `gateway_transaction_id` / idempotency_key) and advances its status; a `captured` event also transitions the invoice to `Paid` and records `amount_paid`; a `failed` event leaves the invoice `Open` with `failure_code`/`failure_reason` set.
- [ ] Out-of-order / unmatched webhook events are no-ops; replays apply once (Webhook Event dedupe).
- [ ] **Concurrent `pay_invoice` on one invoice → only one attempt reaches `captured`.**
- [ ] `charges.cleanup_payment_logs` (daily scheduler) prunes `Payment Attempt` + processed/ignored `Webhook Event` older than `payment_log_retention_days` (default 90); never prunes non-terminal attempts, attempts on unsettled invoices, or attempts referenced by a `Refund`.
- [ ] Full Stripe test-mode cycle: open → charge → webhook → attempt `captured` + invoice `Paid`, notification logged.

## Blocked by

- #02
- #05
- #09
