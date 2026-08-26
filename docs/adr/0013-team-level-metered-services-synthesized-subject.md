# Team-level metered services key on a synthesized (team, service, cluster) subject

Date: 2026-07-01

Some metered offerings — **email, common PDF rendering**, and future ones like them — have no
customer-owned asset. They **run on a cluster** (so rates still resolve regional-over-global) but
usage is attributed to the **team**, not to a VM the customer provisioned. Everything in metering
and invoicing keys on `resource_id` (reached via the Subscription's `asset_id`); a team-level
service has no asset to supply one. The question is how to bill these without inventing a parallel
metering/invoicing path.

## Decision

**A team-level metered service is a metered single-resource `Plan`
([ADR 0008](0008-add-on-as-metered-single-resource-plan.md)) whose subject is a _synthesized
virtual `resource_id` per `(team, service-plan, cluster)`_ — not a customer asset.** The cluster
manager reports each team's per-cluster counts; Central records `Usage Meter` rows against the
synthesized subject. Nothing else in the pipeline changes:

- **Rate resolution is unchanged** — regional-over-global by cluster. The **global** (null-cluster)
  Catalog Rate applies by default; a **region-specific** rate applies wherever an override exists.
  "Mostly global, occasionally regional" is the resolver's existing behavior, free.
- **The price-lock spine is unchanged** — each cluster-subject carries its own `locked_rate` on its
  own `Subscription Change` segment ([ADR 0010](0010-price-lock-folded-into-subscription-change.md)).
- **Lifecycle is unchanged** — `Created` opens the segment, `Cancelled` closes it. A service subject
  is always "alive" while subscribed; there is no stop/start.
- **Provisioning** ([ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md)) for
  these plans mints the virtual subject and opens the billing segment instead of calling the cluster
  manager to create a VM.

Structurally this makes a team-level service **identical to a metered add-on with a synthesized
subject** — no new metering or invoicing concept.

### Allowance scope is a family property

The included allowance (`Plan Includes.quantity`, e.g. "10k emails/mo") is the one authentically
team-wide quantity, and how it behaves across a team's cluster-subjects is set on the **`Plan
Category`** (already behavioral/self-describing, [ADR 0007](0007-polymorphic-catalog-category-masters.md)):

- **Globally-priced family → allowance pools team-wide.** One shared allowance is drawn down across
  all of the team's cluster-subjects before any overage. Safe precisely because the rate is uniform,
  so draw-down order cannot change the bill.
- **Regionally-priced family → allowance is per-cluster.** Each cluster-subject keeps its own
  allowance. No cross-subject accounting, and no ambiguous "which region's usage was free" ordering
  when regions price differently.

The pool-vs-per-cluster choice is an **explicit stored Category property**, not derived from "does a
regional override exist" — deriving it would silently flip an in-flight subscription's allowance
behavior (a billing change) the moment an override is added.

## Consequences

- The `resource_id`-keyed metering/invoicing pipeline is reused wholesale; the only new code is
  subject synthesis at provision and the allowance-pooling branch for globally-priced families.
- The cluster manager must report team-attributed counts per cluster for these services.
- Adding a regional rate to a previously-global family is a **deliberate** change (it moves that
  family from pooled to per-cluster allowance going forward) — surfaced, never silent.

## Considered and rejected

- **One team-level subject with pooled usage and a single rate** (`(team, service-plan)` only).
  Rejected: it cannot express region-specific pricing, which some regions require — a single
  `locked_rate` over usage that spanned several regions is incoherent.
- **Generalize the billing key from `resource_id` to a polymorphic asset-or-team-service subject.**
  Rejected: rewrites `Usage Meter`, the rollup, every reader, and invoicing for cosmetic
  uniformity — the same trade [ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md)
  rejected in its "full collapse."

## Supersedes / amends

- Builds on [ADR 0008](0008-add-on-as-metered-single-resource-plan.md) (add-on = metered
  single-resource Plan), [ADR 0007](0007-polymorphic-catalog-category-masters.md) (behavioral
  Category), [ADR 0006](0006-agentless-central-owns-provisioning-and-enforcement.md) (Central
  provisions/records), and [ADR 0010](0010-price-lock-folded-into-subscription-change.md) (locked
  rate on the change row).
