# 07 — Trust Tier + cap enforcement at provision

> **Updated 2026-06-15 ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** The signed **Entitlement Token** + offline cluster verification are removed. Central enforces the trust-tier cap **synchronously, in the provision call** to the cluster manager. (Title was "Trust Tier + Entitlement Token".)

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The entitlement system, Central-side only. A `Trust Tier` per team (computed by Central from billing history) defines the structured cap (`max_spend`, `max_resource_count`, `allowed_plans`, `allowed_resource_types`, allowed clusters). Central enforces the cap **at the moment it provisions**: it checks the team's live total across all clusters (it makes every provision call, so no signed per-cluster slices are needed) and rejects a provision that would breach the cap before calling the cluster manager. Auto-promotion by declarative rule (`K paid months + ≥ $X`); demotion limits growth only (running resources survive).

## Acceptance criteria

- [ ] `Trust Tier` DocType; cap computed from billing history; `manual_override` exempts from auto-demotion.
- [ ] Provision allowed under cap, rejected over cap, enforced synchronously by Central (no token, no offline verification).
- [ ] Multi-cluster total enforced team-wide (Central sums live provisions); trial = single cluster.
- [ ] Auto-promotion rule fires on history; demotion blocks growth without stopping running resources.
- [ ] Provisioning check uses *projected run-rate*; promotion check uses *historical paid* (two measures, not conflated).
- [ ] Central unreachable → no new provisions; running resources untouched (cluster manager acts only on a Central call).

## Blocked by

- #04
