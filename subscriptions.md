# Subscriptions

## Purpose

Define the customer's subscription *intent* on Central, the two-axis state model, and how trial/free teams fit the same pipeline.

## Concepts

- A Central **Subscription** is the customer's *intent/contract*. The authoritative runtime — every provision/resize/cancel **and the rate locked for it** — is the append-only **Subscription Change** ledger, written by Central as it provisions via the cluster manager. The component that provisions is the one that records and prices ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)), so *rate shown = rate locked* for free. The separate event-log + `Price Lock` doctypes are retired into this one ledger ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)).
- **State is two orthogonal axes**, never one enum:
  - **Operational** (`running / stopped / terminated`) — Central's record of the cluster manager's reported state.
  - **Account standing** (`current / past_due / suspended`) — owned by Central, derived from payment.
  - A resource can be `running` + `past_due` at once (normal grace).

## Data Model

**Subscription** (Central — intent/contract)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| cluster | Data | |
| plan | Link → Plan | Requested plan (intent) |
| account_standing | Select | current / past_due / suspended |
| billing_cycle | Select | monthly / annual |
| start_date | Date | |
| default_payment_method | Link → Payment Method | |
| gateway | Link → Payment Gateway | |

**Subscription Change** (separate DocType — not child; append-only history **and** the price-lock spine — [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md))

| Field | Type | Notes |
|-------|------|-------|
| subscription | Link → Subscription | |
| team | Link → Team | Fetched from the subscription |
| change_type | Select | Created / Plan Changed / Payment Method Changed / Paused / Resumed / Past Due / Suspended / Reactivated / Cancelled |
| old_value / new_value | Data | e.g. old/new plan |
| locked_rate | Currency | **Rate snapshot for the segment this row opens**, resolved from the catalog when the row is written; billing reads this, never the live rate. Null on non-pricing rows (see below) |
| currency | Link → Currency | The team's billing currency at lock time |
| effective_at | Datetime | Segment boundary |
| changed_by | Data | |

The row is **append-only** — the controller forbids any re-save, so a lock can never be rewritten. The lifecycle key (`resource_id`) is reachable via the Subscription's `asset_id`.

### Which events re-price (which carry a rate)

A change re-prices only when *what changed* affects the rate ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)):

- **`Created` / `Plan Changed`** (provision or **resize**) **re-resolve** the live catalog rate for `(plan-or-config, currency, cluster)` and stamp a **fresh** `locked_rate` — opening a new segment. A resize is the `changed`-event re-lock ([provisioning-and-entitlements.md](provisioning-and-entitlements.md)): grandfathering protects only the *unchanged* resource.
- **Stop / start and other non-pricing transitions** (`Paused`, `Resumed`, `Payment Method Changed`, `Past Due`, `Suspended`, `Reactivated`) carry **no** `locked_rate` and open **no** segment — a stopped resource keeps billing at its **locked** rate (only *terminate* ends billing); restart continues the same segment.
- **`Cancelled`** closes the open segment at `effective_at` and carries no rate.

## Trial & free — an entitlement tier, not a separate path

Free/trial is the **entry trust tier** (small cap; trials single-cluster). The whole pipeline — provisioning, the Subscription Change ledger (events + locked rates), metering, line-item math — is identical to a paying team. Central branches at exactly **one** point: at invoice generation it emits `invoice_type = cost_report` (compute, don't charge) instead of `billable`. This makes the free/trial subsidy report a *true* cost.

- Cluster knows only the cap; the "trial" designation lives on Central.
- **Convert to paid** → Central flips the tier on the next token; cost_report invoices stop, billable start; resources keep running.
- **Trial expires unconverted** → standard suspend directive (stop, then terminate).

## API

```
# [Customer] Own subscriptions (team filter auto-applied)
GET    /api/resource/Subscription
GET    /api/resource/Subscription/{name}

# [Customer] Change plan (writes Subscription Change; new lock at cluster on reprovision)
PUT    /api/resource/Subscription/{name}   { "plan": "plan-4vcpu" }

# [Customer] Cancel
DELETE /api/resource/Subscription/{name}

# [Customer] Change history
GET    /api/resource/Subscription Change?filters=[["subscription","=","SUB-001"]]

# [Admin] View / manage any team
GET    /api/method/cloud_billing.admin.get_team_subscription?team=TEAM-001
```

## Notes

- The create endpoint records intent and triggers the provision; the `Created` change row (with its `locked_rate`/`currency` snapshot) is written by Central when it provisions via the cluster manager.
- Enforcement (suspension) is covered in [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
