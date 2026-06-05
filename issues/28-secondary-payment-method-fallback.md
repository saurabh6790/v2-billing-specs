# 28 — Secondary payment methods + settlement fallback + management UI

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md) (Payment Method lifecycle, Settlement fallback)

## What to build

Let a team keep an **ordered list** of payment methods (primary + backups) and have invoice settlement **fall back** from one to the next when a charge fails, plus a UI to manage the list.

Settlement already runs credits-then-card ([#11](11-credit-application-waterfall.md)) with an async charge loop ([#10](10-charge-invoice-payment-attempt-webhook.md)) and dunning ([#14](14-retry-dunning-suspension.md)). Fallback slots onto those seams. Because a charge is confirmed only on the webhook, fallback is **event-driven**: a decline (sync or via webhook) advances a per-invoice cursor over the ordered methods, and one idempotent collector charges "the next untried, usable method."

Decided behaviour (2026-06-05): **per-method `priority` (N methods)**; **immediate same-run fallback** on a synchronous decline; **escalate, don't repeat** — each method tried at most once per invoice, then dunning escalates.

## What to build (changes)

1. **Model:** `priority` Int on Payment Method (team-scoped, dense; 0 = primary). `is_default` becomes the mirror of `priority == 0`. Backfill patch.
2. **Dedup validation:** Payment Method controller rejects a second method with the same `gateway_method_id` for a team (same card can't be primary *and* backup).
3. **`collection.py`:** `ordered_methods(team)`, `next_method_for(invoice)` (excludes methods that already failed for the invoice + `reauth_required` + non-active), `collect_invoice(invoice)` (idempotent; rotates immediately on a sync decline; success/in-flight waits on the webhook).
4. **Wiring:** `billing.open_and_collect` leg 2 → `collect_invoice`; `charges.apply_webhook` failure branch → `collect_invoice`; `dunning.retry_payment` → `collect_invoice` (no-op once exhausted → escalate).
5. **Ordering ops:** `set_default_payment_method` (→ make primary), `delete_payment_method` (re-densify), new `reorder_payment_methods(team, ordered)`; all keep `is_default` mirrored.
6. **UI:** extend `PaymentMethods.vue` — list ordered by `priority` with Primary / Backup N labels, "Make primary", up/down reorder, remove, add (existing dialog), and a short "how fallback works" note. Surfaces the duplicate-card error.

## Acceptance criteria

- [x] A team can add ≥2 active methods, mark one primary, and reorder backups; ordering persists as dense `priority` with `is_default` mirrored.
- [x] Adding the **same card twice** (same `gateway_method_id`) is rejected.
- [x] Primary declines **synchronously** → backup is charged in the **same run**; only the backup's attempt reaches the gateway second.
- [x] Primary captures then its **webhook fails** → collector re-enters and charges the backup.
- [x] **All methods fail** → invoice stays `Open`, no method re-charged, dunning escalates (Overdue → suspend).
- [x] `reauth_required` / non-active methods are skipped; credits are still consumed once before any card leg.
- [x] UI lists/reorders/removes methods and shows the fallback order; full `press_billing` test suite green.

**Status: done** (2026-06-05) — `collection.py` + `priority`/dedup + UI shipped; migrated `billing.local`; 238/238 tests pass; SPA builds. **Behaviour change:** Day 3/7 same-card retries are gone (escalate-don't-repeat) — `dunning` only retries an *untried* method.

## Blocked by

10, 11, 14 (the charge loop, waterfall, and dunning this extends) — all done.
