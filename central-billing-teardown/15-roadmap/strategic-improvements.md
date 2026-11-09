# Strategic improvements (D1–D4)

Changes that alter a model or add a surface, not a single screen. Each lists the
decisions it still needs.

## 1. One collection model, visible to the customer

**Issues.** #150, #148, #171. **Decided.** D-01 Prepaid = credits first, then the
saved method. **Still open.** D-02 who may change mode; D-12 whether Prepaid stays
separate from Auto Charge.

The engine already follows the decided rule; the console was written for the other
meaning. Target: one sentence per mode used by the engine, the console and support;
a "How you pay" card on Payments as the only place it changes; method rows that state
their role ("Pays what credit doesn't cover", "Used if the one above fails").

Why strategic: limits, wallet, dunning and onboarding all read this mode.

## 2. One meaning for the spending limit

**Issues.** #147, #162. **Open.** D-13.

Today six figures with different tax bases sit around one limit, and the gate uses
a seventh. Target: the limit means one figure (recommended: monthly run-rate of
what runs, today's gate), shown on every card, in the plan menu and in the refusal.
Then the Overview shows one cost figure with its basis.

Why strategic: 61 of 64 teams are on a $100 / ₹8,300 limit. This is the most
frequent point of friction once teams start creating servers.

## 3. Support console for billing

**Issues.** #149, #167; existing #125. **Open.** D-03.

A team billing page in Desk built on `get_team_billing`, showing setup attempts
(#125), unfinished top-ups, held invoices, and the actions support may take, each
writing a Billing Event.

## 4. Customer-safe error model

**Issue.** #163.

Typed domain errors mapped once in `api/dashboard`, a reference id on unknown
errors, and a Guard rule banning internal words. The glossary (#174) covers client
strings.

## 5. Payment outcome loop

**Issues.** #146, #165, #164.

Every money action (add method, pay, top-up) ends in a state the customer sees
without reloading: done, failed with a reason, or "we'll email you". Polling first;
push when Central has a channel.

## 6. Promises the product makes

**Issues.** #156 (budget alert), #170 (Email invoice, Auto-recharge). **Open.** D-14,
D-15.

Three controls promise something the backend does not do. Rule for new UI: no
control ships before its endpoint, and a saved setting has a reader.

## 7. Remaining verification

Phone width, keyboard-only and screen-reader passes; the Pay and add-method flows
end to end on a demo site migrated to the current code. These would confirm or
drop H-01 to H-04 and A-01 to A-14.
