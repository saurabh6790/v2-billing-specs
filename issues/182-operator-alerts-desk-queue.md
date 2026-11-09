# 182 — Open operator alerts are visible only in Raven or email, with no list in Desk

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:operations` `priority:p2` `area:operator-desk`
**Area:** `central/billing/platform/alerts.py`, `central/billing/workspace/billing/billing.json`
**Source:** [CB-42](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The hourly alert job finds stuck payments, failed webhooks, held invoices, running suspended servers and more, but the only record is a message or an Error Log row. Nobody can see what is open now.

## Current behaviour

- `collect()` gathers nine alert kinds (`central/billing/platform/alerts.py:36-309`); `run_operator_alerts` posts to Raven or email and writes an Error Log row (`:437-462`). There is no Desk list of open alerts and no way to mark one handled other than muting the kind.
- In the production backup, the Raven fields and `operator_alert_emails` are empty, and Error Log (1 to 15 Oct) has no "Billing operator alert" rows. The settings row was changed by the local migrate on 6 Nov, so this may not reflect production (H-05).
- Issue 145 built the Raven routing; it does not add a Desk view.

## What we want

A Desk report lists open alerts by kind with links to the record, the same data the hourly job sends.

**Who it affects:** Billing on-call, support, finance.

**Why it matters:** An alert missed in a channel is lost; there is no shared view of what is open.

## Options

- A. Query report "Billing Alerts" calling `collect()`, linked from the billing home.
- B. Persist alerts as documents with an owner and status.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A first; B only if alerts need assignment.

## Acceptance criteria

- [ ] A Desk report shows each open alert with kind, team, record link and age.
- [ ] Muted kinds are shown as muted, not hidden.
- [ ] The billing home links to it.
- [ ] Confirm on production that the alert channel is configured (H-05).

## Dependencies

Issue 145 (done in code). #181.
