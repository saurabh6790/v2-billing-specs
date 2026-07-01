# Provisioning & Entitlements

## Purpose

Define how a resource gets provisioned — Central calling the cluster manager — and how Central bounds what each team may run via trust tiers, enforced synchronously at provision time.

> **Updated 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is **no Subscription Agent** and **no signed Entitlement Token**. Central provisions by calling the **cluster manager** API and enforces the trust-tier cap **synchronously, in that call**. Enforcement (suspend/terminate) is Central calling the cluster manager. The trust-tier model below is unchanged; the token/offline-verification machinery is removed.

## Concepts

- **Central-driven provisioning** — the customer subscribes on Central; Central checks the cap and calls the **cluster manager** (Bench Manager) API to create the VM, recording the event log + price-lock in the same step.
- **Trust tier** — the cap *is* the team's trust tier, computed by Central from billing history. Auto-ramped. Enforced by Central at provision time (and as the mandate ceiling — see [payments-inr.md](payments-inr.md)).

## Trust tiers

The entitlement cap is the current trust tier's limit.

- **Ladder** (admin-defined): `t0` (entry/trial, e.g. $100, single cluster) → `t1` ($300) → `t2` …
- **Promotion** — declarative, auto-applied: `K consecutive paid invoices AND cumulative paid ≥ $X`. Admin override available. (Reuse press's existing thresholds.)
- **Demotion** — fast, on missed payment / chargeback / fraud signal. **Limits growth only**: running resources survive; only actual non-payment triggers stop/terminate (see [subscriptions.md](subscriptions.md)).
- **Two measures, never conflated:** provisioning checks *projected run-rate* (Central, at the provision call); promotion checks *historical paid* (Central, monthly).

**Trust Tier** (per team — computed by Central from billing history)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| tier | Select | t0 (entry/trial) / t1 / t2 / … (admin-defined ladder) |
| max_spend | Currency | Float, **major units** — monthly cap (= mandate ceiling for mandate teams). *([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) minor-units model deprecated.)* |
| max_resource_count | Int | |
| allowed_plans | JSON | |
| allowed_clusters | JSON | Trial = single cluster |
| promoted_at | Datetime | |
| promotion_basis | Small Text | Rule that granted it (`K paid months + ≥ $X`) — audit |
| manual_override | Check | Admin-set; exempt from auto-demotion |

## Cap enforcement at provision

The cap is the structured limit on the **Trust Tier** above — categorical (plan
whitelist, allowed clusters/resource types) plus quantitative (`max_spend`,
`max_resource_count`). Because Central performs the provision call itself, it
enforces the cap **synchronously and team-wide** — it knows every live provision
across every cluster, so there is no need to pre-partition the cap into signed
per-cluster slices. A provision that would breach the cap is rejected by Central
before it calls the cluster manager. Trial = single cluster (`allowed_clusters =
[one]`); launch is single-cluster, multi-cluster rebalancing deferred.

## Lifecycle rules

- **Provisioning requires Central** (it makes the cluster-manager call and records the lock). Onboarding additionally requires first payment-method validation.
- **Central unreachable:** new provisions can't happen (provisioning is a Central-initiated action); **running resources are untouched** — the cluster manager only stops a VM on an explicit Central directive, so an outage never harms a running resource.
- **Credits-only teams:** effective cap = `min(tier cap, wallet-covered spend)` — the wallet gates provisioning. See [credits.md](credits.md).

## Enforcement (suspension)

Suspension/termination is **Central calling the cluster manager API** to act on the team's VMs. Staged (driven by dunning, [#14](issues/14-retry-dunning-suspension.md)):

1. `past_due` (a retry failed) → keep running (grace); no cluster-manager call.
2. `suspended` (dunning window exhausted) → Central calls the cluster manager to **stop / power-off**; data preserved.
3. After ~30 days suspended → Central calls the cluster manager to **terminate**, with notice.

Distinction: **Central unreachable** → nothing is stopped (no directive is sent). **Central decides delinquent** → Central issues the stop/terminate call.

## API

```
# [Customer] Create subscription — records intent + triggers the provision call
POST /api/resource/Subscription
     { "plan": "...", "billing_cycle": "...", "default_payment_method": "...", "cluster": "..." }

# [Central → Cluster Manager] Provision / change / stop / terminate a resource
#   (outbound integration seam; Central checks the trust-tier cap before calling)
POST https://{cluster-manager}/api/method/<provision|stop|terminate>

# [Admin] Force standing transition (drives the enforcement calls above)
POST /api/method/cloud_billing.admin.set_subscription_status
     { "subscription": "...", "status": "suspended", "reason": "non-payment" }
```

## Notes

- The "trial" label and tier semantics live on Central; the cluster manager just executes provision/stop/terminate calls.
- The dunning window length is the single dial trading customer grace against credit risk (was: token lifetime).
