# 180 — A project's spending limit is checked only when a server is tagged, and its errors show internal ids

**Type:** AFK · **Milestone:** TD · **Priority:** P3 · **Size:** S · **Labels:** `type:bug` `type:ux` `priority:p3` `area:subscriptions`
**Area:** `central/billing/doctype/subscription/subscription.py`, `central/billing/catalog/subscriptions.py`, `dashboard/src/components/billing/CreateProjectDialog.vue`, `RenameProjectDialog.vue`, `ProjectsPanel.vue`
**Source:** [CB-36](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The project limit does not do what its form says, and its refusals are written for engineers.

## Current behaviour

- The form says the limit "Prevents adding a resource when its monthly cost would put the project over this limit" (`CreateProjectDialog.vue`).
- The check runs only when a subscription is new or its project changes (`subscription.py:76-82`). A resize inside the project is not checked (`_plan_resize`, `subscriptions.py:601-631`). A server cannot be put in a project when it is created.
- Errors: "Project {name} belongs to team {team}, not {team}." and "Project {name} is disabled; its servers bill untagged on {team}'s consolidated invoice." use internal names and are not translated (`subscription.py:66-73`). "… would exceed its spending limit ({0} committed, {1} available)" labels the new server's rate as "committed" (`subscriptions.py:1100-1106`).
- The limit field shows no currency and no tax basis.
- Production backup: 2 projects, 1 enabled, 0 with a limit, 1 tagged subscription.

## What we want

The project limit applies to tagging and to resizes, says before tax, and its errors use the project title and plain words.

**Who it affects:** Teams that group servers by customer or environment.

**Why it matters:** Low today (no project has a limit).

## Options

- A. Run `enforce_project_headroom` on resize for the added rate; rewrite the three messages; label the field with currency and "before tax".
- B. Copy only.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A resize that would take a project over its limit is refused with the project title, the added amount and what is left.
- [ ] Messages use the project title, are wrapped in `_()`, and contain no team or document ids.
- [ ] The limit field shows the team currency and "before tax".
- [ ] Tests cover tag and resize over the limit.

## Dependencies

D-13 (before tax).
