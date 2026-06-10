# 48 — Currency-aware credit ledger

**Type:** AFK · **Milestone:** P2 · **Spec:** [credits.md](../credits.md)

## What to build

Add a `currency` (Link → Currency) field to `Credit Ledger Entry` so the ledger can hold balances in multiple currencies as teams are onboarded to non-default currencies. Closes the "multi-currency credit handling" open item in [credits.md](../credits.md).

**Changes:**

- Add `currency` (Link → Currency) to `Credit Ledger Entry`.
- `credits.purchase` (top-up) stamps `currency` from the payment currency.
- `credits.apply_credit` (debit at invoice settlement) stamps `currency` from `invoice.currency` (requires #47) or `team.currency` in the interim.
- `credits.get_balance(team, currency=None)`: when `currency` is supplied, filter entries by currency; when omitted, sum all entries (backward-compatible while all teams are single-currency).
- `credits.refund_to_wallet` and `credits.adjust_credits` accept and stamp `currency`.
- Data migration: backfill `currency` on all existing `Credit Ledger Entry` rows from the team's billing currency.

The `Credit Wallet` anchor lock remains one-per-team (not per currency) — it serialises all credit operations for a team regardless of currency, which is the correct behaviour.

## Acceptance criteria

- [ ] `Credit Ledger Entry` has `currency` field.
- [ ] `purchase`, `apply_credit`, `refund_to_wallet`, `adjust_credits` all stamp `currency`.
- [ ] `get_balance(team)` returns the same result as before (all-entries sum); `get_balance(team, currency="INR")` returns the INR-only balance.
- [ ] Concurrent credit test (multi-threaded) still passes — wallet lock is unchanged.
- [ ] Data migration backfills `currency` on existing rows from team's billing currency.

## Blocked by

- [#06](06-credit-ledger-wallet.md)
