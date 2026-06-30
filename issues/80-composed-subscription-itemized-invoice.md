# 80 — Composed Subscription: composition + locked component rates, itemized invoice

**Type:** AFK · **Milestone:** CC · **Spec:** [final-plan-pricing.md §3/§5/§5.2/§9](../final-plan-pricing.md), [plan-writeup.md §7](../plan-writeup.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)

## What to build

Let a customer provision a **composed compute config** (no UI yet — API + engine) and bill it
from its parts, while presets keep behaving exactly as today.

- **Pricing-mode axis on the Subscription.** A subscription/segment is either **preset** (links a
  `Plan`, bills its flat rate, unchanged) or **composed** (carries its `includes` — qty per
  `Resource Type` — and the **locked per-resource rates** in force at provision). No `Plan` is
  minted for a composed config.
- **Provision a composed config.** Given a composition (qty per Compute/Memory/Disk), Central
  resolves each component rate live from the rate card (#79), **locks** them (shown = locked),
  writes the composition onto the Subscription, and appends a price-lock row + `subscribed` event
  for the `resource_id` — the same path a preset takes, with a set of component rates instead of one
  bundle rate.
- **Invoicing branches on the mode.** A composed segment bills **one itemized line per resource**
  (`Compute 2 vCPU × rate`, `Memory 4 GB × rate`, `Disk 40 GB × rate`), each time-prorated by days
  alive within the period; the segment total is the sum. A preset segment still bills its single
  flat line. The segmented two-phase generation ([#09](09-postpaid-invoice-generation-fixed.md)) is
  reused — only the line-building for a composed segment is new.
- **Grandfathering holds while unchanged.** A later rate-card edit (#79) does not change a running
  composed config's bill — it reads its locked rates. (Resize re-resolution is #82.)

## Acceptance criteria

- [ ] A Subscription can be created in `composed` mode carrying `includes` (qty per resource) + locked component rates; a `preset` subscription is unchanged.
- [ ] Provisioning a composed config resolves+locks the component rates and writes one price-lock + `subscribed` event for the `resource_id`; the lock records all component rates.
- [ ] An invoice for a composed config has one itemized line per resource, each time-prorated by days alive; the total equals `Σ(qty × locked_rate)` prorated.
- [ ] After an admin changes a component rate (#79), a running composed config still bills its **locked** rates (grandfathered); only a new provision picks up the new rate.
- [ ] A preset subscription bills exactly one flat line as before (regression).
- [ ] Test: provision `2 vCPU · 4 GB · 40 GB` composed, generate a full-month invoice, assert three itemized lines and the expected total in minor units.

## Blocked by

- [#79](79-per-resource-rate-card.md) (the component rate card to resolve + lock)
- [#04](04-subscription-intent-two-axis-state.md) (the Subscription the mode axis lives on)
- [#03](03-agent-event-log-price-lock.md) (price-lock + `subscribed` event the lock is appended to)
- [#09](09-postpaid-invoice-generation-fixed.md) (segmented two-phase invoice generation reused)
