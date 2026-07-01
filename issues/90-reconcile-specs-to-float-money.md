# 90 — Docs sweep: reconcile specs/issues to float money (ADR 0003 deprecated)

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md](../catalog-pricing-decisions.md) · **ADR:** [0003](../docs/adr/0003-money-as-integer-minor-units.md) (deprecated)

## What to build

Money is float `Currency` in major units; ADR 0003's integer minor-units model was never implemented
and is now deprecated (`CONTEXT.md` and `catalog-pricing-decisions.md` already reconciled). Sweep the
remaining specs and issues that still describe `Long Int` minor/rate units so the corpus stops
describing a model that isn't built, and retire the obsolete migration issues.

This is a documentation/tracker-hygiene task — **no code change**.

## Acceptance criteria

- [ ] `invoicing.md` and `metering.md` no longer assert integer minor/rate units as the stored model;
      money is described as float `Currency` major units (or the minor-unit language is clearly marked
      as the deprecated ADR 0003 intent).
- [ ] Issues #79 and #80 wording that references minor/rate units is corrected or annotated.
- [ ] Issues **#34–#39** (the ADR 0003 minor-units migration: `money` module, rates→rate-units,
      invoice/tax, credit ledger, payments boundary, ERPNext push) are marked **OBSOLETE** with a
      one-line banner pointing at deprecated ADR 0003 and the float decision — not deleted.
- [ ] A grep for `minor units` / `rate units` / `Long Int` across the specs surfaces only deprecated-ADR
      references or gateway-boundary mentions, not "how money is stored".

## Blocked by

None - can start immediately.
