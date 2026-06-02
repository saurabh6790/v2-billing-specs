# 08 — Razorpay adapter + UPI Autopay mandate

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [payments.md](../payments.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

A Razorpay adapter (card + UPI Autopay mandate) passing the same `GatewayAdapter` contract suite as Stripe, plus the mandate lifecycle. A mandate is created with **`max_amount` = the team's trust-tier cap**, so a bill can never exceed it. A tier promotion that raises the cap triggers **mandate re-authorisation** (customer re-consent); until re-consent the team is held at the old ceiling. Cards are exempt (off-session, any amount).

## Acceptance criteria

- [ ] Razorpay adapter passes the shared contract suite (charge, refund, valid/invalid signature).
- [ ] UPI mandate setup sets `max_amount` = current trust-tier cap.
- [ ] Tier promotion above the mandate ceiling emits a re-authorisation prompt; team functionally held at old cap until re-consent.
- [ ] Razorpay webhooks flow through the signature-first receiver (#02).
- [ ] Integration test: add card / mandate in test mode → validate → active.

## Blocked by

- #02
- #07
