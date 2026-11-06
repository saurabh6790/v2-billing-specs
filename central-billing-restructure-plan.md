# central/billing — restructure plan: architecture + debuggability

Measured against `apps/central/central/billing` on `develop`, 2026-09-22. Companion to
[central-billing-code-health.md](central-billing-code-health.md) (readability sweep,
2026-08) and [central-billing-improvement-scope.md](central-billing-improvement-scope.md)
(benchmark + W1–W10). This one answers a narrower question: **when billing is wrong, why
is there no path to the answer — and what has to move to give it one?**

## Verdict

The module is not badly designed. Responsibilities are clean, `states.py` is a real
transition authority, `authz.py` is a real seam, and `ARCHITECTURE.md` is a 628-line
debugging map with a symptom→file cheat-sheet. The August code-health review scored
debuggability **Strong** on the strength of that map.

Day-to-day experience disagrees, and both are right. The map is excellent at telling you
**which code to read**. It cannot tell you **what happened**. Every row resolves to a
reading list:

> Invoice wrong amount → `lines.compute_line_items` (day-weighting),
> `metering.metered_line_items`, `commitments` discount, `tax.resolve_tax`; verify
> Subscription Change `locked_rate` segments

Four modules and a manual reconstruction of segment history, to answer a question about
one row. That is an investigation, not a fix path.

**The fix is not more documentation. It is making the records explain themselves.**

And the headline finding is that most of that work is already written and thrown away.

---

## 1. The finding that changes the economics

`lines.py:293`, `lines.py:333` and `metering.py:445` already build a full derivation for
every line they compute:

```python
"derivation": {
    "mode": "Daily",
    "why": "the config was held for a day or more, so whole days are billed",
    "segment_from": ..., "segment_to": ..., "rate_locked_at": ...,
    "locked_rate": 3000.0, "days": 13, "day_units": 30,
    "arithmetic": "13 ÷ 30 × 4500",
}
```

This is a complete answer to "why is this line this amount", in plain English, including
the arithmetic. It is gated behind `explain: bool = False`.

The only callers that pass `True` are `projection/engine.py`, `projection/estimate.py`,
`projection/repricing.py` and `projection/events.py`. The production invoice path —
`revenue/invoicing/generate.py:261` → `run.py` — takes the default and discards it, and
`Invoice Line Item` has no field to hold it.

**The what-if simulator can explain its numbers. The invoice a customer disputes cannot.**

Two facts make closing this nearly free:

- The derivation is assembled from values already in hand. No extra queries.
- `tests/test_projection_derivation.py:66-68` already asserts the amounts are identical
  with `explain` on or off. Turning it on in production is pre-verified.

---

## 2. Evidence table

| # | Finding | Measured |
|---|---|---|
| E1 | Line derivation computed, then discarded on the real invoice path | 3 build sites, 4 consumers — all in `projection/`; no field on `Invoice Line Item` |
| E2 | Pricing-row identity dropped one query short | `lines.py:255` and `subscriptions.py:728` select `locked_rate` but not `name` |
| E3 | Correlation spine half-wired | 30 `transition()` sites: `actor` 30, `reason` 18, `correlation` 13, `amount` 5 |
| E4 | Instrumentation built, unused | `metrics.emit`/`timed` live in 2 production sites (`run.py:275`, `run.py:394`) out of 1103 functions; 19 `frappe.logger` calls total |
| E5 | Nothing reads the event stream | `Billing Event` queried by 2 reports; no trace surface |
| E6 | Documented layering is violated and unenforced | `ARCHITECTURE.md` §1 says "each layer calls the one below it"; `payments/`, `revenue/invoicing/` and `doctype/billing_profile/` import `api/dashboard/_shared` |
| E7 | Two import cycles | `_shared ↔ settlement ↔ invoicing.lifecycle ↔ invoicing.run`; `catalog.subscriptions ↔ doctype.subscription` |
| E8 | Dependency graph invisible at read time | 237 of 400 internal imports sit inside function bodies (was 193 in Aug 2026 — growing) |
| E9 | God module | `catalog/subscriptions.py` — 1047 LOC, fan-in 15, five responsibilities, drives VM infrastructure |
| E10 | Docstrings are post-mortems | 103 of 135 module docstrings ≥6 lines; 71 functions whose docstring is ≥ half their body |
| E11 | Helper sprawl | 392 of 1103 functions are `_`-prefixed; 257 carry no docstring |
| E12 | Map drift | §1 layer table still lists retired `pricelock`; `platform/` described as "notifications · sync", now also holds alerts, constraints, invariants, metrics |

