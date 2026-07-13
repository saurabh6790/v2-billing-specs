# Invariants are enforced, not observed

Date: 2026-07-13

A database does not emit a metric when you violate a foreign key. It **refuses the write**. That
difference — between a system that *prevents* an illegal state and one that *notices* it afterwards —
is the whole distance between billing as it is and billing as it should be.

Billing is a database problem, and the ACID letters make a good audit. **A**tomicity we cannot have
across the gateway and do not pretend to ([ADR 0017](0017-durable-intent-before-irreversible-side-effects.md)
makes the partial state recoverable instead). **I**solation is in decent shape — `FOR UPDATE` on the
invoice row, on the Credit Wallet anchor, on the Usage Rollup, with the InnoDB next-key-lock hazard
already found and fixed. **D**urability is what ADR 0017 repairs at the money boundary. That leaves
**C**onsistency, and consistency is *absent*.

The evidence is exact. Across 36 billing DocTypes there are **twelve unique fields and no other
constraint of any kind** — no `CHECK`, no `non_negative` flag on a single money column, no composite
uniqueness on the things that must be unique. Every other invariant in the system is a line of Python
in one function, holding only for callers polite enough to route through it.

We already wrote the catalogue and then didn't build it. [observability.md](../../observability.md) §6
is titled *"Money integrity — the non-negotiable sub-tier"* and states that these "should be
**structurally impossible** to trip… because trust in the number *is* the product." It names
`ledger.balance_drift`, `invoice.line_sum_mismatch`, `payment.amount_vs_invoice_mismatch`,
`erpnext.push_amount_mismatch`, and specifies a `Metric Snapshot` DocType, a
`billing/platform/metrics.py` emitter and a `billing/reports/metrics/` package to carry them.

**None of it exists.** No emitter, no DocType, no package, zero call sites. A document argued the case
and nothing was built, and nobody noticed — because there was no invariant checking that the
invariants existed. Two of the six have since rotted anyway, being built on the integer minor-units
model of [ADR 0003](0003-money-as-integer-minor-units.md) that was deprecated and never implemented.

The deeper reason it was never built is in the framing. observability.md asked for **counters** —
"give it a counter so 'can't happen' becomes 'is provably 0'". A counter has no teeth. Nobody is
blocked by a counter, so nobody writes one.

## Decision

**Every billing invariant is pushed to the lowest rung of enforcement that can physically hold it. A
detection counter is an admission of failure to make the state impossible — never the first choice.**

### The ladder

| Rung | Mechanism | Guarantee | Cost of violating |
|---|---|---|---|
| **1 — Structural** | DB constraint (`UNIQUE`, `CHECK`, `FOREIGN KEY`) or a data model in which the illegal state is unrepresentable | The write **cannot happen**, from any caller, any patch, any seed script, any console | `OperationalError` |
| **2 — Transition guard** | `states.py` refuses the move ([ADR 0016](0016-billing-event-stream-and-single-transition-authority.md)) | The illegal transition is refused | `InvalidTransition` |
| **3 — Write-path assertion** | `validate()` or a service-layer guard throws | Refused *for callers that go through the guard* | `ValidationError` |
| **4 — Continuous audit** | Scheduled job compares documents and reports | **Detected, not prevented** | A Billing Event + a page |

An invariant may only sit on rung 4 if no lower rung can physically hold it — which in practice means
**cross-document invariants**, where the fact spans two tables and no constraint can see both.
`wallet.balance == Σ(ledger)` is genuinely rung 4. `balance >= 0` is not, and has no business being
there.

### Rung 3 is weaker than it looks in Frappe — which is why rung 1 matters

**`frappe.db.set_value()` writes SQL directly and skips the controller entirely.** It does not run
`validate()`. It does not honour a `non_negative` field flag. Any invariant that lives only in
`validate()` is unenforced against every `set_value` call in the codebase — and billing uses
`set_value` liberally, including, with some irony, **to write the wallet balance itself**
(`revenue/credits.py:165`).

So in Frappe, rung 3 protects against careless callers and nothing else. Rung 1 is the only rung that
protects against the codebase.

