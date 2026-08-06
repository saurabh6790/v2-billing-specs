# The simulator is the billing engine run forward

Date: 2026-08-06

Nobody can answer "what will happen to this team next month" without waiting for next month.

That is the whole problem. The accounts team administers a system whose behaviour is knowable —
every input is in the database, every rule is in `central/billing` — and their only way to observe it
is to let it run. When a price changes, when a dunning day moves, when a trust tier threshold is
retuned, the blast radius is discovered on the 1st, in production, on real customers. When a customer
asks "why was I charged this", the answer is reconstructed backwards from an invoice that already
went out.

The only forward-looking thing that exists is `get_forecast` (`api/dashboard/invoices.py:29`). It is
a good function and it is nearly the right one: it drives the *real* rating engine —
`invoicing.compute_line_items` plus `metering.metered_line_items` — over the current month and
reports a projected total against the wallet. But it is bounded on four sides. One team, the caller's
own. One period, the current month. One configuration, whatever is live. And it stops at the invoice
total, which is the least interesting half — the questions that hurt are all downstream of it: *when*
is the card charged, what happens when it declines, on which date does this team go Overdue, on which
date does the asset stop.

Meanwhile the knowledge that would answer those questions is real, correct, and locked inside the
code where nobody but us can read it:

- A price change **does not reprice existing subscriptions**. The rate is snapshotted as `locked_rate`
  on each Subscription Change row ([ADR 0010](0010-price-lock-folded-into-subscription-change.md)), so
  raising a Catalog Rate touches new provisions and resizes only. Ask anyone outside the team what a
  20% price rise does to next month's revenue and they will multiply. They will be wrong by roughly
  everything.
- An INR invoice over ₹15,000 is **never silently auto-charged**
  ([ADR 0005](0005-inr-collection-emandate-threshold-prepaid.md)); `collection_mode.evaluate` returns
  Action Required and the customer must act. Dunning knows this and escalates without retrying.
- A machine resized twice inside 24 hours flips its dates from daily to **hourly** billing
  (`invoicing/lines.py`, `CHURN_WINDOW_HOURS`), and the two passes partition the period so the total
  stays exact.
- A late billing run **does not cost the customer grace** — `dunning.defer_dunning` pushes
  `dunning_starts_on` forward, never `due_date`.
- A suspended asset **keeps running** until its already-issued Entitlement Token expires.

Each of these is a deliberate, defensible decision. Each is invisible until it surprises someone.

There is a second, quieter version of the same problem. We change this code constantly, and we have no
way to ask *"did that refactor change anyone's bill?"* The unit suite proves the cases we thought of
against the fixtures we wrote. It cannot prove that day-weighting still produces the same number for
the 400 teams actually in the book.

## The two ways to build this wrong

**A parallel model.** The obvious build is a spreadsheet in Python: reimplement day-weighting, churn,
allowance-and-overage, commitment clawback, GST additive, TDS withholding, and the dunning ladder, in
a fresh `simulation/` package. It would work on the day it shipped and be subtly wrong within a
sprint, because two implementations of one rule always diverge and only one of them gets the bug fix.
A simulator that disagrees with the run is **worse than no simulator**, because it will be believed.
This is the failure mode to design against, and everything below follows from refusing it.

**Replay-and-rollback.** The other tempting build is to run the real thing with a frozen clock inside
a transaction and roll back. On a scratch bench this is fine. On production it is dangerous, and not
marginally:

- `draft_team_page` and `settle_draft_page` call `frappe.db.commit()` **per team, deliberately** — it
  is what keeps the `tabSeries` lock down to milliseconds and the run from deadlocking. A rollback
  cannot undo a commit.
- `charges.pay_invoice` calls the gateway. Stripe does not participate in our transaction.
- `settlement.credit_forecast` defaults to `notify=True`, and `_notify_top_up` fires
  `notifications.notify` and `frappe.publish_realtime`. A naïvely-written simulation run **emails
  customers**.

Full-fidelity replay is a real technique and it has a home: a bench restored from a production backup.
That is a different tool with a different guarantee, and it is not the one the accounts team can click
on a Tuesday.

## Decision

**The simulator does not model billing. It *is* the billing engine, called with a virtual clock and a
mutable input set, on a code path that cannot write.**

The test of the whole design is one sentence: *if the simulator needs a function the production run
does not call, that function is a bug.* Fidelity is not achieved by careful mirroring; it is achieved
by there being nothing to mirror.

### 1. Every billing act splits into a decision and an effect (this buys *fidelity*)

The engine is already almost pure — the impurity is welded on at the end of each act. Break the weld,
and the decision half becomes callable by both callers.

