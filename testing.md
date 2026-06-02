# Testing

## Purpose

Prove correctness on the paths where v1 broke: concurrency, signatures, idempotency, billing math, and failure isolation.

## Unit tests

- **Gateway adapter contract suite** (every adapter must pass): successful charge, declined card, network timeout with retry (idempotency prevents double-charge), refund, valid + invalid webhook signature. Against gateway test mode or HTTP mock.
- **Credit ledger concurrency:** 10 concurrent threads apply credits to one team → correct final balance, no negative, no duplicate debit, `running_balance` matches cumulative sum.
- **Billing day computation:** known event-log timestamps → whole-day counts, new-plan-wins-the-day, `max(1,…)` floor, no sub-day arithmetic in output.
- **Metering aggregation:** counter (summed deltas) vs gauge (GB-days); idempotent re-push replaces not adds.
- **Two-axis state machine:** every valid transition passes; every invalid one raises `InvalidTransition`.
- **Webhook idempotency:** duplicate `gateway_event_id` → 200, no duplicate record, no second job.
- **Tax:** additive output, zero-rating reason, withholding (`expected_collection`, paid-state with withholding=0 and >0).

## Integration tests

- **Full Stripe / Razorpay cycle** including UPI mandate validation → charge → webhook → `Paid`, ledger debited, notification logged.
- **Two-phase invoice generation:** 50 subscriptions → drafts on 28th, open+collect on 1st with 10 concurrent workers → one draft each, all transitioned, **no invoice processed twice, no duplicate payment attempt.**
- **Usage event + meter sync:** events + rollups pushed → invoice line items match expected durations + metered amounts.
- **Free/trial cost report:** `cost_report` invoice generated (not billed), subsidy total includes the team.
- **ERPNext failure isolation:** ERPNext returns 500 → invoice still `Paid`, customer notified, sync queued for retry, no rollback.
- **Entitlement token:** offline verification; expired-token + Central-unreachable → deny new, keep running; suspend directive stops running.

## Security tests

- Webhook without valid signature → 400, **zero DB records**.
- Agent API key on a customer endpoint → 403.
- Replay of a processed webhook → 200, no side effects.
- Concurrent `pay_invoice` on one invoice → only one attempt reaches `captured`.
- No raw SQL interpolation (`bandit` + `grep`).

## Tools

| Layer | Tool |
|-------|------|
| Unit / integration | `frappe.tests.UnitTestCase` + `pytest` |
| HTTP mocking | `responses` (Razorpay), `stripe-mock` (Stripe) |
| Load | `locust` (1000-subscription run, webhook flood) |
| Static analysis | `bandit`, `ruff` |
| CI | GitHub Actions: lint → unit → integration per PR |
