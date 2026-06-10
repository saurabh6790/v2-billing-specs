# Subscriptions

## Purpose

Define the customer's subscription *intent* on Central, the two-axis state model, and how trial/free
teams fit the same pipeline. **Kept custom** — ERPNext Subscription is deliberately not used.

## Why not ERPNext Subscription

ERPNext's `Subscription` owns its own invoice cadence (it generates Sales Invoices on its schedule)
and has no notion of the **Agent-observed runtime vs intent** split. Our subscription is an
*intent/contract* record whose billing truth comes from the Agent event log joined to price-locks,
billed by a **custom two-phase scheduler** ([invoicing.md](invoicing.md)) that writes Sales
Invoices itself. Forcing ERPNext Subscription's cadence on top would fight the two-axis state model
and the `resource_id` grandfathering. So we keep the custom `Subscription` and use ERPNext only for
the **Sales Invoice** it produces. See [ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

## Concepts

- A Central **Subscription** is the customer's *intent/contract* — not the billing truth. The
  authoritative runtime record lives at the [Agent](subscription-agent.md).
- **State is two orthogonal axes**, never one enum:
  - **Operational** (`running / stopped / terminated`) — owned by the Agent.
  - **Account standing** (`current / past_due / suspended`) — owned by Central, derived from payment.
  - A resource can be `running` + `past_due` at once (normal grace).
- A **third, separate** axis is the **Sales Invoice** `status` (Unpaid/Paid/Overdue) — a property of
  the payment document, never conflated with subscription standing.

## Data Model

**Subscription** (Central — intent/contract; custom)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | Central `Team`; maps to an ERPNext **Customer** |
| customer | Link → Customer | The ERPNext Customer the Sales Invoices bill to |
| cluster | Data | |
| item | Link → Item | Requested bundle (intent) |
| account_standing | Select | current / past_due / suspended |
| billing_cycle | Select | monthly / annual |
| start_date | Date | |
| default_payment_method | Link → Payment Method | |
| gateway | Link → Payment Gateway (payments) | |

**Price-lock** — append-only, keyed by `resource_id`. Defined in [plans-and-pricing.md](plans-and-pricing.md).

**Subscription Change** (separate DocType — append-only history; custom)

| Field | Type | Notes |
|-------|------|-------|
| subscription | Link → Subscription | |
| change_type | Select | created / plan_changed / payment_method_changed / suspended / reactivated / cancelled |
| old_value / new_value | Data | |
| effective_at | Datetime | |
| changed_by | Data | |

## Team ↔ ERPNext Customer

Each Central `Team` maps 1:1 to an ERPNext **Customer** (created/linked on first billing activity).
The Customer carries the team's billing currency, default selling price list, tax category (GST
state / SEZ / export), and billing address — so Sales Invoice tax + currency resolve natively. The
`team` field stays the access/identity key (capability IAM, [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md));
`customer` is the accounting key.

## Trial & free — an entitlement tier, not a separate path

Free/trial is the **entry trust tier** (small cap; trials single-cluster). The whole pipeline —
provisioning, event log, metering, price-lock, line-item math — is identical to a paying team.
Central branches at exactly **one** point: at invoice generation, a trial team's run produces a
**cost-report** (compute, don't charge) instead of a billable **Sales Invoice**. Concretely the
draft Sales Invoice is either not submitted (kept as an internal cost report doc) or flagged
`fc_invoice_type = cost_report` and never sent to collection — see [invoicing.md](invoicing.md).

- Cluster knows only the cap; the "trial" designation lives on Central.
- **Convert to paid** → Central flips the tier on the next token; cost reports stop, billable Sales
  Invoices start; resources keep running.
- **Trial expires unconverted** → standard suspend directive (stop, then terminate).

## API

```
# [Customer] Own subscriptions (team filter via capability IAM)
GET    /api/resource/Subscription
GET    /api/resource/Subscription/{name}

# [Customer] Change plan (writes Subscription Change; new lock at cluster on reprovision)
PUT    /api/resource/Subscription/{name}   { "item": "bundle-4vcpu" }

# [Customer] Cancel
DELETE /api/resource/Subscription/{name}

# [Customer] Change history
GET    /api/resource/Subscription Change?filters=[["subscription","=","SUB-001"]]

# [Admin] View / manage any team (operator bypass)
GET    /api/method/central.billing.admin.get_team_subscription?team=TEAM-001
```

## Notes

- The create endpoint records intent; the real subscription event (with `resource_id`, `shown_rate`)
  is born at the cluster and reported by the Agent. Central reconciles intent against the event.
- Enforcement (suspension) is covered in [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- Reads/mutations are gated by `billing:view` / `billing:manage` capabilities, not billing-owned
  roles ([ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)).
