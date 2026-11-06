# 118 — Count trials per owner, not per team

**Type:** AFK · **Milestone:** TR · **Area:** `central/resource_actions.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

The limit of three open trials (Central Settings, Trial Servers per Team) is checked per team in
`trial_site_count`. Any user can create more teams, and each new team gets three more free servers.
The welcome credit is already checked per owner (`has_owner_received_welcome_credits`). Trials are not.

## What to build

1. `trial_site_count` counts open trials and pending trial creations across all teams owned by the
   team's owner.
2. Rename the setting to Trial Servers per Owner, with a patch that keeps the value.

## Acceptance criteria

- [ ] Owner with three open trials on team A cannot open a fourth on team B.
- [ ] Owner whose trial on team A ended and was deleted can open a new one.

## Blocked by

None.

**Done** on central `fix/trial-billing`: `a998c763`.
