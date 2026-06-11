# Atlas Integration — Atlas → Agent → Central

How a Firecracker VM managed by Atlas becomes a line on a Central invoice.
This spec covers the **workflow and integration seams** between the three
systems; the billing domain itself (money, invoicing, payments, credits, tax)
is specced by the domain files in this repo ([README](../README.md)) and the
VM/cluster domain in [atlas/spec](../../atlas/spec/README.md). Central IAM
(Teams, capabilities, OAuth) is specced in
[central/spec/IAM.md](../../central/spec/IAM.md).

## The three systems

| System | App | Where it runs | Authoritative for |
| --- | --- | --- | --- |
| Central | `central` (incl. the `billing` module) | `billing.frappe.cloud` (one, global) | Intent + money: plans, price locks, invoices, payments, credits, trust tiers, Teams |
| Billing Agent | `press_billing_agent` | each cluster-manager site, **co-installed with Atlas** | What actually ran: the plan-change event log, metered rollups, cached plans, cached entitlement tokens |
| Atlas | `atlas` | each cluster-manager site | The resources themselves: Servers, Virtual Machines, Snapshots, Sites, Tasks |

In the v2 billing specs the per-cluster role is called the "Subscription
Agent" and the resource manager the "Bench Manager". In this deployment the
Subscription Agent **is** `press_billing_agent` and the Bench Manager **is**
Atlas.

## The picture

```mermaid
flowchart TB
    subgraph Central["Central — billing.frappe.cloud"]
        PL[Plan + Catalog Rate]
        LOCK[Price Lock ledger]
        ROLL[Usage Rollup]
        INV[Invoice — 1st of month]
        TT[Trust Tier]
    end

    subgraph Cluster["Cluster manager site (one per region, e.g. blr1)"]
        subgraph Agent["press_billing_agent"]
            PC[Plan Cache]
            PSL[Plan Subscription Log]
            UM[Usage Meter]
            ET[Entitlement Token]
        end
        subgraph Atlas["atlas"]
            VM[Virtual Machine]
            SNAP[VM Snapshot]
        end
    end

    PL -- "plan push (HTTP)" --> PC
    TT -- "signed token push (HTTP)" --> ET
    PSL -- "usage events push (HTTP)" --> LOCK
    UM -- "meter rollups push (HTTP)" --> ROLL
    LOCK --> INV
    ROLL --> INV

    VM -- "doc_events (in-process)" --> PSL
    SNAP -- "daily gauge sampling (in-process)" --> UM
    ET -- "provision gate + enforcement (in-process)" --> VM
```

Two transport regimes, on purpose:

- **Atlas ↔ Agent: in-process.** Both apps are installed on the same
  cluster-manager site. The integration is Frappe `doc_events` hooks plus
  direct Python calls — no HTTP, no auth surface, no partial-failure window
  between "the VM exists" and "billing knows".
- **Agent ↔ Central: HTTP, push-based, idempotent.** Already built. The
  cluster keeps working when Central is down; everything unacknowledged is
  re-pushed by the daily catch-up.

## The layering rule

**Atlas never imports billing.** Atlas sits below everything
([atlas/spec/01-architecture.md](../../atlas/spec/01-architecture.md));
its only billing-relevant contribution is carrying two opaque attribution
fields (`team`, `plan`) on its resources. The Agent depends on Atlas — it
registers `doc_events` against Atlas DocTypes and calls Atlas controller
methods for enforcement — never the reverse. All mapping from "Atlas did X"
to "billing event Y" lives in one adapter module inside the Agent.

## End-to-end walkthrough

1. **Catalog.** An admin defines a `Plan` + `Catalog Rate`s on Central and
   pushes them to each cluster (`push_plans_to_agent` → Agent `Plan Cache`).
2. **Onboarding.** A user signs up on Central, creates/joins a Team, adds a
   payment method. Central computes the Team's `Trust Tier` and pushes a
   signed `Entitlement Token` to each allowed cluster. Onboarding requires
   Central; steady-state does not.
