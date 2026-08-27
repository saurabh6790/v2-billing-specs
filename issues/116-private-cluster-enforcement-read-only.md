# 116 — Delinquency on a private cluster takes the tools, never the machine

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (Enforcement) · **ADR:** [0018](../docs/adr/0018-invariants-are-enforced-not-observed.md) · **Related:** [#14](14-retry-dunning-suspension.md)

## What to build

Dunning today reconciles "the team's VMs" to a desired state by calling Atlas — `stop_vm`, then
`terminate_vm`. Pointed at a team that owns its own hardware, that reaches into a machine we do not
own and switches off their production. This issue makes that impossible and puts a real consequence
in its place.

1. **A hard guard in the enforcement client.** Any `stop_vm` / `terminate_vm` issued by the
   *enforcement* path against a VM on a `kind = Private` cluster raises. Not a policy note, not a
   conditional in the caller — a guard at the boundary with a test behind it, per
   [ADR 0018](../docs/adr/0018-invariants-are-enforced-not-observed.md). Customer-initiated power
   actions are untouched; it is enforcement specifically that is forbidden.
2. **Read-only by capability revocation.** At `Past Due`, the team's write capabilities on that
   cluster are revoked — `vm:create`, resize, power actions, snapshot operations. Every read survives:
   the fleet, the invoices, the spend history, and the button that settles the bill. No Atlas call is
   made at any point.
3. **`Suspended` stops managed services too** — backups, monitoring and patching for that cluster
   stop. VMs keep running.
4. **Enforcement splits by cluster kind.** A team holding public VMs *and* a private cluster gets the
   ordinary ladder on the public VMs and the read-only ladder on the private cluster, from the same
   past-due invoice. The current implementation cannot express this and must be taught to.
5. **Recovery is symmetrical.** Payment restores capabilities and managed services immediately; no
   customer action and no re-provisioning is required, because nothing was taken away except
   permission.
6. **The customer is told what happened.** The past-due notification and the console banner name
   which cluster is read-only, what is switched off, and what settles it. A read-only state nobody
   explained is indistinguishable from a broken product.

**Out of scope:** step 4 of the ladder — terminal de-registration and credential hand-back. It needs
a contractual number of days and a written procedure before it needs code
([private-clusters.md](../private-clusters.md) § Open questions).

## Acceptance criteria

- [ ] Enforcement calling `stop_vm` or `terminate_vm` against a VM on a Private cluster raises, and
      the test asserts it — including for a team that is genuinely, deeply delinquent.
- [ ] A customer-initiated stop of their own VM on a private cluster still works.
- [ ] `Past Due` on a private cluster revokes exactly the write capabilities and leaves reads intact;
      the team can still open its invoice and pay.
- [ ] `Suspended` additionally halts backups, monitoring and patching for that cluster.
- [ ] A team with one public VM and one private cluster, one past-due invoice: the public VM is
      stopped, the private cluster's VMs are still running, and its control plane is read-only.
- [ ] Settling the invoice restores capabilities and services with no further action.
- [ ] The past-due notification names the cluster and what has been switched off.
- [ ] Suite green.

## Decisions baked in

- **Enforcement is an IAM downgrade, not an Atlas call** — the capability model already gates every
  write, so this is a revocation, not a new mechanism.
- **Never power off hardware we do not own**, at any stage of the ladder, for any amount owed.
- **Downtime does not pause the fee** — a `Broken` node keeps billing
  ([#115](115-node-lifecycle-from-server-status-changed.md)).

## Blocked by

- [#112](112-private-cluster-atlas-instance-and-access.md) (cluster kind), [#113](113-managed-cluster-catalog-and-node-registration.md) (there must be a fee to go unpaid).
