# 05 — Payment Method lifecycle (Stripe)

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [payments.md](../payments.md)

## What to build

The `Payment Method` lifecycle on Stripe: a customer initiates setup (SetupIntent → client secret), confirms on the frontend, and the method is validated by a **micro-charge (₹1/$0.50) captured and immediately refunded** before moving to `active`. Support set-default and delete. Methods are separate DocTypes (not children of Team).

## Acceptance criteria

- [ ] `Payment Method` DocType (separate) with status `pending_validation → active / failed`, `expired` via monthly scheduler.
- [ ] `initiate_payment_method_setup` returns a client secret; `confirm_payment_method` runs the micro-charge + refund.
- [ ] Method becomes `active` only on a successful micro-charge; failure → `failed`.
- [ ] Set-default and delete work; exactly one default per team.
- [ ] Stripe test-mode integration test covers add → validate → active.

## Blocked by

- #02