MariaDB has supported `CHECK` constraints since 10.2. Frappe does not expose them in the DocType JSON,
so they are added by DDL in a patch. That is a small, well-understood cost and it buys the only
guarantee that actually holds.

### The invariant catalogue

Every invariant below carries the rung it belongs on. Where today's rung is lower than it should be,
the gap is the work.

**Credits and the ledger** — *the balance may never go negative*

| # | Invariant | Target rung | Today |
|---|---|---|---|
| C1 | **For every `(team, currency)`, the balance is ≥ 0** | 1 — `CHECK (balance >= 0)` | 3, and **currency-blind** (see below) |
| C2 | `Credit Wallet.balance` == Σ signed `Credit Ledger Entry` for that `(team, currency)` | 4 — spans tables | none (`ledger.balance_drift`, unbuilt) |
| C3 | The ledger is append-only — no entry is ever updated or deleted | 1 — controller forbids `on_update`/`on_trash` | 3 (documented, guarded in the controller) |
| C4 | The `running_balance` chain is unbroken: each entry's `running_balance` equals the previous one ± its own signed `amount` | 4 — makes the ledger **self-verifying**; a lost or tampered entry is detectable | none |
| C5 | A gateway payment books **exactly one** credit | 1 — `UNIQUE(gateway_payment_id)` | **1 ✅ already correct** |
| C6 | `amount > 0` always; direction is carried by `entry_type`, never by the sign | 1 — `CHECK (amount > 0)` | 3 |

**C1 is not what it appears to be, and this is the most serious finding in the audit.**

`_book_entry_once` enforces `new_balance >= 0` — but against `_lock_and_read_balance(team)`, which
reads `Credit Wallet.balance`: a **single, currency-blind float**, one row per team. Meanwhile
`get_balance(team, currency)` sums the *ledger* filtered to one currency, and its own docstring says
so plainly: *"`running_balance` is a single currency-blind cumulative… backward-compatible while teams
are single-currency."*

The invoice path (`revenue/invoicing/lifecycle.py:62`) **reads a per-currency balance and debits a
currency-blind one.** The read and the write use different definitions of "balance." A team holding
credits in two currencies would have a wallet anchor that is a meaningless sum of INR and USD as bare
floats, and could be driven **negative in USD while the anchor stays comfortably positive** — the
guard would permit the debit. The v1 negative-balance bug, reintroduced through a currency seam.

It is closed today only by an invariant *elsewhere* — Billing Profile currency locks a team to one
currency — which is load-bearing, unstated, and enforced nowhere near the code that depends on it.

**Therefore: `Credit Wallet` is re-keyed to `(team, currency)`.** One anchor row per currency, a
`CHECK (balance >= 0)` on it, and the guard becomes true per-currency by construction rather than by
the accident of a team never holding two.

**Invoice**

| # | Invariant | Target rung | Today |
|---|---|---|---|
| I1 | Σ(line items) == `subtotal` | 3 + 4 | none (`invoice.line_sum_mismatch`, unbuilt) |
| I2 | `total` == `subtotal` − discount + clawback + tax | 3 | implicit in assembly |
| I3 | `amount_paid` ≤ `total` | 1 — `CHECK` | none |
| I4 | `expected_collection` == `total` − `tds_amount` − `credit_applied` | 3 | implicit |
| I5 | A `Paid` invoice is fully covered: `amount_paid` + `credit_applied` ≥ `total` − `tds_amount` | 4 — spans attempts | none |
| I6 | **At most one non-Cancelled invoice per `(team, period_start, period_end)`** | 1 — `UNIQUE` | **3, and racy** |
| I7 | A settled invoice is immutable — no line, total or tax changes after `Paid`. Corrections are a credit note or cancel-and-reissue, never an edit | 2 — `states.py` | convention only |
| I8 | `Invoice.currency` == the team's Billing Profile currency | 3 | none |

