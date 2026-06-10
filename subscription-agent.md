# Subscription Agent

## Purpose

The per-cluster app that is **authoritative for what actually ran**. Unchanged by the ERPNext
re-base — it carries no money, no accounting, no gateway code, so ERPNext and `frappe/payments` do
not touch it. It stays a separate app (`press_billing_agent`), per
[ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md).

## Responsibilities

- **Immutable event log** — `subscribed / changed / cancelled` events, each carrying `resource_id`
  and `shown_rate` (the rate resolved for the team's currency + cluster at provision). This is what
  Central locks into the price-lock so **rate shown = rate locked**.
- **Metered rollups** — edge-aggregated `Usage Meter` rollups (counter/gauge), one per
  `(resource_id, meter_type, period)`. See [metering.md](metering.md).
- **Local entitlement enforcement** — verifies the Central-issued, Ed25519-signed entitlement token
  offline and authorises provisioning against the cap. See
  [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Push to Central** — push-primary (on-demand for the subscribed event + daily catch-up). Central
  joins this observed runtime to its locked prices and writes the **Sales Invoice**.

## DocTypes (4, local)

- **Plan Cache** — Item identity + composition + display rates pushed from Central (display only).
- **Plan Subscription Log** — the immutable event log.
- **Usage Meter** — edge-aggregated rollups + the running-total row.
- **Sync Log** — push provenance + retention (rolling window).

## Source-of-truth split

The Agent owns *what ran*; Central owns *intent + money*. Central never trusts the Agent for prices
(it has the lock) and the Agent never computes money. A request that never provisioned, or a stopped
machine, bills from the observed runtime — killing the v1 "billed for things that weren't running"
bug. See [architecture.md](architecture.md).

## Notes

- The Agent is deliberately thin: it carries numbers and applies directives; Central decides their
  meaning and produces the ERPNext Sales Invoice.
