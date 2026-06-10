# Roadmap

## Targets

Two delivery milestones, in order: a working **Demo** (end-to-end money path), then **feature-complete**.

## Phase 1 — Foundation

- Scaffold `cloud_billing` and `subscription_agent` apps.
- **Gateway Integrations (front-loaded workstream — see below).**
- `Plan` + `Plan Resource` CRUD; plan push to Agent.
- Agent's 4 DocTypes.

**Checkpoint:** gateways configured, plans defined + synced, webhooks received safely.

### Gateway Integrations (first-class workstream, Phase 1)

The gateway layer is what this project rewrites away from `frappe/payments` (see [misc.md](misc.md)), so it is a first-class, front-loaded milestone rather than a single bullet:

- `GatewayAdapter` interface + base + secure webhook receiver (signature-first, idempotent event store).
- `Payment Gateway` config with `Payment Gateway Currency` child table (`currency`, `is_default`); `gateways.resolve_gateway_for_currency(currency)` as the single resolver.
- Stripe adapter (Payment Intents, idempotency, refund).
- Razorpay adapter (card + UPI mandate, refund); mandate `max_amount` = trust-tier cap wires up alongside trust tiers (Phase 2).
- **Port the existing v1 / `frappe-payments` Stripe & Razorpay integrations into the adapter model and decommission the old path** — one integration surface, no gateway code imported by core billing.
- PayPal adapter — *to follow, post-launch.*

## Phase 2 — Subscriptions & usage

- `Subscription` (intent) + `Subscription Change`; two-axis state.
- Price-lock ledger (keyed by `resource_id`).
- Payment Method lifecycle (setup → micro-charge → active).
- Agent event log + push to Central; entitlement-token issuance + local verification.
- Credit ledger with `FOR UPDATE` balance.

**Checkpoint:** subscribe → event logged + pushed → token authorises provision → credit top-up works.

## Phase 3 — Invoicing & payment

- Two-phase invoice generation (28th draft, 1st open+collect), parallel dispatch.
- Usage computation (day-weighted × locked price, `max(1,…)` floor; engine generic over `billing_interval`).
- Metered billing (Usage Meter rollups, counter/gauge, locked rate + allowance, running-total forecast row).
- Plan-change billing (multiple line items; no pro-rata credit notes).
- Tax: **GST + SEZ fully**; TDS withholding-*seam* only (certificate reconciliation deferred).
- Credit application at invoice time; Payment Attempt flow → webhook → `Paid`; retry (Day 1/3/7); refunds.
- `invoice_type = cost_report` for free/trial.
- ERPNext async push queue.

**Checkpoint (Demo):** subscribe → use → invoice on 1st → charged via Stripe/Razorpay → `Paid` → ERPNext synced async; free/trial subsidy shown.

## Phase 4 — Dashboard, hardening

- Admin + customer dashboards; subsidy panel; payment analytics; forecast.
- Full notification suite (success/failure/retry/overdue/credit-low/card-expiry).
- Trust-tier computation + auto-promotion rules.
- **Reconciliation job** — resolve the "charged-but-never-webhooked" terminal state. *(Single most important hardening task.)*
- Security pass (signatures, replay, SQL audit); load test (1000-subscription run, concurrent webhooks).

> **Migration is deliberately not a launch task** — gradual, per-team, post-launch. See [migration.md](migration.md).

## Future considerations

- **Additional meters** (API calls, request volume) — additive; pipeline + counter/gauge model already exist.
- **Hourly / burst tiers (GPU)** — engine already reads `billing_interval`; light up the tier, no rewrite.
- **Multi-currency per invoice** — currently one currency per team; gateways already support multiple currencies via config.
- **Cross-region consolidated invoice** — merge multi-cluster Agent events at Central before generation.
- **PayPal adapter** — one adapter class when demand justifies.

## Open items

- Multi-currency credit handling (currency field on `Credit Ledger Entry`) and credit-expiry mechanics ([credits.md](credits.md)).
- Precise terminal-state model for the reconciliation job ([payments.md](payments.md)).
