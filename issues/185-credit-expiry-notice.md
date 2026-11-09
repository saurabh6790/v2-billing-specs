# 185 — Promotional credit expires with no notice to the team

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:feature` `priority:p2` `area:wallet`
**Area:** `central/billing/revenue/credits.py`, `central/fixtures/notification_event_type.json`, `central/billing/platform/notifications.py`
**Source:** [CB-45](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Under the Prepaid rule the wallet pays first. When a grant expires, the next invoice falls to the card with no warning.

## Current behaviour

- `run_credit_expiry` (daily) expires promotional grants (`central/billing/revenue/credits.py:766-800`). It sends no notification.
- The billing notification types (`central/fixtures/notification_event_type.json`) have `credit_low` but no credit-expiry event. H-04 confirmed.
- The only signal is one hint on the Overview facts card (`CycleFacts.vue:91-99`).
- Production backup: 32 promotional grants, all with an expiry (validity 60 days, Billing Settings).

## What we want

Billing-capable members get a notice 7 days before a grant expires (amount, date, what pays after) and an in-app entry when it expires.

**Who it affects:** Prepaid teams with promotional credit (every team that got a welcome or beta credit).

**Why it matters:** An unexpected card charge or, with no card, an unpaid invoice.

## Options

- A. New `credit_expiring` event sent by the expiry job 7 days ahead, once per grant; `credit_expired` in-app on expiry.
- B. Fold into `credit_low`.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A grant expiring in 7 days sends one notice naming amount, date and what pays after.
- [ ] Expiry writes an in-app entry.
- [ ] No notice for purchased credit (it never expires).
- [ ] Tests cover the 7-day notice once per grant and the expiry entry.

## Dependencies

None. Wallet history per-grant expiry is #160.