| Act | Decision (pure — shared) | Effect (production only) |
|---|---|---|
| Rate a period | `rate_team_period(team, start, end) -> payload` | `_insert_invoice(payload)` |
| Escalate an unpaid invoice | `dunning_schedule(opened, due, settings) -> [(date, stage)]` | `process_invoice_dunning` executes it |
| Settle an invoice | `settlement_plan(invoice, state) -> {credits, card, shortfall}` | draw the wallet, call the gateway |
| Warn on wallet coverage | `credit_forecast(..., notify=False)` | `_notify_top_up` |
| Choose a payment method | `collection.next_method_for` (already pure) | the charge |

`generate_team_invoice` becomes `_insert_invoice(rate_team_period(...))` and loses nothing.
`process_invoice_dunning` stops computing the ladder inline and starts *executing the same schedule the
simulator draws* — which means the production run and the picture on screen are provably the same
ladder, not two readings of one docstring.

This is the same move [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md) makes at the
money boundary — decide, record, then act — applied one layer up. The simulator is simply a caller
that stops after "decide".

### 2. Purity is structural, not a promise (this buys *production safety*)

The simulator reads the database **once**, at t₀, to seed its state. After that it touches nothing.
No writes, no gateway calls, no notifications, no realtime publishes, no token issuance.

That guarantee is not a code-review convention. It is enforced the way this codebase already enforces
its other bans — `states.py`'s prohibition on direct status assignment and the raw-SQL ban are both
held by a test that greps the module. The `simulation/` package gets the same treatment: a test
asserts the package contains no `.insert(`, `.save(`, `db.set_value`, `db.commit`, `notify(`,
`publish_realtime`, or gateway adapter import.

A grep is a crude guard. It is also the one that will still be working in a year, which is the only
property that matters for a tool whose entire licence to run on production is that it cannot write.

### 3. Time is an input, and state rolls forward (this buys *reach*)

Projecting six months is not six independent projections. Month 2 is downstream of month 1: the wallet
was drawn, an invoice went Overdue, the standing moved to `past_due`, a suspension stopped accrual
mid-month, a settled invoice promoted the trust tier and with it the spend cap.

So the engine carries a `SimState`, seeded from the real team at t₀ and evolved **in memory** as the
virtual clock advances:

| Carried | Evolves because |
|---|---|
| Wallet balance per currency | draws at settlement, top-ups, promotional expiry (soonest-first) |
| Live invoices + their states | drafted, opened, settled, Overdue, Waived |
| `account_standing` per subscription | dunning advances it: current → past_due → suspended |
| Trust tier + effective spend cap | settled invoices promote it; `credits_only` caps at `min(tier, wallet)` |
| Payment methods | a card expires mid-projection |
| The Subscription Change stream | injected hypotheticals: a resize, a cancel, a new server |

The loop is `for each day: maybe draft → maybe settle → advance dunning → apply to SimState`. One
database read, then arithmetic — which is what makes it cheap enough to run across a cohort rather
than one team at a time.

### 4. Configuration is an input too — and the price what-if is not a multiplication (this buys *what-if*)

Every knob already reads through a named accessor in `settings.py` rather than off the document, which
makes the override seam a context variable those accessors consult. Nothing downstream —
`dunning.py`, `invoicing/`, `credits.py` — has to know it is being simulated.

Catalog rates are the harder and more important case, and the correct model is the one
[ADR 0010](0010-price-lock-folded-into-subscription-change.md) already implies:

> A simulated price change opens **new rate segments from date *D* forward**, for subscriptions
> created or resized after *D*. It does not re-rate existing segments.

Results therefore split into **grandfathered** and **repriced**, and a "+20% on VMs" scenario on a
stable book will correctly report a near-zero month-1 impact that grows over quarters. Getting this
wrong in the simulator would encode the exact misconception the simulator exists to dispel.

### 5. Payment outcomes are declared or derived — never guessed

Whether a card will succeed is unknowable, so the simulator never pretends. Three modes, explicit in
the output:

- **Optimistic** — everything settles on time. Answers *"what is the bill, and when."*
- **Assumed** — the operator declares the outcome per invoice (`pays on time`, `pays after retry 2`,
  `never pays`). Answers *"walk me through the dunning cycle."*
- **Derived** — the simulator asserts failure only where state *entails* it, and is silent otherwise.

Derived mode is the one that earns the tool: it is a pre-flight check on the whole book, and every one
of its conclusions is a fact rather than a forecast. No active payment method. `credits_only` with a
wallet below the projected total. An INR invoice above the ₹15k threshold, which will land in Action
Required and never auto-charge. A UPI mandate whose `effective_cap` is below the invoice. A card whose
printed expiry falls inside the projected window. A commitment whose shortfall triggers a clawback.

## Considered Options

**Replay the real run on production inside a transaction, then roll back.** Rejected: the run commits
per team by design, `pay_invoice` reaches the gateway, and the notification path fires. The failure
mode is charging or emailing real customers to answer a hypothetical.

