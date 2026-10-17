# 115 — Decide "is this a free trial" once, when the request is made

**Type:** AFK · **Milestone:** TR · **Area:** `central/signups/trial.py`, `central/infrastructure/doctype/resource_action/` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

Whether a server is a free trial is worked out again and again, each time from "does the team have an
Active card **now**":

- `validate_purchase` at request time and on every retry,
- `_finalize` when the region accepts the server (subscription or not),
- `is_billing_deferred` until Central records the Site row,
- `start_trial` when the Site row is recorded.

The answer can change between these steps. If the card is cancelled after the request but before the
site is recorded, a paid server becomes a free trial. If a card is added in that gap, the server is
billed but `convert_team` never sees it, because the Site row does not exist yet. The gap is a few
minutes, so it is rare, but the result is not predictable and it is hard to explain to a customer.

## What to build

1. Add `is_free_trial` (Check, read only) to Resource Action. Set it once in `submit_request` from
   `is_free_trial_creation`.
2. `_finalize`, `is_billing_deferred`, `start_trial` and `revalidate_purchase` read the stored flag.
   Nothing after the request asks about the card again.
3. A card added before the Site row exists: `convert_team` also converts pending trial creations, by
   marking the request so `start_trial` records the site as Converted and `_finalize` creates the
   subscription.
4. Patch: set the flag on existing create requests from their Site's `trial_state`.

## Acceptance criteria

- [ ] Card cancelled between request and site record: the server stays paid.
- [ ] Card added between request and site record: the site is Converted, billed from the day the card
      was added, and the welcome credit rule applies once.
- [ ] Retry of a trial creation does not run the purchase checks.

## Blocked by

None. #114 and #117 build on it, and #112 can switch to the stored flag once it lands.

**Done** on central `fix/trial-billing`: `cb30ab35`.
