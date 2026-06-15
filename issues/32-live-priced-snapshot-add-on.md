# 32 — Live-priced snapshot add-on

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [final-plan-pricing.md](../final-plan-pricing.md) §8 · **ADR:** [0002](../docs/adr/0002-live-priced-storage-add-ons.md)

## What to build

Make **snapshot** a **live-priced add-on** — the deliberate exception to grandfathering. Most add-ons lock their rate at provision (like bundles); depreciating storage would strand a customer on a stale-high rate, so a live-priced add-on reads its rate from the **current** `Catalog Rate` **each billing period** instead. A snapshot is its **own `resource_id` from birth** (not a meter on the VM), so it **survives VM termination**, owned by the team, with **no free allowance** → `bill = GB-days × live_rate`. Metered as a **gauge** ([metering.md](../metering.md)).

## What to build (changes)

1. **`pricing_mode` on `Add-on`** (Select: `grandfathered` / `live`), default `grandfathered`; `addon-snapshot` set to `live`.
2. **Billing rate resolution** — for a `live` add-on, resolve the rate from the current `Catalog Rate` (team currency + cluster) at line-item time instead of reading the price-lock. Grandfathered add-ons unchanged.
3. **Snapshot resource identity** — Central records the snapshot as its own `resource_id` at creation (independent of the parent VM's `resource_id`); it does not close when the VM terminates. No price-lock row is written for live add-ons (they skip the lock step by design).
4. **No allowance for snapshot** — line item reduces to `GB-days × live_rate` (the `max(0, qty − allowance)` allowance term is zero).
5. **Doc reconciliation** — update [metering.md](../metering.md) so "rate + allowance locked at provision" is scoped to grandfathered add-ons; live-priced ones are the carve-out.

## Acceptance criteria

- [ ] `Add-on` carries `pricing_mode`; `addon-snapshot` is `live`; existing add-ons remain `grandfathered` with unchanged behavior.
- [ ] A live add-on bills at the **current** Catalog Rate for the period; raising/lowering the Catalog Rate changes the next period's snapshot bill (down or up), with no price-lock involved.
- [ ] A snapshot keeps billing after its parent VM is terminated, owned by the team, as its own `resource_id`.
- [ ] Snapshot line item = `GB-days × live_rate` with no allowance subtraction.
- [ ] `metering.md` wording reconciled (grandfathered vs live).
- [ ] `press_billing` test suite green, including a take-snapshot → terminate-VM → snapshot-still-bills case and a rate-drop-applies-next-period case.

## Decisions baked in

- **Live-priced storage, not grandfathered** — storage depreciates ([ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)).
- **Snapshot = own `resource_id` from birth, no allowance** — decoupled from the bundle.

## Blocked by

12 (metered Usage Meter — the gauge pipeline), 27 (`Catalog Rate` — the live rate source).