3. **Provision.** The user (authenticated into Atlas via Central OAuth,
   [central/spec/IAM.md](../../central/spec/IAM.md)) creates a Virtual
   Machine for a Team on a plan. The Agent's `before_insert` hook gates it
   against the cached token (projected run-rate vs the cluster slice cap) —
   offline, no Central call.
4. **Subscribed event.** When the VM first provisions successfully, the
   Agent appends a `subscribed` row to the `Plan Subscription Log` —
   `resource_id` = the VM's UUID, `shown_rate` = the rate the user saw,
   resolved from the Plan Cache — and best-effort pushes it to Central,
   where it becomes a Price Lock (the rate is grandfathered).
5. **Usage.** Resize → `changed` event (re-lock at the new plan's current
   rate). Terminate → `cancelled` event (segment closed). Snapshots are
   sampled daily into a gauge meter (GB-days); transfer accumulates into a
   counter meter. Rollups push to Central.
6. **Invoice.** On the 1st, Central joins event-log segments to locked rates,
   adds metered lines from rollups, and bills the month just ended — pure
   postpaid ([invoicing.md](../invoicing.md)).
7. **Delinquency.** Retries fail → Central pushes a token with `suspend`
   (later `terminate`). The Agent's enforcement loop stops (later terminates)
   the Team's VMs via normal Atlas controller calls — each action is an
   audited Atlas Task. Central unreachable ≠ delinquent: an *expired* token
   never stops running resources.

## Runtime flows

**The money path — VM lifecycle → invoice:**

```
 user picks Team + Plan, clicks Create VM
        │
        ▼
 [agent] before_insert gate ──── no token / expired / over cap ──▶ ✗ throw
        │ ok (offline check vs cached Entitlement Token)
        ▼
 [atlas] VM inserted (Pending) → auto_provision job → SSH provision-vm.py → Running
        │
        ▼
 [agent] doc_event: first Pending→Running
        │   events.record_event("subscribed", resource_id=VM UUID,
        │                       shown_rate ← Plan Cache, cluster)
        ▼
 [agent] Plan Subscription Log row (append-only, synced_to_central=0)
        │
        ▼
 [agent] sync.push_unsynced_events ──HTTP──▶ [central] receive_usage_events
        │                                         │ lock_from_event → PRICE LOCK
        ◀──── {acknowledged: [event_id]} ─────────┘ (rate grandfathered)
        │
        ▼  (later: resize → "changed" re-lock · terminate → "cancelled" closes segment)
        │
 [central] 1st of month: segments × locked rates + meter rollups → INVOICE (postpaid)
```

**The enforcement path — delinquency, reverse direction:**

```
 [central] payment retries fail → push token {suspend:1} ──HTTP──▶ [agent] receive_token
                                                                       │ verify signature OFFLINE, cache
 [agent] hourly job: enforcement_state(team)                           ▼
     "stopped"    → [atlas] vm.stop()      each Running VM   ─┐  every action =
     "terminated" → [atlas] vm.terminate() → "cancelled" event┴─ one audited Atlas Task
     expired token → DO NOTHING (never punish for our own outage; only deny NEW provisions)
```

## Project structure

**press_billing_agent** — small and flat; one module per concern:

```
press_billing_agent/
├── press_billing_agent/
│   ├── hooks.py            # daily scheduler: push events/meters catch-up, prune Sync Log
│   ├── events.py           # record_event() — the event-log spine (subscribed/changed/cancelled)
│   ├── sync.py             # Agent↔Central HTTP: receive_plans, push_unsynced_events/meters
│   ├── metering.py         # counter/gauge running aggregates (record_counter/record_gauge)
│   ├── entitlement.py      # receive_token, can_provision (gate), enforcement_state
│   ├── signing.py          # offline token signature verification
│   ├── provisioning.py     # DEMO ONLY — simulated subscribe (superseded by the adapter, #53)
│   ├── dashboard.py        # data for the cluster SPA
│   ├── press_billing_agent/doctype/   # the DocTypes:
│   │   ├── plan_cache/                #   plans pushed from Central (display-only)
│   │   ├── plan_subscription_log/     #   append-only event log — SOURCE OF TRUTH
│   │   ├── usage_meter/               #   bounded counter/gauge rollups
│   │   ├── entitlement_token/         #   cached signed cap
│   │   └── sync_log/                  #   rolling sync audit trail (pruned ~90d)
│   ├── tests/              # test_events/sync/metering/entitlement/plan_cache/provisioning
│   └── www/cluster.py      # serves the SPA shell at /cluster
└── dashboard/              # Vue 3 + Tailwind SPA (Overview/Plans/Events/Usage/Entitlements/Sync)
```

