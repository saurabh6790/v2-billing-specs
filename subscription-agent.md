# Subscription Agent

## Purpose

The thin regional app installed at each cluster manager. Authoritative for **what actually ran**; holds **no financial logic**.

## Responsibilities

- Record an immutable, append-only event log of plan changes (subscribed / changed / cancelled), each with `resource_id` and `shown_rate`.
- Record metered-usage rollups (see [metering.md](metering.md)).
- Cache plans (+ display price) pushed from Central, so the Bench Manager can render without calling Central.
- Verify Central-issued entitlement tokens **locally** and enforce caps + suspend directives (see [provisioning-and-entitlements.md](provisioning-and-entitlements.md)).
- Sync to Central.

It makes no gateway calls, computes no invoices, holds no pricing logic, and *decides* nothing about money.

## Data Model — 4 DocTypes

**Plan Cache** — bundles pushed from Central; read-only locally. Carries display rates only (display only).

| Field | Type | Notes |
|-------|------|-------|
| name / title | Data | Bundle identity + display title |
| billing_cycle | Data | monthly / annual |
| includes_json | Long Text | Composition (resource_type, quantity, unit) — spec only |
| rates_json | Long Text | Full rate set: list of `{cluster, currency, rate}` |
| pushed_at | Datetime | |

**Plan Subscription Log** — immutable, append-only; one row per plan change per resource.

| Field | Type | Notes |
|-------|------|-------|
| team | Data | |
| resource_id | Data | Stable physical resource identity — the price-lock key on Central |
| plan | Link → Plan Cache | |
| shown_rate | Long Int | **Rate units** (minor × 10⁶) — [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). Rate displayed at provision (resolved for currency + cluster) — Central locks this |
| currency | Data | Currency the rate was shown/resolved in |
| event_type | Select | subscribed / changed / cancelled |
| effective_from / effective_to | Datetime | effective_to null = active |
| changed_by | Data | |
| synced_to_central | Check | |

**Usage Meter** — see [metering.md](metering.md).

**Sync Log** — records each sync operation (direction, status, count, error, timestamp).

## Sync behaviour

- **Plan push (Central → Agent):** Central calls the Agent when plans change. The Agent does not poll.
- **Usage push (Agent → Central):** push-primary —
  1. on-demand the moment a change occurs (near-realtime),
  2. daily at 02:00 catch-up for anything unacknowledged,
  3. on Central's explicit request at billing time.
  Events/rollups are marked `synced_to_central` only after Central acknowledges; unsynced are retried.
- **Entitlement token (Central → Agent):** Central pushes the signed token; the Agent verifies offline.

## API (Agent ↔ Central)

```
# Central → Agent: push plans
POST https://{agent}/api/method/subscription_agent.sync.receive_plans

# Agent → Central: push usage (events + meter rollups)
POST https://billing.frappe.cloud/api/method/cloud_billing.sync.receive_usage_events

# Central → Agent: fetch usage for a team at billing time
GET  https://{agent}/api/method/subscription_agent.sync.get_team_usage?team=...&from=...&to=...

# Central → Agent: issue/refresh entitlement token
POST https://{agent}/api/method/subscription_agent.entitlement.receive_token
```

Auth: cluster-scoped Agent API key. The Agent cannot call customer or admin billing endpoints.

## Notes

- The communication surface is intentionally tiny: plan push, usage push (events + rollups), billing-time pull, token issuance. No payment logic, no gateway calls, no invoice data in the Agent.