**I6 is a live race.** `generate_team_invoice` checks for an existing invoice with `db.get_value` and
then inserts — a classic time-of-check-to-time-of-use gap, with **no lock and no constraint** between
them. `generate_draft_invoices` enqueues one job *per team*, so a scheduler double-fire or a manual run
overlapping the cron gives two workers that both see nothing and both insert. The team is billed
twice.

The docstring already claims "Idempotent per (team, period)". It is idempotent only against sequential
callers. A unique index makes the claim true. Because MariaDB has no partial unique index, the
`Cancelled` case is handled with a `period_key` column that is populated on live invoices and **nulled
on cancellation** — MariaDB permits many NULLs in a unique index, so a cancelled invoice steps out of
the constraint and a reissue can take its place.

**Payment**

| # | Invariant | Target rung | Today |
|---|---|---|---|
| P1 | At most one in-flight attempt per invoice | 1 — `UNIQUE(idempotency_key)` with the key deterministic on `(invoice, retry_number)` | 3, becomes 1 under [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md) |
| P2 | Σ(captured attempts) − Σ(completed refunds) == `invoice.amount_paid` | 4 | none (`payment.amount_vs_invoice_mismatch`, unbuilt) |
| P3 | `attempt.amount` == the invoice's `expected_collection` at the time of the attempt | 3 | implicit |
| P4 | No attempt remains non-terminal past the sweeper threshold | 4 — the sweeper | [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md) |
| P5 | `Paid` is reached only from a verified external fact, never a local return value | 2 — `states.py` | comment only, [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md) makes it a rule |
| P6 | Σ(refunds against an attempt) ≤ that attempt's captured amount | 3 + 4 | none |

**Subscription, catalog and price**

| # | Invariant | Target rung | Today |
|---|---|---|---|
| S1 | `Subscription Change` is append-only — never edited | 1/2 — controller forbids re-save | 3 ✅ (the controller does forbid it) |
| S2 | A subscription's rate-bearing change rows **tile** the period: no overlap, no gap | 4 | none |
| S3 | Every rate-bearing change row carries a `locked_rate` and a `currency` | 3 | implicit ([ADR 0010](0010-price-lock-folded-into-subscription-change.md)) |
| S4 | `locked_rate` ≥ 0 | 1 — `CHECK` | none |
| S5 | An already-invoiced segment's `locked_rate` never changes | 1 — append-only | 3 |
| S6 | Every `(plan, region, currency)` a customer can select has a Catalog Rate | 3 (eligibility) + 4 (gap report) | partly — `component_card_gaps` exists |
| S7 | An Asset has at most one active Subscription | 1 — unique on `asset_id` where active | none |

**Tax**

| # | Invariant | Target rung | Today |
|---|---|---|---|
| T1 | Tax is computed on the taxable base and rounded **once** | 3 | implicit |
| T2 | A zero-rated invoice carries a `zero_rating_reason` | 1 — `CHECK` (rate = 0 ⟹ reason NOT NULL) | 3 |
| T3 | TDS reduces `expected_collection` but never `total` | 3 | implicit |

**Cross-system — the three-way reconciliation**

| # | Invariant | Target rung | Today |
|---|---|---|---|
| X1 | Every `Paid` invoice has a matching settlement at the gateway | 4 — *us → gateway* | **none** |
| X2 | Every gateway capture maps to a local Payment Attempt | 4 — *gateway → us* | ✅ `reconciliation.py` |
| X3 | Every `Paid` invoice's total equals its ERPNext Sales Invoice total | 4 — *us → books* | none (`erpnext.push_amount_mismatch`, unbuilt) |

Only **X2** exists. Reconciliation today is one-directional: it can tell you a payment arrived that we
did not record, but not that we recorded a payment that never arrived.

### Violations are Billing Events, not counters

When a rung-4 audit fires, it does not increment a number. It writes a **Billing Event**
([ADR 0016](0016-billing-event-stream-and-single-transition-authority.md)) carrying the team, the
subject, the amount and the expected-versus-actual — so the violation lands on the same timeline as
everything else, is correlatable to the invoice that caused it, and is a **named defect with a
customer attached** rather than a Prometheus figure nobody reads.

