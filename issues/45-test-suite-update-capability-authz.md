# 45 — Test suite update: capability authz + migration round-trip + demo seeds

**Type:** AFK · **Milestone:** Central Merge (CM) · **Spec:** [ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md) · [testing.md](../testing.md)

## What to build

Rework the billing tests for life under Central: the authz tests move from
Frappe-role checks to **capability** checks, the migration gets a round-trip
proof, and the demo seeds create real `Team` + `Team Member` rows. The
concurrency proofs stay untouched.

## What to build (changes)

1. **Authz tests** (replace the role assertions in `tests/test_hardening.py` +
   `tests/test_dashboard.py`): build fixtures via `Team` + `Team Member` with a
   `Team Role`, then assert through `central.iam.can`:
   - `Viewer`/`Developer` member → **denied** every billing endpoint (no
     `billing:view`).
   - `Billing`/`Owner` member → **allowed** reads; allowed manage mutations.
   - `billing:view`-only member → allowed reads, **denied** manage mutations.
   - Non-member passing another team's name → `PermissionError` (IDOR).
   - `System Manager` (operator) → reaches admin console; plain member → 403.
   - Agent API key → 403 on every customer/admin endpoint.
2. **Migration round-trip test** (#43): seed legacy `Data`-slug rows, run the
   patch, assert every row's `team` now Links a real `Team`, counts preserved,
   per-row ownership unchanged, and re-running the patch is a no-op.
3. **Demo seeds** (`demo/demo_scenarios.py`): create a `Team` (+ `Team Member`
   with `Owner`/`Billing` role) per scenario instead of a bare slug, so the demo's
   authorisation is real and the portal scopes correctly.
4. **Keep green, unchanged:** the concurrency proofs — 10-thread credit
   double-spend, parallel invoice open, concurrent webhook flood, concurrent
   pay→one-capture — they are orthogonal to authz.
5. **Test harness:** tests run under `central` (`run-tests --app central` /
   module-scoped); update any `press_billing`/`billing` app references.

## Acceptance criteria

- [ ] Authz suite exercises all roles × view/manage × membership cases above and
  passes.
- [ ] No test references `Billing Admin` / `Billing User` / `billing_team`.
- [ ] Migration round-trip test proves lossless, idempotent slug→Team conversion.
- [ ] Demo seeds produce navigable teams with real membership; portal scoping works.
- [ ] Concurrency proofs still green under Central.

## Decisions baked in

- **Capability fixtures over role fixtures** in tests — mirror production IAM.
- **Concurrency proofs are load-bearing** — do not weaken them during the port.

## Blocked by

41, 42, 43 (the code + schema the tests assert against). 44 in parallel.
