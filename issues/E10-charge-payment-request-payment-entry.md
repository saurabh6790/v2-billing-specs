# E10 — Charge → Payment Request → webhook → Payment Entry → Paid

**Builds on:** ERPNext + frappe/payments · **Replaces:** old #10 · **Phase:** P3 · **Type:** AFK
**Blocked by:** E03, E06, E09

## Goal

Collect a submitted Sales Invoice off-session and confirm it via webhook, recording an ERPNext
**Payment Entry** — never marking paid on the API response. See [payments.md](../payments.md).

## Scope

- `pay_invoice(sales_invoice)`: create a **Payment Request** carrying the gateway + an idempotency key
  derived from the request name → `controller.fc_charge(sales_invoice, method, idempotency_key)` with
  amount = `fc_expected_collection` (integer minor units, pass-through) → **wait for the webhook**.
  The API response only stamps the gateway transaction id.
- **Webhook transition job** (from E03's spine): map `NormalisedEvent` →
  - authorised / `requires_capture` → record authorised, no ledger move;
  - captured / `payment_intent.succeeded` → **create a Payment Entry against the Sales Invoice** →
    ERPNext native settle → `status = Paid`;
  - failed → record failure → re-enter `collect_invoice` (fallback, E18) / dunning (E14).
- **Concurrency:** `Sales Invoice … FOR UPDATE` + in-flight Payment Request guard prevent two Payment
  Entries; out-of-order/unmatched events are no-ops (Webhook Event dedupe).

## Acceptance

- An invoice goes `Paid` **only** on the captured webhook, via a Payment Entry that matches the
  charged amount to the paisa; the API response never sets Paid.
- A replayed or out-of-order webhook produces no double Payment Entry.
- A synchronous decline and an async webhook failure both funnel into the same idempotent collector.
- Idempotency key reuse on retry prevents a double charge at the gateway.

## Out of scope

Refunds (E15); secondary-method fallback ordering (E18); reconciliation of lost webhooks (E24).
