# 181 — The Desk billing home counts internal teams as customers and has nothing for support work

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:operations` `priority:p2` `area:operator-desk`
**Area:** `central/billing/workspace/billing/billing.json`, `central/billing/number_card/*`, `central/workspace_sidebar/billing.json`
**Source:** [CB-41](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Operators open the billing home and see numbers that mix internal and paying teams, catalog shortcuts first, and no path to the team they are helping.

## Current behaviour

- Number cards count every team: Active Subscriptions filters only `enabled = 1`, Open and Overdue Invoices only on status (`central/billing/number_card/*`). Production backup: 81 active subscriptions, of which 14 belong to external teams.
- Seen on the demo site: home order is At a glance, Manage catalog, Dashboards, Reports.
- The sidebar has about 90 links grouped by DocType. Team, where Grant Credit, Adjust Credit and Suspend live (`central/identity/doctype/team/team.js`), is not in it. Entitlement Token is (0 rows in production; retired by ADR 0006).
- No home block lists what needs attention: unfinished setups and top-ups, held invoices, open operator alerts (#182).

## What we want

The home shows external-team numbers by default and opens with a short "Needs attention" list and a team search.

**Who it affects:** Support, finance, billing on-call.

**Why it matters:** Wrong picture of the business; slower tickets.

## Options

- A. External-only filters on the cards; a Team link and a "Needs attention" block at the top; drop Entitlement Token.
- B. A only for the cards.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, sharing its queries with #149 and #182.

## Acceptance criteria

- [ ] Number cards exclude internal teams, and their labels say so.
- [ ] The sidebar has Team under Customers; Entitlement Token is gone.
- [ ] The home starts with a "Needs attention" block linking to the lists from #146, #182 and held invoices.

## Dependencies

#149 (team billing view). #182 for the alert list.
