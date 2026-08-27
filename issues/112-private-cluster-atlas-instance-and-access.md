# 112 — A private cluster is an Atlas Instance somebody owns

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (Concepts, Data model)

## What to build

The first slice of private clusters: mark which Atlas Instances are customer-owned metal, record who
owns each one, and record which teams may provision into it and on what terms. No pricing, no
enforcement change, no console — this exists so everything after it has something to hang off.

There is deliberately **no new cluster DocType**. `Asset.cluster`, `Catalog Rate.cluster` and
`Subscription.cluster` already Link to `Atlas Instance`, and `Region.provider` already carries
`Self-Managed`. A private cluster is an existing record with two new facts about it.

1. **`Atlas Instance` gains `kind`** (Select: `Public` / `Private`, default `Public`) **and
   `owner_team`** (Link → Team). `owner_team` is required when `kind = Private` and must be empty
   otherwise — validated, not merely conventional.
2. **New child table `Cluster Access`** on Atlas Instance: `team` (Link → Team) and
   `billing_treatment` (Select: `Free` / `Standard`). It answers "may this team provision here, and
   what do its VMs cost".
3. **The owner's grant is created for them.** Saving an instance as `Private` with an `owner_team`
   ensures a `Free` grant for that team. An operator can add further grants by hand; nothing in this
   issue creates them automatically.
4. **A team with no grant cannot provision into a private cluster.** The check goes in the same
   synchronous gate that already runs the IAM capability check and the trust-tier cap
   ([provisioning-and-entitlements.md](../provisioning-and-entitlements.md)) — a private cluster is
   invisible to teams without a grant, and an attempt to name one directly is refused.
5. **Migration patch** stamping `kind = Public` on every existing Atlas Instance, so no live cluster
   changes behaviour on deploy.

Desk-only. Registering a private cluster is an operator action following a contract; there is no
self-serve path and this issue must not create one.

## Acceptance criteria

- [ ] A new Atlas Instance defaults to `Public`; after migrate, every pre-existing instance is `Public`.
- [ ] Saving `kind = Private` without an `owner_team` fails validation; saving `kind = Public` *with*
      one fails too.
- [ ] Saving a Private instance yields a `Free` `Cluster Access` row for the owner team, and saving
      again does not duplicate it.
- [ ] A team holding no grant is refused at the provision gate when it names a private cluster, with
      an error that does not disclose the cluster's existence.
- [ ] A team holding a grant passes the gate (rates are still ordinary — [#114](114-private-cluster-workload-resolves-to-zero.md) changes that).
- [ ] Suite green.

## Decisions baked in

- **No cluster DocType** — the cluster axis is already `Atlas Instance` everywhere in billing.
- **`billing_treatment` lives on the grant, not the cluster** — it is what keeps the third-party-team
  case ([partner-billing.md](../partner-billing.md)) open without building for it now.
- **Desk only** — see [private-clusters.md](../private-clusters.md) § Surfaces.

## Blocked by

Nothing.
