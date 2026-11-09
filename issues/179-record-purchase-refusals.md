# 179 — Refused server creates and resizes leave no record, so nobody can see how often customers hit the spending limit

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:operations` `priority:p2` `area:purchase`
**Area:** `central/billing/catalog/subscriptions.py` (`enforce_headroom`), `central/resource_actions.py` (`require_payment_method_or_credit`), `central/billing/platform/metrics.py`
**Source:** [CB-40](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

The spending-limit and payment refusals throw before a Resource Action exists, and a validation error is not logged. The most frequent purchase friction is invisible.

## Current behaviour

- `enforce_headroom` and `require_payment_method_or_credit` raise before the create is recorded (`subscriptions.py:1044-1063`, `resource_actions.py:525-546`).
- Production backup: 239 paid create actions, 81 failed, all for infrastructure reasons (ATLAS_REJECTED, mailbox pool, capacity). None is a billing refusal, because those never become actions. Error Log has 0 entries for headroom or payment refusals.
- 61 of 64 external teams are on a $100 / ₹8,300 limit (checkpoint 2), so refusals are expected.

## What we want

Each refusal is counted per team and reason, and support can see a team's recent refusals.

**Who it affects:** Product, support, finance (tier policy).

**Why it matters:** Tier limits cannot be tuned and #147 cannot be measured.

## Options

- A. Emit a metric and a Billing Event per refusal (team, reason, requested rate, headroom).
- B. Metric only.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A. The Billing Event makes it visible in the team billing view (#149).

## Acceptance criteria

- [ ] A refused create or resize writes one Billing Event with team, reason code, requested monthly rate and remaining headroom.
- [ ] A metric counts refusals by reason.
- [ ] No customer-facing behaviour changes.
- [ ] A test covers each refusal reason.

## Dependencies

None. Feeds #147 and #149.
