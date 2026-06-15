# Subscription Agent — RETIRED

> **Retired 2026-06-15 ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).** There is no Subscription Agent. Central provisions VMs by calling the cluster manager API, records usage events itself, and enforces dunning by calling the cluster manager. This document is kept as a tombstone; do not build against it.

## Where the Agent's responsibilities live now (all in `central/billing`)

| Was (Agent) | Now |
|-------------|-----|
| **Plan Subscription Log** (event log, per `resource_id` + `shown_rate`) pushed to Central | Central writes the **event log + price-lock** itself, at the moment it provisions — see [provisioning-and-entitlements.md](provisioning-and-entitlements.md), [#03](issues/03-agent-event-log-price-lock.md). |
| **Usage Meter** (metered rollups) pushed to Central | Central records / reads metered rollups from the cluster manager — see [metering.md](metering.md), [#12](issues/12-metered-billing-usage-meter.md). |
| **Plan Cache** (plans + display price pushed from Central) | No cache — plans + rates live in Central; price is resolved and locked at provision. See [plans-and-pricing.md](plans-and-pricing.md). |
| **Sync Log** + push/ack protocol | Gone — no agent, no sync. |
| **Entitlement Token** verified offline at the cluster | Gone — Central enforces the trust-tier cap **synchronously at provision time**, and suspends/terminates by **calling the cluster manager API** — see [provisioning-and-entitlements.md](provisioning-and-entitlements.md), [#07](issues/07-trust-tier-entitlement-token.md), [#14](issues/14-retry-dunning-suspension.md). |

## Why

The Agent existed to let a cluster provision and enforce caps while Central was
unreachable. Provisioning is already mediated by the cluster manager (Bench
Manager), whose API Central calls directly — so the second app duplicated state
(plan cache, event log, tokens, sync) and doubled the surface for a property the
product does not require. The "Central unreachable → keep running" guarantee still
holds: the cluster manager only stops a VM on an explicit Central directive.
