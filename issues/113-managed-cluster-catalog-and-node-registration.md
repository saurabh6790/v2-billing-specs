# 113 — Register a node, bill the node: the Managed Cluster catalog

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (Why the node is the subject, The three pricing bases) · **ADR:** [0007](../docs/adr/0007-polymorphic-catalog-category-masters.md), [0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md), [0013](../docs/adr/0013-team-level-metered-services-synthesized-subject.md)

## What to build

The tracer bullet: a registered bare-metal node produces a monthly invoice line. This is the whole
revenue side of private clusters.

1. **Catalog masters**, authored through the configurator / `ensure_catalog_masters` rather than
   hand-injected — a new `Plan Category` **Managed Cluster** with `Resource Type` **Bare Metal
   Node** and three `Plan Sub-Category` rows, one per pricing basis:

   | Sub-Category | Unit | Quantity |
   |---|---|---|
   | Per Physical Core | Core | `node.physical_cores` |
   | Per Thread | vCPU | `node.threads` |
   | Flat per Node | Nos | 1 |

   `Core` is a new value on the predefined Unit select.
2. **New DocType `Cluster Node`** — `cluster` (Link → Atlas Instance, must be `kind = Private`),
   `atlas_server` (Data, Atlas's `Server.name`), `physical_cores`, `threads`,
   `memory_megabytes` (Int, operator-declared), `plan` (Link → Plan), `status` (Select mirroring
   Atlas: Pending / Active / Draining / Broken / Archived), `active_since` (Datetime).
   `(cluster, atlas_server)` is unique.
3. **Registering a node opens a subscription.** The node's `Subscription` carries
   `service_subject = node:<atlas_server>` — the seam [ADR 0013](../docs/adr/0013-team-level-metered-services-synthesized-subject.md)
   cut, which the rating path already reads as `asset_id or service_subject`. No new subject concept,
   and no VM-shaped `Asset` row standing in for a physical machine.
4. **Quantity resolves from the basis**, and the plan carries a **minimum billable quantity** (16 for
   the core/thread bases) applied as a floor.
5. **Billing starts at `Active`**, stamped on `active_since` — the same rule as "a VM that never
   provisioned never bills". A node registered but never brought up bills nothing.
6. **A hardware change is a `changed` event** on that node's subscription: it closes the segment,
   opens a new one at the current rate with the new quantity, and prorates through the existing
   day/hour partitioned line computation. Only the changed node re-prices — that is the entire reason
   the node is the subject rather than the cluster.
7. **The basis is operator-set.** No API and no UI lets a customer choose or change it. Per-thread is
   roughly per-core halved on SMT-2 hardware and flat is neither, so a self-serve menu of the three
   is an arbitrage, not a product.

Desk-only, like [#112](112-private-cluster-atlas-instance-and-access.md).

## Acceptance criteria

- [ ] The three sub-categories exist under Managed Cluster and are authored through the configurator
      path, not injected.
- [ ] Registering an `Active` node on each basis opens a subscription whose `service_subject` is
      `node:<atlas_server>` and whose locked quantity is cores / threads / 1 respectively.
- [ ] A node with 4 cores on a per-core plan with a floor of 16 bills 16.
- [ ] A registered node still at `Pending` opens no segment and bills nothing.
- [ ] The month's invoice for the owner team carries one line per node, at the locked rate.
- [ ] Raising a node's core count mid-cycle closes and re-opens the segment, prorates both parts, and
      leaves every *other* node's locked rate untouched.
- [ ] A `Catalog Rate` scoped to a specific private Atlas Instance wins over the global rate for that
      cluster's nodes.
- [ ] `(cluster, atlas_server)` is unique; a second registration of the same server is refused.
- [ ] Suite green.

## Decisions baked in

- **Node is the billed subject, not the cluster** — cluster-as-subject re-prices grandfathered nodes
  whenever hardware is added ([ADR 0010](../docs/adr/0010-price-lock-folded-into-subscription-change.md)).
- **`service_subject`, not a synthetic Asset** — reuses ADR 0013 and keeps the customer's server list
  free of machines that are not VMs.
- **Inventory is declared, not discovered** — Atlas records `vcpus_total` only and nothing about
  physical cores; see [#118](118-node-inventory-reconciliation-atlas-ask.md).

## Blocked by

- [#112](112-private-cluster-atlas-instance-and-access.md) (the cluster must be markable as Private).
