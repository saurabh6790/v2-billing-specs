# 83 — `get_eligible_plans` returns the rate card + profile bounds + headroom

**Type:** AFK · **Milestone:** CC · **Spec:** [plan-writeup.md §8](../plan-writeup.md), [final-plan-pricing.md §5.2](../final-plan-pricing.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)

## What to build

Extend the customer catalog endpoint so a client has everything it needs to **design and bound a
config**, not just pick a preset.

- `central.billing.api.dashboard.catalog.get_eligible_plans` returns, in addition to today's
  preset list:
  - `rate_card` — the resolved per-resource rates for the team's currency + region (`Compute`,
    `Memory`, `Disk` with their units), from #79.
  - `profiles` — per optimization profile (`Plan Sub-Category`): `ram_ratio`, `vcpu_steps`,
    `disk_min`, `disk_max`, from #81.
  - `available` — the team's remaining trust-tier headroom (already computed for preset filtering),
    surfaced so the client can cap the slider.
- **Provision re-validates server-side.** A composed-config provision request re-checks composition,
  ratio, steps, bounds (#81), *and* that `Σ(qty × rate)` fits within current headroom — the client
  bounds are a convenience, the server is the gate. A request exceeding headroom or violating bounds
  is rejected.

## Acceptance criteria

- [ ] `get_eligible_plans` returns `rate_card`, `profiles`, and `available` alongside the existing preset list, all resolved for the team's currency + region.
- [ ] `rate_card` reflects regional-over-global resolution (#79); a currency with no component rates yields no rate card (composed configs not offered), not zeros.
- [ ] Provisioning a composed config that exceeds `available` headroom is rejected server-side even if the request claims otherwise.
- [ ] Provisioning an off-ratio / out-of-bounds composed config is rejected server-side (reuses #81).
- [ ] When the region isn't allowed for the team, presets **and** rate card come back empty.
- [ ] Test: a team on a known cap gets a `rate_card` + `profiles`; a composed provision just over headroom is refused, one just under succeeds.

## Blocked by

- [#79](79-per-resource-rate-card.md) (the rate card resolved into the response)
- [#81](81-sub-category-proportionality-bounds.md) (the profile bounds + the shared validator)
- [#07](07-trust-tier-entitlement-token.md) (the headroom / trust-tier cap surfaced and enforced)
