# 121 — Welcome credit amount per product

**Type:** AFK · **Milestone:** TR · **Area:** `central/signups/doctype/product/`, `central/billing/payments/provisioning.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

We want to offer $5 on some signups and $10 on others. The welcome credit amount is set only per
currency in Billing Settings (10 USD, 1000 INR on a new install). It cannot change by product or by
how the user came in.

## What to build

1. Add a Welcome Credit Amounts table (currency, amount) on Product. Empty means Billing Settings.
2. `grant_welcome_credits` and `get_welcome_credit_offer` take the amount from the product of the
   team's earliest Active trial. A team with no trial uses Billing Settings.
3. The once-per-owner rule does not change.

## Acceptance criteria

- [ ] Raven set to 5 USD: a Raven trial team that adds a card in time gets 5 USD.
- [ ] A direct Central team gets the Billing Settings amount.
- [ ] The trial email, in-app panel and console show the same amount that is granted.

## Blocked by

None.
