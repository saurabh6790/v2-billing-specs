# Provisioning & Entitlements

## Purpose

Define how a resource gets provisioned at a regional cluster — independent of Central's availability — and how Central bounds what each team may run via trust tiers and signed entitlement tokens.

## Concepts

- **Regional provisioning** — provisioning happens at the cluster / Bench Manager, not Central, so it survives Central being down. Central's subscription API records *intent* only.
- **Entitlement token** — a short-lived, signed credential issued by Central, verified **locally** by the cluster (no live call). Carries the team's structured cap.
- **Trust tier** — the cap *is* the team's trust tier, computed by Central from billing history. Auto-ramped.

## Trust tiers

The entitlement cap is the current trust tier's limit.

- **Ladder** (admin-defined): `t0` (entry/trial, e.g. $100, single cluster) → `t1` ($300) → `t2` …
- **Promotion** — declarative, auto-applied: `K consecutive paid invoices AND cumulative paid ≥ $X`. Admin override available. (Reuse press's existing thresholds.)
- **Demotion** — fast, on missed payment / chargeback / fraud signal. **Limits growth only**: running resources survive; only actual non-payment triggers stop/terminate (see [subscriptions.md](subscriptions.md)).
- **Two measures, never conflated:** provisioning checks *projected run-rate* (cluster, live); promotion checks *historical paid* (Central, monthly).

**Trust Tier** (per team — computed by Central from billing history)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| tier | Select | t0 (entry/trial) / t1 / t2 / … (admin-defined ladder) |
| max_spend | Long Int | **Minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) — monthly cap (= mandate ceiling for mandate teams) |
| max_resource_count | Int | |
| allowed_plans | JSON | |
| allowed_clusters | JSON | Trial = single cluster |
| promoted_at | Datetime | |
| promotion_basis | Small Text | Rule that granted it (`K paid months + ≥ $X`) — audit |
| manual_override | Check | Admin-set; exempt from auto-demotion |

## Entitlement token

Structured cap, not a scalar — so it can express categorical limits (no dedicated IP on trial, plan whitelist) and per-cluster partitioning.

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| cluster_slices | JSON | Per-cluster `{max_spend, max_resource_count}` — sums never exceed team total |
| allowed_plans | JSON | |
| allowed_resource_types | JSON | |
| suspend | Check | cap-0 + suspend directive (enforcement channel) |
| issued_at / expires_at | Datetime | ~24–48h lifetime = delinquency-exposure window |
| signature | Data | Verified offline at the cluster |

**Multi-cluster caps are pre-partitioned.** A per-team cap enforced independently per cluster is *not* a per-team cap (a team could double it across two clusters). Central divides the team total into per-cluster slices at issue time; the cluster enforces its slice locally. Trial = single cluster (`allowed_clusters = [one]`). Launch is single-cluster; the schema is cluster-scoped now, rebalancing logic deferred.

## Lifecycle rules

- **Onboarding requires Central** (first payment-method validation + first token). Steady-state does not.
- **Fallback when token expired AND Central unreachable:** deny *new* provisions, keep running ones alive (don't punish customers for our outage).
- **Credits-only teams:** effective cap = `min(tier cap, wallet-covered spend)` — the wallet gates provisioning. See [credits.md](credits.md).

## Enforcement (suspension)

Suspension is a Central-issued directive on the **same token channel** (next token = cap 0 + `suspend` flag). Staged:

1. `past_due` (a retry failed) → keep running (grace).
2. `suspended` (Day-7 retries failed) → stop / power-off, data preserved.
3. After ~30 days suspended → terminate, with notice.

Distinction: **Central unreachable** → keep running. **Central decides delinquent** → act on running resources.

## API

```
# [Customer] Create subscription — records INTENT (provision happens at cluster)
POST /api/resource/Subscription
     { "plan": "...", "billing_cycle": "...", "default_payment_method": "...", "cluster": "..." }

# [Central → Agent] Issue / refresh entitlement token
POST https://{agent}/api/method/subscription_agent.entitlement.receive_token
     { "team": "...", "cluster_slices": {...}, "signature": "..." }

# [Admin] Force standing transition
POST /api/method/cloud_billing.admin.set_subscription_status
     { "subscription": "...", "status": "suspended", "reason": "non-payment" }
```

## Notes

- The cluster knows only the cap (a number); the "trial" label and tier semantics live on Central.
- Token lifetime is the single dial trading outage-resilience against credit risk.
