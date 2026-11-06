# 113 — A card converts only the trials the customer is still using

**Type:** AFK · **Milestone:** TR · **Area:** `central/signups/trial.py`, `central/signups/credit.py` · **Write-up:** [trials-review.md](../trials-review.md)

## Problem

When a payment method becomes Active, `convert_team` converts every Active **and Ended** trial site
of the team. For an Ended trial, the conversion job starts the stopped server, and the server gets a
subscription and starts billing.

Example: a user tries Raven, leaves it, and the trial ends on day 7. Two weeks later they sign up for
Helpdesk and add a card on day 3 of that trial. Raven's server starts again and both servers are
billed. The user did not ask for Raven back. This ends in a refund or a dispute.

## What to build

1. On card activation, convert only **Active** trials. They are running and the customer is using them.
2. An **Ended** trial stays Ended. Its deletion date stays as it is.
3. Allow **Start** on an Ended trial's server once the team has an active payment method. Starting it
   converts that one site (`convert_site`) and then starts it. Today `submit_command` refuses this
   start with "Add a payment method".
4. The `trial_converted` email and the console say which sites became paid. The Ended ones get a
   line: "Start it to keep it. It is deleted on <date>."

## Acceptance criteria

- [ ] Team with one Active and one Ended trial adds a card: the Active site is Converted and billed.
      The Ended site stays Ended and stopped, with no subscription.
- [ ] Starting the Ended site after that converts it and creates its subscription.
- [ ] An Ended site that is not started is deleted on its date as before.
- [ ] Welcome credit rule (`is_welcome_credit_due`) is unchanged.

## Blocked by

None.

**Done** on central `fix/trial-billing`: `b7bc102c`.
