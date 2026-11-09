# Support has no single view of a team's billing

> **Draft for review. Not published. Not assigned.**

| | |
|---|---|
| Problem | [CB-18](../../04-problem-discovery/problem-register.md) |
| Labels | `type:operations`, `priority:p1`, `area:operator-desk` |
| Priority | P1 |
| Complexity | M |

## Problem
Answering one billing question means opening several Desk lists filtered by team, or impersonating the customer.

## Current behaviour
- `central.billing.api.admin.teams.get_team_billing` exists (`central/billing/api/admin/teams.py:33-60`) and has no caller.
- No `team_dashboard.py` in `central/identity/doctype/team/`, so the Team form links to no billing records.
- The Billing sidebar lists 95 items by DocType, including the retired Entitlement Token (`central/workspace_sidebar/billing.json:257-258`).

## Expected outcome
One Desk view answers: can this team pay, how, what is owed, what failed and why, what changed recently.

## Affected users
Support agents; finance operators.

## Evidence
See the current behaviour above; full detail in [CB-18](../../04-problem-discovery/problem-register.md). Code at central `a95b491e`; production counts from the backup of 3 Nov 2026.

## Business impact
Slow tickets; issues like unfinished setups (#1) are invisible without manual list work.

## Solution options
- A. Desk page "Team billing".
- B. Team form connections + summary block.
- C. Query report by team.

Comparison: [solution-alternatives.md](../../05-brainstorming/solution-alternatives.md).

## Recommended approach
B first, A next.

## Acceptance criteria
- [ ] Team form shows connections to Billing Profile, Payment Method, Invoice, Payment Attempt, Refund, Credit Ledger Entry.
- [ ] A summary shows profile completeness, collection mode, methods incl. unfinished with reason, open invoices with hold reason, wallet balance, last 20 billing events.
- [ ] Entitlement Token is removed from the sidebar.
- [ ] Only operators can open it.

## Dependencies
D-03. Decisions: [product-decisions-required.md](../../05-brainstorming/product-decisions-required.md).
