# 114 — No free trial for a team that has paid before

**Type:** AFK · **Milestone:** TR · **Area:** `central/signups/trial.py`, `central/resource_actions.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

A signup site is a free trial when the team has no **Active** payment method at that moment
(`is_free_trial_creation`). It does not look at the team's history.

So a team whose card expired, failed or was cancelled gets free trial servers again. This includes a
team that is in dunning with unpaid invoices. It can keep opening free servers, up to three at a time,
while its paid servers are being suspended. No trial path checks account standing.

## What to build

1. A team is eligible for a free trial only if it has never paid: no Subscription (any state) and no
   Invoice other than Draft or Cancelled. Put this in one function, `is_trial_eligible(team)`.
2. `is_free_trial_creation` uses it. An ineligible team's signup site goes through the normal purchase
   path: payment method or credit, and the spend limit.
3. The signup page shows the reason when the team is not eligible and offers to add a card.

## Acceptance criteria

- [ ] Team with an expired card and a past invoice: a signup site is refused with
      `PAYMENT_METHOD_REQUIRED`, not created as a trial.
- [ ] Team with a suspended subscription: same.
- [ ] Brand new team with no card: still gets a trial.

## Blocked by

#115, so the decision is stored once and not recomputed.

**Done** on central `fix/trial-billing`: `67b6b39b`.
