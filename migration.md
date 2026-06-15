# Migration (v1 → v2)

## Purpose

Move existing Press v1 customers onto v2 billing without double-billing, throttling, or importing v1's unauditable balances as truth.

## Strategy — fresh start, gradual per-team

Press v2 is greenfield: **net-new users adopt v2 first.** Existing users migrate **per-team, opt-in, ~6 months after v2 is stable.** No shared cutover boundary → no double-billing window. Each team flips when it's ready, only after v2 is proven on net-new users.

## Per-team seeding (seed, don't backfill)

Per migrating team:
- One `subscribed` event per running resource, written in Central (the event log *starts* at migration).
- One **price-lock at the current v1 price** per running resource → instant, automatic grandfathering (no one's bill changes).
- One opening **Credit Ledger Entry** for the v1 prepaid balance.
- **No history backfill.** Historical v1 invoices imported **read-only** (for customer history display); never recomputed.

## Balances

- **Prepaid-credit teams:** import the balance as-is (one opening ledger entry).
- **Negative-balance teams: skipped.** They are asked to repay the debt first, then migrated. (v1 negative balances are the very data v2 doesn't trust.)

## Payment methods

- **Same gateway merchant accounts** as v1 → card tokens are already valid: **cards migrate by reference import, no customer action.**
- **UPI Autopay mandates require re-authorisation** — mandates are brittle across systems, and the ceiling must be re-pegged to the team's mapped trust tier ([payments.md](payments.md)). Part of each team's onboarding-to-v2.

## Tier mapping

Migration tier = `max( rules-applied-to-v1-history, current-run-rate × margin )`.

- Run the declarative promotion rules ([provisioning-and-entitlements.md](provisioning-and-entitlements.md)) retroactively over v1 invoices.
- Floor at the team's actual current run-rate so **no existing customer is throttled** by the act of migrating.
- The mapped tier sets the entitlement cap → which sets the mandate ceiling → which is why UPI mandates re-auth.

## Notes

- Cards don't have a ceiling, so they ignore the tier-mapping chain — they just import.
- Migration is explicitly **not** a launch task. See [roadmap.md](roadmap.md).
