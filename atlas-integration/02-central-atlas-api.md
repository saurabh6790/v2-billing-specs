# Central → Atlas API

The seam between Central's `billing` module and each cluster's `atlas`. Control
flows **one way: Central is the client, Atlas is the server.** Central calls
Atlas to act on resources and to read runtime facts; Atlas posts a thin status
callback so Central can record events at the right moment. There is no
per-cluster billing app, no push/ack event spine, no token channel — those were
the Subscription Agent's and are retired
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).

## Principles

- **Central initiates; Atlas executes.** Every billable change (provision,
  resize, terminate, suspend) is a Central decision turned into one Atlas API
  call. Atlas never decides to bill, suspend, or provision on its own.
- **Atlas reports its own state, it does not hold billing state.** The status
  callback carries a resource's lifecycle transition (`Running`, `Terminated`)
  and identity (`name`, `team`, `plan`, `cluster`) — nothing about money. Atlas
  has no event log, no meters, no token.
- **Idempotent on stable keys.** Atlas operations are keyed by VM UUID; a
  repeated create for the same intent returns the existing VM, a repeated
  stop/terminate is a no-op on an already-stopped/terminated VM. Central's
  recording is idempotent on the event log (open-segment check), so a duplicated
  callback never double-records.
- **Reconcilable.** If a callback is lost, Central's reconciliation read
  (`get_vm_state`) re-derives the truth from Atlas. Central never depends on the
  callback arriving — the callback is the fast path, the read is the safety net.
- **Outage semantics.** Atlas acts only on a Central call, so a Central outage
  delays new provisions but never stops a running resource. An Atlas/cluster
  outage blocks new provisions and enforcement *for that cluster* and surfaces
  as a stale `data as of` ([#59](../issues/59-billing-time-pull-data-as-of.md)).

## The Atlas API Central calls

| Purpose | Atlas endpoint (called by Central's client) | Payload → result |
| --- | --- | --- |
| Provision | `create_vm` | `{team, plan, size_preset, cluster, status_callback_url}` → `{name (UUID), status: Pending}` |
| Resize / plan change | `resize_vm` | `{name, new_plan, new_size_preset}` → `{status}` (Stopped-only) |
| Terminate | `terminate_vm` | `{name}` → `{status: Terminating}` |
| Suspend / restore | `stop_vm` / `start_vm` | `{name}` → `{status}` |
| Read one VM | `get_vm_state` | `{name}` → `{status, team, plan, cluster}` |
| Read snapshots (metering) | `list_snapshots` | `{team?}` → `[{vm, size_bytes, data_size_bytes, status}]` |
| Read transfer counters (metering) | `get_transfer_counters` | `{cluster}` → `[{vm, bytes}]` (deferred, see [03](./03-metering.md)) |

Every state-changing call results in a normal **Atlas Task** (the audit row);
Central stores the returned Task id on the relevant billing record so the
operator and the customer can trace what billing did.

## The status callback (Atlas → Central)

| Direction | Endpoint (dotted method) | Payload |
| --- | --- | --- |
| Atlas → Central | `central.billing.integrations.atlas.receive_vm_status` | `{name, team, plan, cluster, status, occurred_at}` |

Central maps the transition to a billing event
([01](./01-atlas-central-integration.md)): first `Running` → `subscribed`
(+ price lock), `Terminated` → `cancelled`. A team-less resource is ignored.
The receiver is idempotent on the event log, so a re-posted callback is safe.

## Auth

- **Central → Atlas:** Central holds a cluster-scoped, least-privilege API key
  per cluster in its site config (`atlas_api_key`/`atlas_api_secret`, one per
  region). The key may only call the operation/read endpoints above — not Atlas
  operator surfaces.
- **Atlas → Central:** the status callback authenticates with a dedicated key
  scoped to `receive_vm_status` only. It must not reach customer or admin
  billing endpoints.

## Cadence

```mermaid
sequenceDiagram
    participant C as Central (billing)
    participant A as Atlas (cluster)

    C->>A: create_vm(team, plan, size, callback_url)
    A-->>C: {name (UUID), Pending}
    Note over A: auto_provision job → SSH provision-vm.py → Running
    A--)C: receive_vm_status(name, Running)  — fast path
    C->>C: record subscribed + price lock
    Note over C,A: callback lost? daily reconciliation read repairs it

    loop daily (metering)
        C->>A: list_snapshots / get_transfer_counters
        C->>C: record gauge / counter rollups
    end

    loop reconciliation (verification)
        C->>A: get_vm_state(name) for in-flight / suspect VMs
        C->>C: record any missed transition; flag stale clusters
    end
```

1. **Event-driven** — the callback records `subscribed`/`cancelled` the moment
   Atlas transitions, so the forecast and price lock are near-realtime.
2. **Daily metering pull** — Central reads snapshot sizes (and, later, transfer
   counters) from Atlas and updates its own rollups
   ([03](./03-metering.md)).
3. **Reconciliation read** — for any VM Central provisioned but hasn't seen
   reach a terminal/expected state, and at billing time, Central reads
   `get_vm_state` to repair missed callbacks. The invoice run records a per-team
   "data as of" timestamp; a cluster whose reads have stalled past a threshold
   surfaces in admin observability before invoices go out
   ([#59](../issues/59-billing-time-pull-data-as-of.md),
   [observability.md](../observability.md)).

## What Central does with what it learns

- **Lifecycle → Price Lock.** On `subscribed`/`changed`, Central writes the lock
  for the `resource_id`; the locked `shown_rate` is what invoicing joins against
  — grandfathering falls out of locking at that moment
  ([plans-and-pricing.md](../plans-and-pricing.md)). Same component shows and
  locks the rate, so they cannot drift.
- **Reads → Usage Rollup.** Bounded store, replace-on-re-sample; the open
  period's running total drives the customer forecast and collapses to the final
  figure at close ([metering.md](../metering.md)).
- On the 1st, invoicing reads segments + locks + rollups; nothing in the invoice
  run calls a cluster except the optional reconciliation read
  ([invoicing.md](../invoicing.md)).

## What this replaces

The pre-agentless naming is gone. For readers coming from the old specs:

| Old (Subscription Agent) | Now |
| --- | --- |
| `subscription_agent.sync.receive_plans` (plan push) | nothing — Central holds the catalog; no per-cluster Plan Cache |
| `subscription_agent.entitlement.receive_token` (token push) | nothing — the trust-tier cap is checked synchronously by Central at provision ([#55](../issues/55-provision-gate-entitlement.md)) |
| `cloud_billing.sync.receive_usage_events` (Agent→Central push) | Central records the event itself on the Atlas status callback |
| `cloud_billing.sync.receive_meter_rollups` (Agent→Central push) | Central samples Atlas and writes its own rollups |
| daily push catch-up + Sync Log | reconciliation read + per-team "data as of" |
