# 80 — Composed Subscription: composition on the Subscription + whole-config rate locked, single billed line

> **Updated 2026-06-30 ([ADR 0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)).** The "price-lock row + `subscribed` event" is the opening **`Subscription Change`** row. We do **not** freeze per-resource charges: the **composition** (qty per resource) is locked on the **Subscription**, and the change row's single `locked_rate` holds the **whole-config rate** — `Σ(qty × component_rate)` resolved live, then frozen as one number. Both modes use the one Currency field, and a composed config **bills as a single time-prorated line** at its locked config rate (composition shown as the line's description), not one priced line per resource. Adjusts the criteria below accordingly.

**Type:** AFK · **Milestone:** CC · **Spec:** [final-plan-pricing.md §3/§5/§5.2/§9](../final-plan-pricing.md), [plan-writeup.md §7](../plan-writeup.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md), [0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)

## What to build

Let a customer provision a **composed compute config** (no UI yet — API + engine) and bill it
from its parts, while presets keep behaving exactly as today.

- **Pricing-mode axis on the Subscription.** A subscription/segment is either **preset** (links a
  `Plan`, bills its flat rate, unchanged) or **composed** (carries its `includes` — qty per
  `Resource Type` — as the locked **composition**). No `Plan` is minted for a composed config.
- **Provision a composed config.** Given a composition (qty per Compute/Memory/Disk), Central
  resolves each component rate live from the rate card (#79), **sums them into the whole-config
  rate**, writes the composition onto the Subscription, and appends a `Created` **`Subscription
  Change`** row stamping that config total as the segment's `locked_rate` (shown = locked) — the same
  path a preset takes, with the summed config rate instead of a bundle rate.
- **Invoicing reads the locked config rate.** A composed segment bills a **single time-prorated
  line** at its `locked_rate` (the composition is shown as the line's description, e.g.
  `Custom: 2 vCPU · 4 GB · 40 GB`), time-prorated by days alive. A preset segment bills its single
  flat line. The segmented two-phase generation ([#09](09-postpaid-invoice-generation-fixed.md)) and
  the line engine are reused unchanged — a composed segment is just another rate-bearing change row.
- **Grandfathering holds while unchanged.** A later rate-card edit (#79) does not change a running
  composed config's bill — it reads the locked config rate. (Resize re-resolution is #82.)

## Acceptance criteria

- [ ] A Subscription can be created in `composed` mode carrying `includes` (qty per resource) as its composition; a `preset` subscription is unchanged.
- [ ] Provisioning a composed config resolves the component rates, **sums them**, and writes one `Created` `Subscription Change` row whose `locked_rate` is the config total; the composition is stored on the Subscription. No per-resource rate is frozen.
- [ ] An invoice for a composed config has **one line** at the locked config rate, time-prorated by days alive; the amount equals the prorated `locked_rate`.
- [ ] After an admin changes a component rate (#79), a running composed config still bills its **locked** config rate (grandfathered); only a new provision picks up the new rate.
- [ ] A preset subscription bills exactly one flat line as before (regression).
- [ ] Test: provision `2 vCPU · 4 GB · 40 GB` composed (config total = `Σ`), generate a full-month invoice, assert one line and the expected total in minor units.

## Blocked by

- [#79](79-per-resource-rate-card.md) (the component rate card to resolve + lock)
- [#04](04-subscription-intent-two-axis-state.md) (the Subscription the mode axis lives on)
- [#03](03-agent-event-log-price-lock.md) (the `Subscription Change` ledger the locked-rate row is appended to)
- [#09](09-postpaid-invoice-generation-fixed.md) (segmented two-phase invoice generation reused)
