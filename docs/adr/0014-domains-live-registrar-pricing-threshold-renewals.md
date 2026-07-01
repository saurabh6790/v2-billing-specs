# Domains: live-registrar per-instance pricing with threshold-guarded renewals

Date: 2026-07-01

Domains fit neither the catalog-priced recurring model nor the metered model. Their price is
**per-TLD**, sourced as a **pass-through of the registrar's wholesale cost** (plus markup), and it
**drifts over time**. Registration is the first period of an annual commitment — not a separate
one-time fee — so the general "first-class one-time line item" need the Domains misfit seemed to
raise actually **dissolves** (there is nothing one-shot to bill; year 1 is just the first annual
charge). Modelling a `Plan` per TLD is the proliferation trap the catalog work exists to avoid.

## Decision

**A domain is an annual `Subscription` on a single `Domain` `Plan` (Category = `Domains`); the TLD
and its price are per-instance data on the Subscription, and the rate is sourced live from a
registrar adapter at registration and locked on the price-lock spine.**

- **No Plan-per-TLD.** One `Domain` Plan. The TLD and the locked rate live on the **Subscription**,
  exactly as a composed config carries its composition and whole-config rate rather than minting a
  Plan ([ADR 0009](0009-composable-resource-pricing-design-your-own-config.md)).

- **Live registrar source, then lock.** At registration a **registrar adapter** (a new external
  seam, mirroring the gateway-adapter architecture) returns the TLD's current wholesale; markup is
  applied and the result is stamped as `locked_rate` on the `Created` `Subscription Change` row
  ([ADR 0010](0010-price-lock-folded-into-subscription-change.md)). The rate is **not** read from
  `Catalog Rate` — the registrar is the source of truth for TLD prices. The **wholesale cost** used
  is stored alongside the customer rate so renewals can compare against it.

- **Renewals grandfather, guarded by a cost threshold.** Each annual renewal re-checks the registrar
  wholesale. If it has risen beyond a configured band above the locked wholesale, the domain
  **re-prices** — re-query, re-apply markup, re-lock, opening a **new segment** just like a resize's
  `Plan Changed` re-lock. Otherwise the locked rate carries forward unchanged. This caps margin
  bleed without exposing the customer to annual registrar volatility.

## What does not change

The price-lock spine, grandfathering semantics, and the no-proliferation rule all stand. What is
new is a **rate source outside the catalog** (the registrar adapter) and a **conditional renewal
re-lock**; both ride the existing `Subscription Change` segment mechanism.

## Consequences

- **Registration couples provisioning to a live registrar call** — accepted for price accuracy; the
  registrar adapter must handle timeout/unavailability at the provision boundary.
- **New stored fields**: the locked wholesale cost (to compare at renewal) and the threshold band
  (per TLD, or on the `Domain` Plan / `Domains` Category).
- **A registrar adapter seam** is introduced, analogous to the gateway adapter.
- **The general one-time line item stays unbuilt.** Domains no longer drive it; it remains a
  separate, currently-undriven capability (setup fees, one-off services) — deferred until a real
  offering needs it, not built speculatively.

## Considered and rejected

- **Synced per-TLD rates on `Catalog Rate`** (a periodic registrar→catalog sync, resolved-and-locked
  like any rate). Cleaner reuse of the spine and resilient to registrar downtime, but rejected in
  favour of a **live** call for price accuracy at the moment of sale; the trade is coupling
  provisioning to registrar availability.
- **A `Plan` per TLD.** Rejected: proliferation, the exact trap
  [ADR 0009](0009-composable-resource-pricing-design-your-own-config.md)/[ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md)
  avoid.
- **Pure grandfathering** (absorb every registrar increase → margin bleed) and **re-price every
  renewal** (annual customer surprise). The threshold guard is the deliberate middle.

## Supersedes / amends

- Builds on [ADR 0009](0009-composable-resource-pricing-design-your-own-config.md) (instance detail +
  locked rate on the Subscription) and [ADR 0010](0010-price-lock-folded-into-subscription-change.md)
  (locked rate on the change row).
- Distinct from [ADR 0002](0002-live-priced-storage-add-ons.md): a live-priced add-on reads the
  current **catalog** rate *every* period; a domain locks a **registrar-sourced** rate and only
  re-prices when a cost threshold is crossed.
