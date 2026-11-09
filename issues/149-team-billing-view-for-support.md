# 149 — Support has no single view of a team's billing

**Type:** HITL · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:operations` `priority:p1` `area:operator-desk`
**Area:** `central/billing/doctype/`, `central/identity/doctype/team/`, `central/workspace_sidebar/billing.json`
**Source:** [CB-18](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-03 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

Answering one billing question means opening several Desk lists filtered by team, or impersonating the customer.

## Current behaviour

- `central.billing.api.admin.teams.get_team_billing` exists (`central/billing/api/admin/teams.py:33-60`) and has no caller.
- No `team_dashboard.py` in `central/identity/doctype/team/`, so the Team form links to no billing records.
- The Billing sidebar lists 95 items by DocType, including the retired Entitlement Token (`central/workspace_sidebar/billing.json:257-258`).

## What we want

One Desk view answers: can this team pay, how, what is owed, what failed and why, what changed recently.

**Who it affects:** Support agents; finance operators.

**Why it matters:** Slow tickets; issues like unfinished setups (#146) are invisible without manual list work.

## Options

- A. Desk page "Team billing".
- B. Team form connections + summary block.
- C. Query report by team.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

B first, A next.

## Acceptance criteria

- [ ] Team form shows connections to Billing Profile, Payment Method, Invoice, Payment Attempt, Refund, Credit Ledger Entry.
- [ ] A summary shows profile completeness, collection mode, methods incl. unfinished with reason, open invoices with hold reason, wallet balance, last 20 billing events.
- [ ] Entitlement Token is removed from the sidebar.
- [ ] Only operators can open it.

## Dependencies

D-03.