---

## Phase 0 — precondition

Confirm the suite is green on `develop`. Restructuring against a red baseline makes new
breakage indistinguishable from existing breakage. If it is still red, that is ticket one.

---

## Phase 1 — make the record explain itself

Highest value, lowest risk. All three are additive; nothing changes behaviour.

### D1 — Persist the derivation *(size: S)*

Add `derivation` (Code/JSON, read-only) to `Invoice Line Item`. Pass `explain=True` on the
production path in `generate.py` and store it per line. Surface it on the Desk form and the
dashboard invoice row.

*Verification:* `test_projection_derivation.py:66-68` already proves amounts are unchanged.
Add a test that a generated invoice line carries a non-empty derivation.
*Risk:* row size only. This is the audit artifact — it is worth the bytes.

### D2 — Link the provenance *(size: S–M)*

- Add `name` to the field list in `_changes_by_subscription` (`lines.py:255`) and
  `_latest_segment_by_subscription` (`subscriptions.py:728`); carry it through the segment
  dicts; land it as `priced_by` → Subscription Change on `Invoice Line Item`.
- Same shape for `measured_by` → Usage Rollup on metered lines.
- Credits need no new field: `Credit Ledger Entry` already carries
  `reference_type`/`reference_name`. It only needs surfacing.

*Result:* "why is this line this amount" becomes a click, not a reconstruction.

### D3 — Close the correlation spine *(size: S)*

Make `reason` and `correlation` **required** parameters of `states.transition()`, so the
signature enforces what convention currently does not. Fill the gaps:

- No `reason` (12): `charges.py` ×6, `refunds.py` ×3, `reconciliation.py:204`,
  `payments.py:208`, `mandates.py:269`
- No `correlation` (17): including `payments.py:208`, `mandates.py:269`

*Verification:* extend `tests/test_states.py`.

---

## Phase 2 — give it one front door

### D4 — A Billing Trace surface *(size: M)*

One Desk page taking a correlation id, invoice, team or subscription, returning a merged,
time-ordered timeline across `Billing Event`, `Subscription Change`, `Invoice`,
`Payment Attempt`, `Credit Ledger Entry` and `Webhook Event`.

Read-only, so ADR 0016 is untouched — that rule forbids *pricing, invoicing, settlement,
dunning and entitlement* code from reading the stream, to stop it becoming a second source
of truth. It does not forbid tooling.

**This is the fix path that does not exist today.**

### D5 — Instrument the five money paths *(size: S)*

Wrap with the existing `metrics.timed`: charge, settle, credit debit, rate resolution,
mandate debit. You built the facility; it has two callers.

### D6 — Rewrite `ARCHITECTURE.md` §1 and §7 *(size: S)*

Not "write a map" — the map exists and is good. Two specific repairs:

- **§1** asserts a layering the code violates (E6) and describes a `platform/` and
  `revenue/` that have moved on (E12). Correct it, then let **A3** enforce it.
- **§7** should point at *data* where Phase 1 makes that possible. "Invoice wrong amount"
  becomes "open the line's `derivation` and `priced_by`" — with the module reading list
  kept as the fallback, not the first move.

---

## Phase 3 — the structural fixes

### A1 — Dissolve `api/dashboard/_shared.py` *(size: M)*

394 LOC, fan-in 16, holding five unrelated concerns and sitting at the centre of the
four-module cycle. It is a domain layer hiding in the API layer.

| Concern | Functions | Destination |
|---|---|---|
| Team resolution + authz | `_resolve_team`, `_require_view/_manage` | stays (API) |
| Billing-profile gating | `require_billing_profile`, `_profile_complete`, `_has_money_activity` | domain |
| Gateway selection | `_gateway_for_currency`, `_card_gateway`, `_add_method_gateway` | `gateways/` |
| Currency | `_team_currency`, `currency_for_country`, `_from_inr` | core |
| Line presentation | `_describe_line`, `_billed_window`, `_qty` | stays (API) |

