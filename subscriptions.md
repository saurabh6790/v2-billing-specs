# Subscriptions

## Purpose

Define the customer's subscription *intent* on Central, the two-axis state model, and how trial/free teams fit the same pipeline.

## Concepts

- A Central **Subscription** is the customer's *intent/contract* — not the billing truth. The authoritative runtime record lives at the [Agent](subscription-agent.md).
- **State is two orthogonal axes**, never one enum:
  - **Operational** (`running / stopped / terminated`) — owned by the Agent.
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

**Subscription Resource / Price-lock** — append-only, keyed by `resource_id`. Defined in [plans-and-pricing.md](plans-and-pricing.md).

**Subscription Change** (separate DocType — not child; append-only history)

| Field | Type | Notes |
|-------|------|-------|
| subscription | Link → Subscription | |
| change_type | Select | created / plan_changed / payment_method_changed / suspended / reactivated / cancelled |
| old_value / new_value | Data | |
| effective_at | Datetime | |
| changed_by | Data | |

## Trial & free — an entitlement tier, not a separate path

Free/trial is the **entry trust tier** (small cap; trials single-cluster). The whole pipeline — provisioning, event log, metering, price-lock, line-item math — is identical to a paying team. Central branches at exactly **one** point: at invoice generation it emits `invoice_type = cost_report` (compute, don't charge) instead of `billable`. This makes the free/trial subsidy report a *true* cost.

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

- The create endpoint records intent; the real subscription event (with `resource_id`, `shown_price`) is born at the cluster and reported by the Agent. Central reconciles intent against the Agent event.
- Enforcement (suspension) is covered in [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
