# 82 — Resize a composed config: `changed`-event re-lock at current rates

> **Updated 2026-06-30 ([ADR 0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)).** The `changed`-event re-lock is a new **`Plan Changed` `Subscription Change`** row: close the open segment, re-resolve the component rates for the new shape and **sum them into the new whole-config rate**, write the new composition onto the Subscription, and stamp that config total as the new row's `locked_rate`. No per-resource rate is frozen. The preset↔composed switch is the same event — a flat bundle rate vs a summed config rate. The append-only ledger is the lock history.

**Type:** AFK · **Milestone:** CC · **Spec:** [final-plan-pricing.md §5.2/§9](../final-plan-pricing.md), [plan-writeup.md §6.5](../plan-writeup.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md), [0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)

## What to build

Let a customer upgrade/downgrade a composed config, and switch between a preset and a custom
shape, reusing the existing `changed`-event re-lock flow ([#54](54-changed-event-resize-plan-change.md))
at **component** granularity.

- **Resize = `changed` event.** On a confirmed resize of a running composed config, close the open
  segment at the change time, **re-resolve all component rates at the current rate card** (#79),
  open a new segment with the new composition + a new appended lock. Grandfathering protects only
  the *unchanged* config — a resized config is priced at today's rates.
- **Mode switch is the same event.** Sliding off a preset onto a custom shape closes the preset
  (flat) segment and opens a composed segment (dropping the bundle discount); picking a preset from
  a custom shape does the reverse. Both prorate cleanly across the switch within the month.
- **Validated like a new provision.** The new shape is run through the #81 validator (ratio, steps,
  bounds) and the team's headroom before the resize is accepted.
- Reuse the Atlas resize call + confirmation and the append-only lock history from #54; only the
  composed re-resolution and the preset↔composed transition are new.

## Acceptance criteria

- [ ] Resizing a composed config closes the open segment and opens a new one carrying the new composition (on the Subscription) + a `locked_rate` = the **config total re-resolved** at the **current** rate card; the lock history shows both, the old row unaltered.
- [ ] Sliding off a preset opens a composed segment (no bundle discount); picking a preset from a composed config opens a preset flat segment. Both prorate correctly across the change within the month.
- [ ] A resize to an off-ratio / out-of-bounds shape, or one exceeding headroom, is rejected before the Atlas call.
- [ ] Resizing to the identical composition is a no-op (no event), matching #54.
- [ ] A resize on a never-provisioned or terminated config records nothing.
- [ ] Test: provision composed `2 vCPU`, resize to `4 vCPU` mid-month after a rate-card change, assert two prorated segments with the old segment on locked rates and the new segment on current rates.

## Blocked by

- [#80](80-composed-subscription-itemized-invoice.md) (the composed subscription being resized)
- [#81](81-sub-category-proportionality-bounds.md) (the validator the new shape is checked against)
- [#54](54-changed-event-resize-plan-change.md) (the `changed`-event re-lock + Atlas resize flow reused)
