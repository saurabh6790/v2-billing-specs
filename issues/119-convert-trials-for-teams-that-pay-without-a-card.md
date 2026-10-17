# 119 — Convert trials for teams that pay without a card

**Type:** HITL · **Milestone:** TR · **Area:** `central/signups/` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

Conversion is triggered only by a Payment Method becoming Active (`on_payment_method_update`). An INR
team that chose Manual Checkout, or pays by prepaid wallet top-ups, never adds one. Its trials cannot
convert even when its wallet has money. It also never gets the welcome credit.

## Decision needed

What counts as "this team can pay" for a trial? The proposal: an Active payment method, **or**
Manual Checkout with a complete billing profile, **or** paid-in wallet credit that covers the
trial plan's first month.

## What to build

1. One function, `can_pay(team)`, used by conversion and by the purchase check, so both agree.
2. A wallet top-up and a switch to Manual Checkout also call `convert_team`.
3. Decide whether these teams get the welcome credit. Today they do not.

## Acceptance criteria

- [ ] INR Manual Checkout team with a trial: switching to Manual Checkout converts the trial.
- [ ] Team that tops up enough to cover the plan's first month: the trial converts.

## Blocked by

#113 and the decision above.
