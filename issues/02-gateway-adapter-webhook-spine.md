# 02 — Gateway config + adapter + Stripe + signature-first webhook spine

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [payments.md](../payments.md)

## What to build

The gateway layer end-to-end: a `Payment Gateway` config DocType (encrypted credentials/webhook secret, `adapter_key`, currency), the `GatewayAdapter` interface, a Stripe adapter (charge / refund / `verify_webhook_signature` / `parse_webhook_event`), and a secure webhook receiver. The webhook endpoint verifies the gateway HMAC **as its first operation, before any DB access**, then stores a `Webhook Event` deduped on `gateway_event_id` and enqueues a job. No business logic in the request cycle. Core billing never imports gateway code.

## Acceptance criteria

- [ ] `Payment Gateway` config DocType; secrets encrypted and never returned by any customer API.
- [ ] `GatewayAdapter` interface + Stripe adapter passing a shared contract-test suite (charge, decline, timeout-with-idempotency, refund, valid/invalid signature).
- [ ] Signed test webhook → 200 and stored; **unsigned/invalid → 400 with zero DB writes**.
- [ ] Replay of a processed `gateway_event_id` → 200, no duplicate record, no second job.
- [ ] Signature verification occurs before any DB lookup (regression test for the v1 enumeration bug).

## Blocked by

None - can start immediately.
