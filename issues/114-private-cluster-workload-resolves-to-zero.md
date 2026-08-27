# 114 — Workload on a private cluster costs nothing, and is still recorded

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (Workload resolves to zero; The provision gate stops being about money) · **ADR:** [0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)

## What to build

The customer-visible half of private clusters: they bought the hardware, so they do not pay us for
the compute running on it.

1. **One branch in rate resolution.** On a cluster with `kind = Private`, a team whose
   `Cluster Access` grant is `Free` resolves workload plans to **0**. A `Standard` grant resolves at
   ordinary region rates, unchanged.

   It must be a rule, not seeded zero-value `Catalog Rate` rows per (plan, private cluster). Seeded
   rows decay the moment somebody adds a new VM plan: the gate treats a missing rate as an error, so
   every private cluster would start refusing the new plan with "no rate". A rule survives new plans.
2. **The `Subscription` is still created**, at `locked_rate = 0`, with its ordinary
   `Subscription Change` segment. Nothing downstream learns a special case: inventory, the cycle
   forecast, notifications, entitlements and the admin reports all keep reading one shape.
3. **The trust-tier cap is skipped for `Free` grants** at the provision gate. Projected run-rate is
   zero so the cap could never bind anyway, but skipping it explicitly says why: the tier is our
   credit-risk judgement and there is no credit risk in a customer's own metal. `Standard` grants keep
   the cap.
4. **Capacity stays the gate that matters**, and needs no work — `Atlas Instance.validate_capacity` is
   already in place and Atlas's placement raises `NoCapacityError` authoritatively at create time.
5. **Zero-rated lines on the invoice.** A private-cluster VM appears on the invoice at 0 rather than
   being suppressed, so the document shows everything the team ran.

## Acceptance criteria

- [ ] A team with a `Free` grant provisioning a VM on a private cluster gets a Subscription with
      `locked_rate = 0`, and the cycle invoice shows the line at zero.
- [ ] Adding a brand-new VM plan to the catalog does not break provisioning on any private cluster
      (the regression that seeded zero rates would cause).
- [ ] A team with a `Standard` grant on the same cluster is charged ordinary region rates and keeps
      its trust-tier cap.
- [ ] A `Free` team whose projected run-rate would exceed its trust tier still provisions.
- [ ] Capacity refusal from Atlas surfaces unchanged on a private cluster.
- [ ] The team's forecast and Billing Overview include the zero-rated resources without inflating the
      estimate.
- [ ] Suite green, with a case covering a team that holds both public VMs and private-cluster VMs in
      one cycle.

## Decisions baked in

- **A resolution branch, not zero-rate rows** — see above; this is the difference between a rule that
  survives catalog growth and data that quietly rots.
- **Record the subscription anyway** — skipping it saves a few lines and blinds every subscription
  reader on the highest-value accounts.

## Blocked by

- [#112](112-private-cluster-atlas-instance-and-access.md) (grants are what `Free` is read from).

## Notes

The `cost_report` invoice type ([#16](16-free-trial-cost-report.md)) can compute what this workload
*would* have cost on a public region without charging for it — the renewal-conversation artifact
described in the spec. Deliberately **not** in this issue; it is a surface decision, not a billing
one.
