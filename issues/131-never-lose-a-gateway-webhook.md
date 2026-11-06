# 131 — Never lose a gateway webhook, and give late money a home

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/webhooks.py`, `central/billing/payments/charges.py` (`apply_webhook`, `_mark_invoice_paid`), `central/billing/platform/alerts.py`, `central/billing/doctype/webhook_event/`

## Problem

When a webhook handler raises, the Webhook Event stays `Received`. No code ever moves an event to `Failed`, the `failed_webhook` alert reads only `Failed`, and nothing re-runs `Received` events. A lost enqueue (Redis down at commit) ends the same way.

A capture that reaches a Cancelled or Waived invoice raises `InvalidTransition` (Cancelled to Paid), so captured money ends with no record. A second capture on an already Paid invoice is marked Processed and kept silently (review of 15 Oct, #4).

## TODO

- [ ] Wrap `handle_webhook_event`. On an exception, roll back the handler's writes, mark the event `Failed` and store the error.
- [ ] Retry `Failed` events with backoff up to a limit. Add a sweeper for events still `Received` after 10 minutes.
- [ ] When a capture reaches a Cancelled, Waived or already Paid invoice, book it to the team's wallet (or refund it, by setting) and raise an operator alert.
- [ ] Add a desk action on Webhook Event to reprocess one event.

## Acceptance criteria

- [ ] A handler that raises leaves the event `Failed` with the error, and the hourly alert lists it.
- [ ] A capture on a Cancelled invoice ends as a wallet credit or a refund, plus an alert.
- [ ] A second capture on a Paid invoice is never kept without a record.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

128