**A bench restored from a production backup.** Kept — but as a *different* tool. It gives total
fidelity including the effects, and it is where a genuinely risky change should be rehearsed. It
cannot be the daily instrument: the data is stale from the moment it is restored, and standing one up
is not something the accounts team does before answering a support ticket.

**A parallel model in `simulation/`, reimplementing the rules.** Rejected on the argument above. This
is the option that would have been chosen by default, and refusing it is the point of writing this
down.

**Extend `get_forecast` in place.** Rejected as a *shape* — the four axes cannot be bolted onto a
function whose signature is `(team)`. But it is preserved as an *outcome*: `get_forecast` is
reimplemented as a thin call into the engine, so the number the customer sees and the number the
operator simulates cannot drift apart.

**Do nothing; rely on tests and staging.** Rejected because the questions are about *this book*, not
about fixtures. No test suite tells you that 31 named teams will be suspended if you shorten the
grace window.

## Consequences

- **Five extractions land in production code**, and each is an improvement on its own merits: pure
  rating in `invoicing/generate.py`, a pure ladder in `revenue/dunning.py`, an injectable change stream
  in `invoicing/lines.py`, an override context in `settings.py`, and effect-free `credit_forecast` in
  `payments/settlement.py`. Every one separates a decision from its effect, which is the direction
  ADR 0017 already set.

- **The engine's decision signatures become a contract.** They now have two callers, one of which is a
  UI. `rate_team_period` returning a payload dict, not an inserted document, is a shape we are choosing
  to keep.

- **`get_forecast` is reimplemented on the engine** and stops being a second rating path.

- **Golden-master regression on real data becomes available.** Snapshot the projection for the book,
  deploy, re-run, diff. Any team whose number moved without an intended reason is a bug found before
  the 1st rather than after. This is a stronger guarantee than the unit suite can offer, because it
  runs against the actual shape of the book — and it is nearly free once the engine exists.

- **The operator surface is three layers**, each independently useful: a cohort **report** (one row per
  team, filtered by currency, country, cluster, tier, collection mode; per-currency columns via
  `report/_currency.py` — an INR and a USD projection are never summed), a per-team **Desk page** (the
  projected invoice, a swimlane calendar of subscriptions/invoice/payments/dunning/entitlement, and a
  derivation drill showing which segments and which `locked_rate` produced each line), and a **diff
  mode** overlaying live config against overridden. `rerating.preview()` is the existing precedent for
  the diff shape: *what this would change, without changing anything.*

- **Cohort runs need the run's own paging idiom.** A synchronous projection across the whole book will
  time out; `run.py::team_pages` already solves this and the simulator reuses it rather than inventing
  a second answer.

- **[ADR 0019](0019-erpnext-is-the-invoice-authority.md) moves the finish line, and the seam must
  anticipate it.** Once ERPNext issues the invoice, *"what will the invoice look like"* means
  projecting a remote document with a different number series and ERPNext's own GST computation.
  Central's `revenue/tax.py` is demoted to estimates by that ADR, so the simulator's tax figure is an
  estimate **by construction** and must be labelled as one. The invoice-document projection therefore
  sits behind a seam from the start, so adopting 0019 replaces an implementation rather than the tool.

- **The simulator reads no Billing Events**, and this is deliberate.
  [ADR 0016](0016-billing-event-stream-and-single-transition-authority.md) makes that stream derived —
  drop the table and no invoice total changes. A simulator that projected forward from the event
  stream would quietly promote it to an input and undo that guarantee. It projects from the same
  sources the run rates from: Subscription Change segments, rollups, the wallet.

- **It exposes other teams' money.** Access is the Billing-Admin capability through `authz.py`, and
  every simulation records who ran it, over which teams, with which overrides.

- **A projection is not a promise.** Everything the tool emits is labelled with its mode and its
  assumptions. The failure we are underwriting against is an operator quoting a simulated number to a
  customer as a commitment.

## Supersedes / amends

- Extends [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md): the decision/effect
  split it applies at the money boundary is generalised to every billing act, which is what makes the
  engine callable without side effects.
- Depends on [ADR 0010](0010-price-lock-folded-into-subscription-change.md): `locked_rate` on
  Subscription Change is both the rating input the simulator replays and the reason the naïve price
  what-if is wrong.
- Upholds [ADR 0016](0016-billing-event-stream-and-single-transition-authority.md): the Billing Event
  stream stays derived — the simulator neither reads it nor writes it.
- Anticipates [ADR 0019](0019-erpnext-is-the-invoice-authority.md): invoice-document projection sits
  behind a seam, and the projected tax figure is an estimate by construction.
- Amends [issue #19](../../issues/19-admin-dashboard.md) in spirit — the admin surface gains a
  forward-looking instrument alongside its historical reporting.
