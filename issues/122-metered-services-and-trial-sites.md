# 122 — Decide how team-level metered usage from trial sites is billed

**Type:** HITL · **Milestone:** TR · **Area:** `central/billing/api/billing_api.py` (`report_usage`) · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

Team-level metered services (AI tokens, email, PDF) are billed through `report_usage` against the
team's service subscription. It does not know whether the usage came from a trial site. A trial team
with no service subscription loses the usage (`recorded` is False). A team that has one is billed for
usage inside a trial site that is otherwise free.

This does not bite today, because trial products do not use these services yet. It will once Raven or
Helpdesk use AI tokens.

## Decision needed

During a trial, is metered usage free up to an allowance, free in full, or billed?

## What to build

Once decided: carry the site on the usage report, and apply the trial rule before rating.

## Blocked by

The decision above.