The integration specced here (issues [#50–#59](../issues/README.md#atlas-integration-milestone-at))
adds `press_billing_agent/integrations/atlas.py` — the one module mapping
Atlas doc_events onto the modules above. Dependency direction: **the Agent
imports Atlas concepts, never the reverse.**

**atlas** — the layer below everything ([full spec](../../atlas/spec/README.md)):

```
atlas/
├── spec/                   # 14-chapter spec — the source of truth for Atlas
├── scripts/                # one idempotent script per operation, run on servers over SSH:
│   ├── bootstrap-server.py · provision-vm.py · start/stop/pause/resume-vm.py
│   ├── snapshot/rebuild/resize/terminate-vm.py · sync-image.py · issue-cert.py
│   └── guest/ · lib/ · systemd/   # in-guest helpers, shared lib, unit templates
├── bench/                  # golden bench image bake + in-guest deploy-site.py (self-serve)
└── atlas/
    ├── hooks.py
    ├── atlas/
    │   ├── doctype/        # 22 DocTypes; the billing-relevant ones:
    │   │   ├── server/                    # one host (DO or self-managed)
    │   │   ├── virtual_machine/           # core aggregate — UUID name = billing resource_id
    │   │   ├── virtual_machine_snapshot/  # LVM CoW snapshots (→ gauge metering)
    │   │   ├── site/ + site_request/ + subdomain/  # self-serve sites (bill via backing VM)
    │   │   ├── task/                      # every SSH script run = one audit row
    │   │   └── provider/ + root_domain/ + tls_certificate/ …  # vendor catalog, proxy, TLS
    │   ├── providers/      # Provider ABC: digitalocean.py, self_managed.py (+ registry)
    │   ├── ssh.py · networking.py · placement.py · sizes.py   # infra plumbing
    │   ├── proxy.py · deploy_site.py · bench_image.py         # edge proxy + self-serve
    │   ├── permissions.py  # owner-scoping (Team scoping per central/spec/IAM planned)
    │   └── api/            # signup.py (guest), server_capacity.py
    ├── frontend/           # Vue SPA (user dashboard: machines, sites)
    └── www/                # signup / verify / site-status / dashboard pages
```

## Spec chapters

- [01-atlas-agent-integration.md](./01-atlas-agent-integration.md) — the
  adapter: attribution fields, lifecycle-event mapping, provision gate,
  enforcement loop.
- [02-agent-central-sync.md](./02-agent-central-sync.md) — the HTTP spine:
  canonical endpoints, auth, idempotency, and current path drift to fix.
- [03-metering.md](./03-metering.md) — Atlas usage sources mapped onto the
  counter/gauge meters.

## Status

The Agent ↔ Central spine, the Agent's event log / meters / token
verification, and Central's price-lock + rollup ingestion are **built**
(`press_billing_agent/sync.py`, `central/billing/platform/sync.py`,
`central/billing/revenue/pricelock.py`, `revenue/metering.py`). The
Atlas ↔ Agent adapter specced in chapter 01 is **not built** — today the
Agent's `provisioning.py` mints simulated `srv-<team>-N` resource ids; it is
superseded by this spec and retained for demos only. Chapter 02 lists the
known drift (endpoint paths, VM `team` field) that must land first.

Implementation is broken into tracer-bullet issues
[#50–#59](../issues/README.md#atlas-integration-milestone-at)
(the **AT** milestone).
