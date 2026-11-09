# Strategic improvements (D1–D7)

Changes that alter a model or add a surface, not a single screen. Each lists the
decisions it still needs.

## 1. One collection model, visible to the customer

**Issues.** #150, #148, #171. **Decided.** D-01 Prepaid = credits first, then the
saved method; D-12 Prepaid stays separate from Auto Charge (so the engine's
Prepaid-to-Auto-Charge switch on the first method goes, #150). **Still open.** D-02
who may change mode.

The engine already follows the decided rule; the console was written for the other
meaning. Target: one sentence per mode used by the engine, the console and support;
a "How you pay" card on Payments as the only place it changes; method rows that state
their role ("Pays what credit doesn't cover", "Used if the one above fails").

Why strategic: limits, wallet, dunning and onboarding all read this mode.

## 2. One meaning for the spending limit

**Issues.** #147, #162, #177, #180. **Decided.** D-13: base cost before tax (today's
gate).

Today six figures with different tax bases sit around one limit, and the gate uses
a seventh. Target: the limit means the monthly base cost of what runs, shown on
every card, in the plan menu, at purchase and in the refusal, each with "Taxes are
added on top". Then the Overview shows one cost figure with its basis.

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

**Issues.** #156 (budget alert), #170 (Email invoice, Auto-recharge). **Decided.**
D-14 no auto-recharge (remove the switch); D-15 budget alerts are built.

Three controls promise something the backend does not do. Rule for new UI: no
control ships before its endpoint, and a saved setting has a reader.

## 7. Subscription billing follows the server's life

**Issues.** #175, #176. **Decided.** D-16 stopped servers bill disk only; D-17 Pause
billing stays its own action and bills nothing (D-18); dunning stops bill nothing
(D-19). **Open.** D-25 (snapshot instead of disk).

Pause, stop, resume and terminate each have one stated effect on the bill, the
engine applies it through Subscription Change rows, and a readiness check proves no
terminated or paused server has an open segment. Today pause is ignored by rating
and stop is not described anywhere the customer looks.

## 8. Purchase you can predict

**Issues.** #177, #178, #179.

Before Create, the customer sees the monthly total before tax, whether credit
covers it, and the limit in the same words the server uses. Every refusal is
counted, so tier limits can be tuned from data.

## 9. A Desk for support, not only for catalog

**Issues.** #181, #182, with #149, #167.

Billing home opens with what needs attention and a team search; numbers exclude
internal teams; open alerts are a list, not only a channel message.

## 10. Metered services on a daily ledger

**Issues.** #187, #186, #188, #189. **Decided.** D-20 to D-24, D-26, D-27.

Every metered service writes one row per subject and day; the month is the sum of
its days, compared with what the plan includes, and the same rows feed the
customer's usage chart. AI is billed from Grove's landed usage, storage from daily
samples. Design: [daily-usage-store.md](../13-brainstorming/daily-usage-store.md).

## 11. Remaining verification

Phone width, keyboard-only and screen-reader passes; the Pay and add-method flows
and the New server page end to end on a demo site migrated to the current code;
Plan Configurator, Billing Simulator and report numbers. These would confirm or
drop H-01 to H-04 and A-01 to A-14.
