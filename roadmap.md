# Roadmap

## Targets

Demoable by **30 June 2026**. Feature-complete by **31 July 2026**.

## Phase 1 — Foundation (by June 13)

- Scaffold `cloud_billing` and `subscription_agent` apps.
- `GatewayAdapter` interface + base; Stripe (Payment Intents) and Razorpay (card + UPI mandate) adapters with idempotency + refund.
- Secure webhook receiver (signature-first, idempotent event store).
- `Plan` + `Plan Resource` CRUD; plan push to Agent.
- Agent's 4 DocTypes.

**Checkpoint:** gateways configured, plans defined + synced, webhooks received safely.

## Phase 2 — Subscriptions & usage (by June 20)

- `Subscription` (intent) + `Subscription Change`; two-axis state.
- Price-lock ledger (keyed by `resource_id`).
- Payment Method lifecycle (setup → micro-charge → active).
- Agent event log + push to Central; entitlement-token issuance + local verification.
- Credit ledger with `FOR UPDATE` balance.

**Checkpoint:** subscribe → event logged + pushed → token authorises provision → credit top-up works.

## Phase 3 — Invoicing & payment (by June 27)

- Two-phase invoice generation (28th draft, 1st open+collect), parallel dispatch.
- Usage computation (day-weighted × locked price, `max(1,…)` floor; engine generic over `billing_interval`).
- Metered billing (Usage Meter rollups, counter/gauge, locked rate + allowance, running-total forecast row).
- Plan-change billing (multiple line items; no pro-rata credit notes).
- Tax: **GST + SEZ fully**; TDS withholding-*seam* only (certificate reconciliation deferred).
- Credit application at invoice time; Payment Attempt flow → webhook → `Paid`; retry (Day 1/3/7); refunds.
- `invoice_type = cost_report` for free/trial.
- ERPNext async push queue.

**Checkpoint (June 30 — Demo):** subscribe → use → invoice on 1st → charged via Stripe/Razorpay → `Paid` → ERPNext synced async; free/trial subsidy shown.

## Phase 4 — Dashboard, hardening (by July 31)

- Admin + customer dashboards; subsidy panel; payment analytics; forecast.
- Full notification suite (success/failure/retry/overdue/credit-low/card-expiry).
- Trust-tier computation + auto-promotion rules.
- **Reconciliation job** — resolve the "charged-but-never-webhooked" terminal state. *(Single most important hardening task.)*
- Security pass (signatures, replay, SQL audit); load test (1000-subscription run, concurrent webhooks).

> **Migration is deliberately not a launch task** — gradual, per-team, ~6 months post-launch. See [migration.md](migration.md).

## Future considerations

- **Additional meters** (API calls, request volume) — additive; pipeline + counter/gauge model already exist.
- **Hourly / burst tiers (GPU)** — engine already reads `billing_interval`; light up the tier, no rewrite.
- **Multi-currency per team / per invoice** — currently one currency per team.
- **Cross-region consolidated invoice** — merge multi-cluster Agent events at Central before generation.
- **PayPal adapter** — one adapter class when demand justifies.

## Open items

- Multi-currency credit handling and credit-expiry mechanics ([credits.md](credits.md)).
- Precise terminal-state model for the reconciliation job ([payments.md](payments.md)).
