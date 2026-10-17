# 117 — Let a paying team try a product it has not used

**Type:** HITL · **Milestone:** TR · **Area:** `central/signups/` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

A user has one team, and every product signup lands on it. Once the team has a card, a signup site is
not a trial at all. It is billed from the first minute. So a Raven customer who wants to try Helpdesk
pays for Helpdesk from day 1, and gets no credit because the owner already had it.

## Decision needed

Should a paying team get a free trial of a product it has never used? The tracker assumes yes.

## What to build (if yes)

1. Trial eligibility is per team **and** product. A team gets one free trial for each product it has
   not had a site of. #114 still applies, so a team with unpaid invoices gets none.
2. The card is no longer the conversion trigger for these teams, because they already have one. The
   trial converts when the user clicks **Keep this site**, or on the end date if they chose "keep it"
   beforehand. Otherwise it ends and is deleted, the same as today.
3. The welcome credit does not change. It is once per owner.

## Acceptance criteria

- [ ] Team with a card and a Raven site signs up for Helpdesk: Helpdesk runs as a free trial for the
      product's Trial Days.
- [ ] Keep this site converts it and starts billing that day.
- [ ] A second Helpdesk signup on the same team is not a free trial.

## Blocked by

#114, #115, and the decision above.
