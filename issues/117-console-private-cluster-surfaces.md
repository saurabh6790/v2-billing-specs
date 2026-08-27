# 117 — Console: pick a private cluster, see what the metal costs

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (Surfaces) · **Related:** [dashboard.md](../dashboard.md)

## What to build

The customer-facing surfaces. Everything an operator does — registering clusters, granting access,
registering nodes, setting the pricing basis — stays in Desk and is not in this issue.

1. **The region picker lists private clusters** the team holds a grant for, alongside public regions,
   labelled as the customer's own. A team with no grant sees no trace of one.
2. **Plan cards price at zero on a private cluster** — "Covered by your cluster" rather than a
   currency figure, on both the create and resize menus. Capacity gating on the menu is unchanged; the
   physical machine is the ceiling.
3. **A Private cluster page**, one per cluster the team owns: the nodes, each one's pricing basis and
   billed quantity, and the management fee for the current cycle. This is the only place a private-
   cluster customer sees what they actually pay us, so it is the page that has to be right.
4. **Billing Overview reflects the split.** The cycle estimate is the management fee; the servers
   running on the cluster appear in the breakdown at zero rather than being missing.
5. **A read-only banner when the cluster is past due** ([#116](116-private-cluster-enforcement-read-only.md)):
   what is switched off, that the VMs are still running, and the action that settles it. Write
   controls are disabled with that reason attached, not hidden.

Frappe-UI in the console (`dashboard/`), on press's frappe-ui/tailwind preset — no bespoke palette.
Any list follows the shared ListView conventions already in use.

## Acceptance criteria

- [ ] A team with a `Free` grant sees its private cluster in the region picker; a team without one
      does not.
- [ ] Plan cards on a private cluster read "Covered by your cluster"; on a public region they are
      unchanged.
- [ ] The Private cluster page lists every node with its basis, quantity and rate, and the cycle fee
      totals to the same number the invoice will carry.
- [ ] Billing Overview's cycle estimate equals the management fee, and zero-rated servers appear in
      the breakdown.
- [ ] Past due renders the banner and disables write controls with the reason shown; reads still work
      and the pay action is reachable.
- [ ] Mutating calls are `POST` on both ends (the `useCall` GET-rollback trap).
- [ ] Console builds.

## Blocked by

- [#113](113-managed-cluster-catalog-and-node-registration.md), [#114](114-private-cluster-workload-resolves-to-zero.md) (there must be a fee and a zero rate to render), [#116](116-private-cluster-enforcement-read-only.md) (for the banner).
