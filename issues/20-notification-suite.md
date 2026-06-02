# 20 — Notification suite (sole sender)

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [architecture.md](../architecture.md), [payments.md](../payments.md)

## What to build

The full notification suite, with **Cloud Billing as the sole sender** (fixing v1's duplicate emails from both Press and the gateway). Events: payment success, payment failure (with reason), each retry, overdue, credit-low, card/mandate expiry, trial-expiring. A `Notification Log` per team; customer notification preferences honoured.

## Acceptance criteria

- [ ] `Notification Log` per team; one sender (Cloud Billing) — no gateway-sent duplicates.
- [ ] Templates for success / failure / retry / overdue / credit-low / card-expiry / trial-expiring.
- [ ] Notifications fire from the correct state transitions (payment, retry, dunning).
- [ ] Customer notification preferences respected.
- [ ] Credit-low uses the forecast threshold (~80%) from #11.

## Blocked by

- #10
- #14