The audit job (`run_invariant_audit`, daily) walks a registry of rung-4 checks. Each check is one
function returning violations. A check with no function is not a check.

## Considered Options

- **Counters and metrics, as [observability.md](../../observability.md) §6 proposed.** Rejected as the
  *primary* mechanism — though salvaged as rung 4. A counter observes; it does not prevent. The
  strongest evidence against it is that the document was written, argued convincingly, and then never
  built: a metric with no teeth generates no pressure to exist. What we keep is its catalogue; what we
  discard is its framing.

- **Everything in `validate()` (rung 3 only).** Rejected on a Frappe-specific technicality that is
  decisive: `frappe.db.set_value` bypasses the controller. An invariant enforced only in `validate()`
  is not enforced against a large fraction of our own code — including the very line that writes the
  wallet balance.

- **DB constraints for everything (rung 1 only).** Impossible. `wallet.balance == Σ(ledger)` spans two
  tables; no `CHECK` can see both. The ladder exists precisely because some invariants have nowhere
  lower to stand.

- **Event-source everything and recompute-and-compare.** The strongest possible consistency story, and
  rejected as both a rewrite and a violation of [ADR 0016](0016-billing-event-stream-and-single-transition-authority.md)'s
  constraint that the event stream stay derived and out of the write path.

## Consequences

- **`Credit Wallet` is re-keyed from `team` to `(team, currency)`**, with a `CHECK (balance >= 0)`.
  This is the load-bearing change. It requires a patch (one anchor row per currency, balances recomputed
  from the ledger per currency), and it retires the currency-blind `running_balance` read in
  `get_balance`'s no-currency branch. Every credit path must pass a currency; the lock is taken on
  `(team, currency)`.
  **The `FOR UPDATE` reasoning in `revenue/credits.py:50–65` must be re-derived for the composite key** —
  the current comment carefully explains why the lock is taken on the primary key rather than the
  secondary `team` index to avoid an InnoDB lock-order deadlock, and that analysis does not survive a
  key change unexamined.

- **`Invoice` gains a `period_key`**, unique and nulled on cancellation, closing the double-billing
  race in `generate_team_invoice`.

- **`CHECK` constraints arrive by DDL patch**, since Frappe's DocType JSON cannot express them. A test
  asserts each one exists after migration, so a fresh site is never quietly weaker than a migrated one.

- **`frappe.db.set_value` on a money column becomes a reviewed act.** Money fields are written through
  their guarded service function or not at all; a grep-test enumerates the exceptions.

- **[observability.md](../../observability.md) §6 is amended, not deleted.** Its four surviving money
  invariants become rung-4 audit checks. `money.rounding_applied` and `money.minor_unit_factor_miss` are
  **struck** — both describe the integer minor-units model of
  [ADR 0003](0003-money-as-integer-minor-units.md), which is deprecated and was never built.

- **Reconciliation becomes three-way.** X1 (us → gateway) and X3 (us → books) join the existing X2. Only
  then can we say "we are certain" rather than "no one has complained."

- **The audit is expected to fail on first run.** These invariants have never been checked against
  production data. The first run is a survey, not a regression — its output is the true backlog, and
  triaging it is the point.

- **Recomputability is deliberately out of scope.** Whether regenerating a closed period yields a
  bit-identical total — which, with float money, depends on a summation order nothing currently fixes —
  is a determinism question, not a consistency one. It needs its own decision.

## Supersedes / amends

- Amends [observability.md](../../observability.md) §6: its money-integrity invariants are retained as
  rung-4 checks, its counter-only framing is superseded, and its two minor-units invariants are struck.
- Depends on [ADR 0016](0016-billing-event-stream-and-single-transition-authority.md): rung 2 *is*
  `states.py`, and rung-4 violations are reported as Billing Events.
- Completes [ADR 0017](0017-durable-intent-before-irreversible-side-effects.md): 0017 supplies
  Durability and half of Atomicity; this supplies Consistency. Together with the existing `FOR UPDATE`
  discipline (Isolation), billing has the ACID letters it can physically have — and an explicit,
  compensating answer for the one it cannot.
