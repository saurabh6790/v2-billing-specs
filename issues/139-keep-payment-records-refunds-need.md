# 139 — Keep the payment records that refunds and disputes need

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/charges.py` (`cleanup_payment_logs`), `central/billing/settings.py`

## Problem

Still open from the audit of 15 Oct (B1). The daily cleanup deletes Captured Payment Attempts after the retention window. A later refund or chargeback then finds no charge. A retention of 0 deletes them every day.

## TODO

- [ ] Never prune a Captured or Refunded attempt. Prune only Failed attempts and processed Webhook Events.
- [ ] Refuse a retention below 180 days, and patch sites set below it.

## Acceptance criteria

- [ ] A refund on a 200-day-old charge finds its attempt.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
