# 07 — Trust Tier + Entitlement Token

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The entitlement system. A `Trust Tier` per team (computed by Central from billing history) defines the cap; an `Entitlement Token` is the signed, short-lived artifact Central issues and the cluster verifies **locally/offline**. The token carries a structured cap (`max_spend`, `max_resource_count`, `allowed_plans`, `allowed_resource_types`, per-cluster slices). The cluster enforces the cap on provisioning; when the token is expired **and** Central is unreachable, it denies *new* provisions but keeps running ones alive. Auto-promotion by declarative rule (`K paid months + ≥ $X`); demotion limits growth only.

## Acceptance criteria

- [ ] `Trust Tier` + `Entitlement Token` DocTypes; Central issues a signed token; Agent verifies signature offline (no live call).
- [ ] Cluster allows provision under cap, denies over cap; multi-cluster slices sum to ≤ team total.
- [ ] Expired token + Central unreachable → deny new provisions, running resources untouched.
- [ ] Auto-promotion rule fires on history; demotion blocks growth without stopping running resources.
- [ ] Provisioning check uses *projected run-rate*; promotion check uses *historical paid* (two measures, not conflated).

## Blocked by

- #04
