# 112 — Make trial servers sleep in production

**Type:** AFK · **Milestone:** TR · **Area:** `central/integrations/resource_actions.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

We tell every trial user that their site sleeps after 10 minutes without visitors. The trial
emails, the in-app panel and the operator guide all say so. In production it never sleeps.

`idle_shutdown_seconds(team)` decides the `sleep_after_idle_seconds` that goes to Atlas when a server
is created. It returns 0 unless `Team.is_staging_trial` is set. That flag comes from Billing Settings,
Provision Teams as Trial, which is off in production and meant for staging only. So a production
trial server is created with sleep off and runs all the time.

```python
def idle_shutdown_seconds(team: str) -> int:
	if not frappe.db.get_value("Team", team, "is_staging_trial"):
		return 0
```

## What to build

1. Pass the request to `idle_shutdown_seconds` and return the trial idle time when the request is a
   free trial (`is_free_trial_creation(team, resource_type)`, or the stored flag from #115 once it
   exists). Keep the staging-trial case.
2. Leave conversion as it is. `finish_conversion` already turns sleep off on a converted server.

## Acceptance criteria

- [ ] A signup site for a team without a card is created with `sleep_after_idle_seconds` = Trial Idle
      Shutdown minutes × 60.
- [ ] A bought server, and a signup site for a team with a card, is created with 0.
- [ ] A staging-trial team still gets sleep.
- [ ] Test on the create payload for all three cases.

## Blocked by

None. Ship first.
