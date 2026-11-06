# 137 — Make money records read-only and keep their history

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/doctype/{credit_ledger_entry,credit_wallet,invoice,payment_attempt,refund,usage_rollup,subscription_change,webhook_event}/`

## Problem

The ledger is append-only by design (ADR 0018), but only by convention. System Manager can edit or delete Credit Ledger Entry, Credit Wallet, Invoice, Payment Attempt, Refund, Usage Rollup, Subscription Change and Webhook Event from Desk or REST. Seven of them keep no change history. Every System Manager can also refund and adjust credit.

## TODO

- [ ] Remove write and delete from those DocType permissions. Keep Invoice changes behind controller methods.
- [ ] Add a controller guard that refuses an update or a delete after insert on ledger-like DocTypes. A correction is a new entry.
- [ ] Turn on `track_changes` for every money DocType.
- [ ] Add a finance role for refunds and credit adjustments, separate from System Manager.

## Acceptance criteria

- [ ] A Desk or REST edit of a ledger entry fails. A test covers it.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