Fixes the layer inversion in `payments/settlement.py`, `payments/instruments.py`,
`payments/provisioning.py`, `revenue/invoicing/lifecycle.py` and
`doctype/billing_profile/billing_profile.py`.

### A2 — Split `catalog/subscriptions.py` *(size: M)*

1047 LOC, fan-in 15, five jobs — lifecycle, resize orchestration, segment queries,
run-rate/headroom enforcement, maintenance backfill. Also misfiled: a subscription is not a
catalog concept.

Into `subscription/{lifecycle,resize,segments,headroom}.py`. Breaks the second cycle and
quarantines the infrastructure coupling (`_reshape_vm`, `_control_subscription_server`)
into `resize.py`.

### A3 — A layering guard test *(size: S)*

AST walk; fail on any domain→api import and any core→billing import. Same shape as
`tests/test_whitelist_boundary.py` and `tests/test_projection_purity.py` — conventions that
fail a PR rather than a reviewer's memory. This is what stops E6 recurring.

---

## Phase 4 — cleanup, only safe once the cycles are gone

### A4 — Hoist the deferred imports *(size: M)*

237 of 400 internal imports sit inside function bodies, so no file states its dependencies
at the top. With A1–A3 done most can move up; whatever refuses marks a cycle not yet found,
and A3 turns that into a signal rather than a mystery.

### A5 — Rename packages by lifecycle stage *(size: L, optional)*

```
core/  catalog/  subscription/  usage/  invoicing/  money/
instruments/  gateways/  trust/  projection/  ops/  api/{dashboard,admin,pilot}/
```

Package names currently record issue history rather than the domain. Renaming makes a
symptom map to a directory — but it is pure churn before Phase 3, and it rewrites imports
across 96 test files. Defer; it may prove unnecessary once A1/A2 land.

---

## Cross-cutting: the docstring standard

Applied per-module as each is touched. Never as a sweep.

**One line: what it does, and why it exists. No ADR links, no issue numbers, no history.**

The failure mode is specific — the docstrings narrate history. `revenue/credits.py` opens
with 30 lines, roughly 20 of them about a wallet key and a deadlock that no longer exist
(*"It was once keyed by team alone…"*, *"An earlier version read the latest balance
with…"*). `get_balance` carries an 18-line docstring over a 24-line body; you read three
paragraphs about a next-key lock to learn it returns `{"balance", "currency"}`.

The first line of each is almost always already correct.

| Content | Where it belongs |
|---|---|
| Why the design is this way | An ADR |
| Why *this line* is surprising | A comment on that line |
| What the function does | The docstring, in one line |

The `credits.py` deadlock story → ADR 0018. The "don't `ORDER BY creation … FOR UPDATE`"
warning → two lines on the query itself, where someone about to reintroduce it will see it.

A line-limit test can enforce this once the pass is done.

**Naming.** 392 of 1103 functions are `_`-prefixed helpers with no grouping, which is why
methods feel scattered — nothing signals which travel as a set. Where helpers share state,
prefer a small class over a flat field of functions.

---

## Sequencing and rationale

| Phase | Items | Rough effort |
|---|---|---|
| 0 | Green suite | — |
| 1 | D1, D2, D3 | ~3 days |
| 2 | D4, D5, D6 | ~3 days |
| 3 | A1, A2, A3 | ~1 week |
| 4 | A4, A5 | open |

**Debuggability before architecture, deliberately.** Phases 3 and 4 are the changes most
likely to break something subtly, and the trace surface from Phase 2 is exactly what you
will want when they do. The reverse order means restructuring blind.

Phases 1–2 are the real win. Phase 4 is cosmetic by comparison and can wait indefinitely.

## What this plan deliberately does not propose

- **Rewriting the domain logic.** It is correct and well-factored. This is about making it
  legible and traceable, not different.
- **Making `Billing Event` authoritative.** ADR 0016's derived-stream constraint stays.
  D4 reads it; nothing in the money path does.
- **A big-bang reshape.** A5 is last and optional for exactly that reason.
