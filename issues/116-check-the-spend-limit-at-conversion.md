# 116 — Check the spend limit when trials convert

**Type:** AFK · **Milestone:** TR · **Area:** `central/signups/trial.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

A free trial skips the spend-limit check (headroom against the trust tier) when it is created, which
is right, because nothing is bought. But conversion also skips it. `ensure_subscription_enabled`
creates the subscription without `enforce_headroom`. A team on the entry tier with three trials that
adds a card gets three subscriptions at once, even if they are above its limit.

## What to build

1. In `convert_team`, convert the trials one at a time, oldest first, and check each against the
   team's remaining headroom.
2. A trial that does not fit stays Active and keeps its end date. Record the reason in Trial Error,
   and tell the user which site was not converted and why.
3. When the tier goes up (a promotion), the daily job converts the waiting trials that now fit.

## Acceptance criteria

- [ ] Entry-tier team with three trials whose total rate is above the limit: only the trials that fit
      are converted. The rest stay Active with a reason.
- [ ] Nothing changes for a team whose trials fit.

## Blocked by

#113.

**Done** on central `fix/trial-billing`: `5be9679d`.
