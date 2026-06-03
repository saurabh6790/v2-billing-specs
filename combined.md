

===== ./session1.md =====

# Session 1 — Handoff

Implementation of the Frappe Cloud v2 billing spec (this repo) into two Frappe apps.
Read this first, then `MEMORY.md`-style notes live under the Claude memory dir.

## Repos & environment

- **Spec/issues:** `/Users/frappe/workspace/billing-specs` (this repo; branch `master`, commits direct to master).
- **Bench:** `/Users/frappe/workspace-2/dev-bench` (Frappe **17.0.0-dev**, latest develop — relocated + upgraded 2026-06; old `/Users/frappe/workspace/press-bench` retired, same branches/commits/sites carried over). Use bare `bench`, always `--site`. Shell cwd resets each command → prefix `cd /Users/frappe/workspace-2/dev-bench && bench ...`.
- **Apps** (under `/Users/frappe/workspace-2/dev-bench/apps/`): `press_billing` (Central), `press_billing_agent` (regional cluster). Spec calls them `cloud_billing`/`subscription_agent`; API paths use the real names (`press_billing.*`, `press_billing_agent.*`).
- **Sites:** `billing.local` (press_billing) + `agent.local` (press_billing_agent). Both have `allow_tests true`. Both resolve to 127.0.0.1 via /etc/hosts (user added). Dev server on :8000 resolves by Host header.
- **MariaDB:** root user `root` WITH a password (not stored in readable config — ask user / they create sites). `reference` = `frappe/press` app (installed on press.local) for porting gateway/plan logic.

## What was built this session (all TDD, all green)

| Issue | Scope | Status |
|---|---|---|
| **#01** | Scaffold both apps + Plan catalog + push to Agent Plan Cache | done, **then redesigned** (see below) |
| **#02** | Gateway config + `GatewayAdapter` + Stripe + signature-first webhook | done |
| catalog redesign | flat-rate **bundles + add-ons**, region×currency rates (`price`→`rate`) | done |
| **#24** | Razorpay adapter; single gateway surface; parity audit | done |
| gateway seam parity | setup/validate/customer/checkout-sig/mandate methods on the adapter | done |
| **#07** | Trust Tier + Entitlement Token (Central + Agent) | done |
| **#08** | Payment Method DocType + UPI Autopay mandate lifecycle (cap = trust tier, re-auth on promotion) | done |
| **#03** | Agent event log (`Plan Subscription Log`) + push to Central + Central `Price Lock` (grandfathering) + Sync Log retention | done |
| **#04** | Central `Subscription` (intent) + `Subscription Change` + two-axis state model | done |
| **#05** | Stripe card `Payment Method` lifecycle (setup→micro-charge→active; set-default/delete/expire) | done |
| **#06** | Credit ledger + wallet + concurrency (`Credit Ledger Entry` + `Credit Wallet` lock anchor) | done |
| **#09** | Postpaid two-phase invoice generation (`Invoice` + `Invoice Line Item`; draft→open) | done |
| **#10** | Charge invoice → `Payment Attempt` → webhook → Paid | done |
| **#11** | Credit waterfall (credits-then-card) + credits-only wallet gating + 80% forecast | done |
| **#12** | Metered billing — Agent `Usage Meter` (counter/gauge) + Central `Usage Rollup` + metered line items | done |
| UI specs | Pinned dashboards (#18/#19) to **Frappe-UI** + press `frappe-ui/tailwind` preset; added **#26** portal scaffold | done (spec only) |

Test counts: **press_billing 131**, **press_billing_agent 29** (run `bench --site <site> run-tests --app <app>`).

## Git branch state (no remote; local stacked branches, NOT merged)

`press_billing` branches (each stacked on the previous):
- `issue-01-app-scaffold-plan-catalog` → `issue-02-gateway-adapter-webhook-spine` → `redesign-bundle-addon-pricing` → `issue-24-port-decommission-gateways` → `issue-07-trust-tier-entitlement-token` → `issue-08-razorpay-upi-mandate-lifecycle` → `issue-03-event-log-price-lock` → `issue-04-subscription-intent-two-axis` → `issue-05-payment-method-lifecycle-stripe` → `issue-06-credit-ledger-wallet` → `issue-09-postpaid-invoice-generation` → `issue-10-charge-payment-attempt-webhook` → `issue-11-credit-waterfall-wallet-gating` (**current HEAD**)

`press_billing_agent` branches:
- `issue-01-app-scaffold-plan-catalog` → `redesign-bundle-addon-pricing` → `issue-07-trust-tier-entitlement-token` → `issue-03-event-log-price-lock` (**current HEAD**)

Nothing pushed; no PRs. `fc-prod` is each app's base branch.

## Architecture as built

**Catalog (press_billing):** `Plan` (bundle, immutable id, autoname prompt) with child `Plan Rate` (cluster, currency→Link Currency, rate) and `Plan Includes` (resource_type, quantity, unit — NO price). `Add-on` + `Add-on Rate` (per-unit). The **rate IS the price** (no qty×rate). `pricing.resolve_rate(rows, currency, cluster)` = most-specific region match else global. `plans.get_plan_pricing(plan, currency, cluster)`. `sync.push_plans_to_agent` pushes identity+includes+rates → agent `Plan Cache` (`rates_json`+`includes_json`, read-only locally).

**Gateways (press_billing only; agent never touches money):** `gateways/` is the SINGLE integration surface (isolation enforced by `tests/test_adapter_isolation.py`). `base.GatewayAdapter` (charge/refund/verify_webhook_signature/parse_webhook_event(payload,headers)/get_transaction_status/setup_payment_method/validate_payment_method + optional create_customer/verify_payment_signature/cancel_mandate/get_mandate_status). `stripe_adapter.py` + `razorpay_adapter.py` are the only SDK importers. `registry.get_adapter`. `webhooks.py` = signature-first receiver (`process_webhook`); routes `stripe`, `razorpay`; verify before any content-keyed DB access; dedupe on `Webhook Event.gateway_event_id`; enqueue. Config: `Payment Gateway` (Password-encrypted secrets), `Webhook Event`.

**Entitlements (#07):** Central `Trust Tier Level` (ladder) + `Trust Tier` (per team) + `Entitlement Token`; `entitlements.py` (evaluate_tier/recompute_trust_tier/issue_token); `signing.py` Ed25519. Agent `Entitlement Token` cache + `entitlement.py` (receive_token offline-verify, can_provision enforcement) + verify-only `signing.py`. `team` is a **Data** field (Team is core/IAM, not installed here).

## Local config already set (in site_config)

- `agent.local`: `entitlement_public_key`; Administrator API key/secret generated (used by Central→Agent HTTP). Public key matches billing's private key.
- `billing.local`: `agent_api_key`/`agent_api_secret` (for push to agent); `entitlement_private_key`; Administrator API key/secret.
- (If keys ever mismatch: regenerate with `user.api_key/api_secret = frappe.generate_hash(15)` + save + commit — a stale `generate_keys` secret once failed to decrypt with 417.)

## Conventions & gotchas (carry forward)

- **TDD throughout** (red→green per slice); **frappe-dev** skill conventions; user wants both used.
- DocTypes created by hand-writing JSON+`.py` under `<app>/<app>/<module>/doctype/<name>/` then `bench --site X migrate`. Controller class name = DocType name with spaces/hyphens stripped, **no inner capitalisation** (`Add-on`→`Addon`, `Add-on Rate`→`AddonRate`).
- Frappe **JSON fieldtype rejects a Python list on assignment** → `frappe.as_json()` first.
- `bench --site X console` heredocs are flaky (ipython echo, `%`-format) → prefer `bench --site X execute module.func --kwargs "{...}"`. `bench execute` prints nothing for a falsy return.
- Declines → failed `PaymentResult` (not exception); timeouts → `GatewayTimeout` (retry reuses idempotency key = `payment_attempt.name` later).
- Tests: `from frappe.tests import IntegrationTestCase`. Shared gateway contract suite in `tests/gateway_contract.py` (mixin, no `test_` prefix); both gateway tests subclass it.
- SDKs present: stripe 2.56.0, razorpay 2.0.1, cryptography (Ed25519).

## Press payment parity (audited)

Charge/refund/webhook = at parity (our signature-first receiver is stricter than press). Adapter seam now also covers card setup (SetupIntent/mandate order), micro-charge validation, customer, checkout-signature, mandate cancel/status. Remaining press features map to: card/Payment-Method DocType+lifecycle → **#05**; UPI mandate DocType+state machine+cap=tier → **#08**; dunning → #14; credits+card refund-to-wallet → #11/#15; disputes → #15/#22; reconciliation → #21. press bills via Stripe-hosted Invoices; our model owns invoices + charges off-session (deliberate divergence, #09/#10).

## Architecture as built (#03/#04)

**Agent event log (#03, press_billing_agent):** `Plan Subscription Log` (append-only controller — a logged event can't be re-saved; `effective_to`/`synced_to_central` set via `db.set_value` only). `events.record_event` appends a segment (subscribed opens; changed closes prior + opens; cancelled closes) and best-effort on-demand push (failure never blocks recording). `sync.push_unsynced_events` is push-primary, idempotent on `event_id` (= log row name), marks `synced_to_central` only on Central ack, daily scheduler catch-up. `Sync Log` + `sync.cleanup_sync_logs` (rolling retention, site-config `sync_log_retention_days`, default 90d/~3mo, daily scheduler). Agent→Central auth: site-config `central_url` + `central_api_key`/`central_api_secret` (NOT yet set in site_config — needed for real push; tests mock `requests.post`).

**Central price-lock (#03, press_billing):** `Price Lock` (append-only; `source_event_id` unique = idempotency key). `pricelock.lock_from_event` (subscribed/changed open a lock = `shown_rate`; changed/cancelled close prior open lock; discrepancy flagged + `central_rate` stored when `shown_rate` ≠ live resolved rate, locked anyway). `pricelock.get_locked_rate(resource_id)` = active lock's rate (the billing read; survives live catalog edits). `sync.receive_usage_events` (whitelisted Agent→Central) returns only `acknowledged` event_ids.

**Subscription intent (#04, press_billing):** `Subscription` carries ONLY `account_standing` (current/past_due/suspended) — NO operational axis (Agent owns running/stopped/terminated). `Subscription Change` append-only. `subscriptions.py`: create/change_plan/change_payment_method/cancel each write a Change; `set_standing` staged machine (current→past_due→suspended, reactivate→current) raises `InvalidTransition` (subclass of ValidationError) on any illegal move; `reconcile_with_agent_event(sub, resource_id)` compares intent plan vs locked plan. NB: change_type Select gained `past_due` (beyond spec's list) to log the grace transition.

## Architecture as built (#05 card lifecycle)

**Cards (press_billing `payments.py`):** `initiate_payment_method_setup` (SetupIntent → client_secret + pending `Payment Method`, `method_type=card`), `confirm_payment_method` (stores card, runs adapter `validate_payment_method` = Stripe micro-charge + auto-refund; active only on success, else failed). `set_default_payment_method` / `delete_payment_method` (promotes next active) keep **exactly one default per team**; first active method auto-defaults. `expire_payment_methods` monthly scheduler (valid through end of printed month). Field standardised: Payment Method `mandate_customer_id` → **`gateway_customer_id`** (cards + mandates); added `setup_reference`. Tests `tests/test_payments.py` (10).

**UI specs pinned:** dashboards are **Frappe-UI** SPAs using the `frappe-ui/tailwind` preset (press's exact colour tokens — NO bespoke palette). New issue **#26** = shared portal scaffold (blocks #18/#19). Customer screens follow the [central-spec billing wireframes](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing). Spec changes committed to billing-specs `master`.

## Architecture as built (#06 credit wallet)

**Credits (press_billing `credits.py`):** append-only `Credit Ledger Entry` (entry_type credit/debit, positive amount, running_balance, reference, currency). Balance = latest running_balance (= ledger sum); **never a scalar on Team**. `purchase` (top-up), `apply_credit` (debit, raises `InsufficientCredits` before negative), `refund_to_wallet`, `adjust_credits` (admin), `get_balance`. **Concurrency:** every booking serialises on a per-team `Credit Wallet` anchor row via `SELECT ... FOR UPDATE` (stable PK lock — NOT the moving latest-ledger-row, which deadlocks under InnoDB next-key locking). Anchor holds NO balance. The post-lock balance read is itself `FOR UPDATE` (current read) so it sees prior commits, not the stale REPEATABLE-READ snapshot (which `_ensure_wallet`'s exists() fixes early). Tests `tests/test_credits.py` (10) incl. 2 real multi-threaded proofs. `apply_credit` is the locked primitive #11's waterfall builds on; `get_balance` feeds credits-only cap gating.

## Architecture as built (#09 invoices + #10 charge loop)

**Invoicing (#09, press_billing `billing.py`):** `Invoice` (INV-YYYY-MM-NNNNN, controller autoname on period_end; status Draft/Open/Paid/Overdue/Waived/Cancelled; invoice_type billable/cost_report) + `Invoice Line Item` child (generated once). `compute_line_items(team, cluster, start, end)` reads the Central `Price Lock` segments directly (they encode time windows + locked rate): one line per run-segment overlapping the month, `ended_at` **exclusive** (new plan wins the change day), `max(1, end−start)` floor (same-day churn = 1 day), `cancelled` markers skipped, amount = days × rate / days_in_period. Phase 1 `generate_draft_invoice` (reconcile-then-draft, idempotent per sub+period; nothing at sign-up) + `generate_draft_invoices`. Phase 2 `open_and_collect` applies credits (waterfall first leg) + claims Draft→Open under invoice `FOR UPDATE` (parallel-safe). Tests `tests/test_billing.py` (8).

**Charge loop (#10, press_billing `charges.py`):** `Payment Attempt` (idempotency_key = own name; status initiated/authorised/captured/failed/refunded). `pay_invoice` locks invoice `FOR UPDATE`, refuses a 2nd in-flight attempt, charges via adapter; declines→failed, `GatewayTimeout`→left initiated for same-key retry. **Never marks Paid on the charge response.** `charges.apply_webhook` (wired into `webhooks.handle_webhook_event`) matches the attempt by gateway txn id, drives Open→Paid + amount_paid under a row lock (idempotent on dup webhooks), logs an Info Comment notification; failure events leave Open. Tests `tests/test_charges.py` (7) incl. full Stripe cycle + concurrent-pay-once.

## Architecture as built (#11 waterfall + wallet gating)

**Waterfall (`billing.open_and_collect`):** credits applied first (wallet `FOR UPDATE`); if credits cover in full → invoice `Paid` (no gateway round-trip); else `Open` + charge the **remainder** to the card via `charges.pay_invoice`. Credits-only shortfall stays `Open` for dunning (#14), never stopped. (Charging only fires when the subscription has `default_payment_method`+`gateway`; #09's source-less test sub skips it.)

**Settlement (`settlement.py`):** `settlement_sources(team)` (has_autopay/has_credits/credits_only) + `ensure_settlement_source` (onboarding gate: card/mandate or credits). `effective_spend_cap(team)` = tier cap for autopay teams, `min(tier, wallet balance)` for credits-only; `can_accept_spend(team, projected)` denies new provisions beyond wallet coverage. `credit_forecast(team, projected_spend)` → utilisation vs balance, fires top-up prompt at ≥80% (publish_realtime stub; #20 = real sender) + reports shortfall. Tests `tests/test_settlement.py` (10). NB: `effective_spend_cap`/`can_accept_spend` are what token issuance ([[entitlement-system]]) and the agent `can_provision` should consume for credits-only gating.

## Next up

1. **#12** — metered billing Usage Meter (counter/gauge) on the Agent → metered rollups pushed → metered line items added to #09 invoices.
2. **#16** free/trial `cost_report` (entry tier → invoice_type cost_report, compute-don't-charge) + **#13** tax (GST/SEZ/TDS) filling the invoice tax block (output_tax/expected_collection).
3. Remaining: dunning #14, refunds #15, ERPNext sync #17, reconciliation #21, notifications #20. Frontend: #26 scaffold → #18/#19.

## Open spec inconsistency (not yet fixed)

`roadmap.md` and `architecture.md` still say `cloud_billing`/`subscription_agent`; `plans-and-pricing.md`/`payments.md` use `press_billing.*`. A global rename sweep was offered but not done — confirm with user.


===== ./subscription-agent.md =====

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
| shown_rate | Currency | Rate displayed at provision (resolved for currency + cluster) — Central locks this |
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


===== ./plans-and-pricing.md =====

# Plans & Pricing

## Purpose

Define billable **bundles** and **add-ons**, how rates are held per currency and per region, how a rate is locked for grandfathering, and how the catalog reaches the regional clusters.

## Model: bundles and add-ons

Two sellable things, modelled as two DocTypes:

- **Plan (bundle)** — a flat-rate offering (DigitalOcean-style: "$40/droplet"). One **immutable identity forever** (`bundle-2vcpu`); a rate change never forks a new plan (the v1 mistake that caused plan proliferation and a sync storm). A bundle *includes* a set of resources (2 vCPU, 4 GB, 80 GB) and carries a single **rate** per currency (and optionally per region). **The rate is the price — never `quantity × rate`.**
- **Add-on** — a per-unit item billed on top (bandwidth overage, extra block storage, snapshots, IPs). Here `rate × quantity` applies, and it is unambiguous because the thing is metered/discrete.

There is no `price` or `price_per_unit` anywhere; the single pricing word is **rate**.

## Why flat-rate bundles (and not per-resource pricing)

The earlier draft priced each included resource (`quantity_included × price_per_unit`) and summed them. At a glance you could not tell whether an invoice line was `qty × price` or just `price`. A bundle is one rate: `2 vCPU + 4 GB + 80 GB = $40/mo`, full stop. `press` already works this way (`Server Plan` / `Site Plan` carry flat `price_inr` / `price_usd`, with `vcpu` / `memory` / `disk` as composition, not priced lines). The included quantities survive only as the **allowance baseline** that add-on overage is measured against.

## Data model

**Plan (bundle)** — immutable identity; child tables OK

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`bundle-2vcpu`) |
| title | Data | |
| billing_cycle | Select | monthly / annual |
| annual_discount_pct | Float | |
| is_active | Check | |
| rates | Table → Plan Rate | Region × currency rates |
| includes | Table → Plan Includes | Composition (spec only) |

**Plan Rate** (child of Plan) — region × currency

| Field | Type | Notes |
|-------|------|-------|
| cluster | Data | **Blank = global default**; else a region/cluster key (e.g. `ap-south-1`) |
| currency | Link → Currency | INR, USD, … — going generic is *adding a row*, never a column |
| rate | Currency | The flat rate in that currency for that region |

**Plan Includes** (child of Plan) — composition, **no price**

| Field | Type | Notes |
|-------|------|-------|
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| quantity | Float | Included amount; also the metered **allowance** baseline |
| unit | Data | vCPU / GB / unit |

**Add-on** — immutable identity; per-unit

| Field | Type | Notes |
|-------|------|-------|
| name | Data | Immutable identity (`addon-bandwidth`) |
| title | Data | |
| resource_type | Select | compute / memory / disk / transfer / ip / snapshot |
| unit | Data | GB / unit |
| billing_type | Select | fixed / metered |
| billing_interval | Select | hourly / daily / monthly |
| rates | Table → Add-on Rate | Region × currency, **per-unit** rate |

**Add-on Rate** (child of Add-on) — same `(cluster, currency, rate)` shape as Plan Rate; `rate` is per-unit.

**Price-lock** (append-only; keyed by `resource_id`) — see also `Subscription Resource` in [subscriptions.md](subscriptions.md).

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Stable physical resource identity (from Agent event) — the lock key |
| plan | Link → Plan | |
| currency | Link → Currency | The team's billing currency at provision |
| locked_rate | Currency | Locked at provision = Agent `shown_rate` |
| cluster | Data | The region the resource ran in (drives which rate was resolved) |
| billing_interval | Select | Copied at lock time |
| started_at / ended_at | Datetime | ended_at null = active |

## Rate resolution

Given a `(plan-or-addon, team currency, resource cluster)`:

1. Take the rate rows matching the **currency**.
2. Prefer the row whose **cluster** matches the resource's region; otherwise fall back to the **global** (blank-cluster) row.
3. That rate is the live catalog rate.

A team has **one billing currency** (see [architecture.md](architecture.md)); the **cluster** comes from where the resource actually runs (reported by the Agent). One plan identity therefore covers every currency and every region — **no plan-per-currency, no plan-per-region**. AWS US-vs-India price differences are extra `Plan Rate` rows, not extra plans.

## Grandfathering (price-lock mechanism)

1. Customer provisions at the cluster. The Agent emits a `subscribed` event carrying `resource_id` and the **shown rate** (resolved for the team's currency + the cluster's region).
2. Central writes an append-only price-lock row keyed by `resource_id`, capturing the **currency + locked rate** (= `shown_rate`; logs a discrepancy if it differs from Central's currently-resolved rate).
3. Billing reads the lock forever.

Rules:
- Existing resource keeps its locked rate until **terminated/re-provisioned** — no time-based expiry.
- Destroy-then-reprovision of the "same" bundle is a *different* `resource_id` → a *new* lock at the then-current resolved rate.
- Upgrade/downgrade: old resource's lock closes (terminated), new resource opens a new lock at the new bundle's current rate.
- Admin rate change = edit one `Plan Rate` row, or **add a region override row**. Existing locks untouched; new provisions lock the new rate. Zero new plans.
- Admin escape hatch: bulk "re-lock to current rate" for forced migrations (e.g. sunsetting a bundle).

## Catalog distribution & price display

- Central pushes bundle identity + **includes** + the **full rate set** to each Agent's `Plan Cache` on change (cheap — few clusters, rare). Display only; the Agent computes nothing.
- The regional UI shows the rate for the user's currency and the cluster's region. This lets the UI show a rate during a Central outage and keeps the Agent thin (it carries numbers).
- **Rate shown = rate locked**, guaranteed: the Agent reports `shown_rate` on the event, and Central locks that.

## API

```
# [Customer + Admin] Browse / detail
GET  /api/resource/Plan?filters=[["is_active","=",1]]
GET  /api/resource/Plan/{name}
GET  /api/resource/Add-on

# [Admin] Create / update (a rate change = edit a Plan Rate row, no new plan)
POST /api/resource/Plan
PUT  /api/resource/Plan/{name}

# [Admin] Push bundles (+ includes + rates) to an Agent
POST /api/method/press_billing.sync.push_plans_to_agent
     { "agent_url": "...", "plans": ["bundle-2vcpu"] }

# [Regional UI] Live rate read, resolved for currency (+ optional cluster)
GET  /api/method/press_billing.plans.get_plan_pricing?plan=bundle-2vcpu&currency=USD&cluster=ap-south-1
```

## Notes

- Bundles never multiply `qty × rate`; add-ons do.
- Pricing is **read live at purchase** (human pace), **locked at provision** (per currency + region), and **frozen for billing** (machine pace). Three roles, one number.
- Generic by construction: a new currency or a new region is a new `Plan Rate` row — never a new plan.


===== ./architecture.md =====

# Architecture

## Purpose

Define the system shape for Frappe Cloud v2 billing: a two-application split, the source-of-truth boundary between them, the data/control flow, and the cross-cutting decisions every other spec depends on.

## Problem (what v1 got wrong)

Frappe Cloud v1 (Press) billing accumulated structural debt: prepaid credits as scalar fields (negative, unauditable balances); 10M+ daily usage rows (one per resource per day); no payment state machine ("Pay Now" on locked invoices); credit double-spend under concurrency; SQL injection; webhook signature checked *after* DB lookup (order-ID enumeration); thousands of synchronous ERPNext syncs; a single blocking 1st-of-month invoice loop. v2 is a redesign, not a patch.

## The two applications

**Cloud Billing** (Central — `billing.frappe.cloud`) — sole system of record for **money and the customer's monetary standing**. Owns gateway config, payment methods, plans + pricing, the customer's subscription *intent/contract*, invoices, credit ledger, trust tiers, entitlement tokens, tax, notifications, dashboards. The only component that talks to payment gateways.

**Subscription Agent** (per regional cluster) — deliberately thin, but **authoritative for what actually ran**. Records an immutable event log (subscribed/changed/cancelled, with `resource_id` and `shown_rate`), records metered-usage rollups, enforces Central-issued entitlement tokens locally, and syncs to Central. No financial logic, no gateway calls, no invoice computation — it carries numbers and applies directives; Central decides their meaning.

## Source-of-truth split

**The Agent is the source of truth for *what ran*; Central for *intent + money*.**

- Central's `Subscription` records *intent* — the customer asked for plan X, validated a card, authorised a payment intent.
- The Agent observes *reality* — what physically ran, on which `resource_id`, for how long.
- Billing computes from observed runtime joined to Central's locked prices. A request that never provisioned, or a stopped machine, bills accordingly. This kills the v1 "billed for things that weren't running" class of bug.

## Data & control flow

```
        Central (Cloud Billing)
          │  plan push          ▲  usage push (events + meter rollups)
          │  entitlement token  │  (on-demand primary + daily catch-up)
          ▼                     │
   Cluster — Mumbai        Cluster — Singapore
     Subscription Agent       Subscription Agent
     (4 DocTypes)             (4 DocTypes)
          │
     Bench Manager (provisions resources)
```

- **Plan distribution (Central → Agent):** Central pushes plan definitions + a *display* price to each Agent's local Plan Cache. See [plans-and-pricing.md](plans-and-pricing.md).
- **Provisioning (regional, Central-independent):** happens at the cluster, authorised against a signed entitlement token verified locally. Central's subscription API records intent only. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Usage collection (Agent → Central):** push-primary (on-demand + daily catch-up). Event log + metered rollups. See [subscription-agent.md](subscription-agent.md), [metering.md](metering.md).
- **Payment & invoicing (Central only):** see [invoicing.md](invoicing.md), [payments.md](payments.md).
- **ERPNext (async, one-way):** after payment, enqueue a Sales Invoice sync. Failure never blocks the customer invoice. ERPNext is the statutory accounting SOR.

## Cross-cutting decisions

- **Pure postpaid / in-arrears.** Everything billed on the 1st for the month just ended (fixed + metered), including the partial first month. No charge at sign-up. See [invoicing.md](invoicing.md).
- **No child tables for frequently-changing data.** Subscriptions, events, payment attempts, ledger entries, price-locks are top-level DocTypes linked by field. Child tables only for created-once/read-many (Invoice Line Items, Plan Resources).
- **Trust tier is the cap.** The entitlement cap is the team's trust tier, computed from billing history. See [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
- **Two orthogonal state axes.** Operational (`running/stopped/terminated`, Agent) vs account standing (`current/past_due/suspended`, Central). Never one enum. See [subscriptions.md](subscriptions.md).
- **Webhook-first, signature-first.** Verify the gateway HMAC as the first operation, before any DB access. See [payments.md](payments.md).
- **Adapter pattern for gateways.** Core logic never imports gateway code. See [payments.md](payments.md).
- **Idempotency everywhere.** Gateway calls carry idempotency keys derived from `payment_attempt.name`; webhooks dedupe on `gateway_event_id`.
- **Append-only ledgers.** Credit ledger and price-lock are append-only; balances computed from sums, never stored as scalars.

## Notes

- Single billing currency per team at launch (multi-currency per invoice is future).
- Same gateway merchant accounts as v1 (simplifies migration). See [migration.md](migration.md).


===== ./dashboard.md =====

# Dashboard

## Purpose

Two strictly role-gated surfaces over the same data: an admin (Frappe internal) view across all teams, and a self-service customer view scoped to one team.

## Roles

- **`Billing Admin`** (Frappe finance/ops/support) — all teams, all clusters. `[Admin]` endpoints return cross-team data.
- **`Billing User`** (team owner / billing contact) — own team only. `[Customer]` endpoints are auto-scoped by permission query; passing another team's name in filters is ignored.

A customer never sees another team's data; an admin can see and act on any team.

## Admin dashboard

Cost-Explorer style — aggregate totals, drill down progressively:

```
Total MRR / Spend (current month + trend)
  └ by Cluster └ by Service └ by Plan └ by Team └ by Invoice → Line items
```

Panels: Payment Analytics (attempt→success by gateway, failure reasons) · Overdue Aging (0–7 / 8–15 / 15–30 / 30d+) · Credit Utilisation · **Free/Trial Subsidy** (cost-to-company for non-paying teams — true cost via `cost_report` invoices) · Gateway Config · Team Lookup · Price Management.

```
GET /api/method/cloud_billing.admin.dashboard.get_summary?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_cluster_breakdown?cluster=&from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_team_billing?team=&from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_free_trial_costs?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_payment_analytics?from=&to=
GET /api/method/cloud_billing.admin.dashboard.get_overdue_invoices?aging_bucket=8-15
```

## Customer dashboard

Self-service portal, scoped to the logged-in team:

```
Current Month Forecast (projected bill vs credit balance)
  └ Active Subscriptions └ Current Month Usage Breakdown
Invoice History → Invoice Detail (line items, status, PDF)
Payment Methods (add / remove / default)
Credit Balance & Ledger (top up)
Notification Preferences
```

Intentionally omits: other teams' data, gateway config, payment success rates, admin operations (waive, manual credit adjustment).

## Frontend stack

Both surfaces are **Frappe-UI** SPAs (Vue 3 + Vite + Vue Router + Pinia), the same stack `frappe/press` ships its dashboard on. They are **not** Desk forms.

- **Design system = `frappe-ui` Tailwind preset.** Use `presets: [frappeUIPreset]` from `frappe-ui/tailwind` (as press does). The preset *is* the source of the colour tokens, spacing, and typography — adopting it yields press's exact CSS/colour patterns by construction. **No bespoke palette, no hand-picked hex values**; only press's tokens (`gray`, `blue` primary, semantic `green`/`amber`/`red` for paid/at-risk/overdue).
- **Components** come from `frappe-ui` (`Button`, `Dialog`, `ListView`, `Badge`, form controls); charts via `echarts`/`vue-echarts`; icons via `unplugin-icons` / `feather-icons` — matching press's choices.
- **Data layer:** `frappe-ui` resources (`createResource`/`createListResource`) call the whitelisted endpoints below; no direct DB access from the client.
- **Scaffold once, shared:** the SPA shell, router, auth/team context, and the imported design tokens are set up in the portal scaffold (#26); #18 and #19 build their routes inside it.

Customer screens follow the billing wireframes ([central-spec wireframes#billing](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing)): Billing Overview (prepaid wallet-balance vs postpaid outstanding-invoice variants) · Invoice List · Invoice Detail (line items + PDF) · Top-Up dialog (prepaid) · Pay-Invoice dialog (postpaid) · Billing Settings (prepaid/postpaid mode, min-balance / spend-alert thresholds).

## Notes

- Forecast is driven by the running-total meter rows + fixed accrual (see [metering.md](metering.md), [invoicing.md](invoicing.md)).
- The billing wireframes are render targets for #18; the design tokens are non-negotiable (press parity), the exact layout may adapt to the live data model.


===== ./credits.md =====

# Credits

## Purpose

An append-only credit ledger that is the customer's prepaid wallet and an alternative to autopay, with a settlement model that keeps prepaid-in-a-postpaid-system secured.

## Concepts

- Every credit movement is a **Credit Ledger Entry**. Balance is always computed from the ledger sum — **never** stored as a scalar on Team (the v1 negative-balance bug).
- Entries are **append-only**. Credits are booked as advance liability, not income.

## Data Model

**Credit Ledger Entry** (separate DocType)

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| entry_type | Select | credit / debit |
| amount | Currency | always positive |
| running_balance | Currency | balance after this entry |
| reference_type / reference_name | Data | Invoice / Payment Attempt / etc. |
| note | Small Text | |
| created_at | Datetime | |

| Entry type | Direction | Trigger |
|-----------|-----------|---------|
| Top-up | credit | Customer purchases credits |
| Invoice settlement | debit | Credits applied to an open invoice |
| Refund | credit | Partial overcharge / gateway refund |
| Expiry | debit | Unused credits past validity *(open: see Notes)* |
| Admin adjustment | credit/debit | Manual correction |

## Concurrency

Credits applied at invoice time under `SELECT ... FOR UPDATE` on the team's latest ledger entry — preventing the v1 concurrent double-spend race.

## Settlement model

Every team needs **at least one settlement source** at onboarding: **card/mandate autopay** *or* **prepaid credits** (or both). Waterfall when both exist: **credits first, then card**.

- **Autopay teams:** credits applied first, remainder auto-charged. The card is the backstop, so the cap follows the trust tier directly.
- **Credits-only teams:** the bill is drawn from the wallet. Because billing is postpaid, this is unsecured unless the **wallet gates provisioning** → effective cap = `min(tier cap, wallet-covered spend)`. The running forecast continuously compares projected month-end spend to the balance; at ~80% the team is notified to top up, and the next token refresh shrinks the cap (deny new provisions) *before* an overspend. Running resources are never stopped for this — only the residual shortfall at settlement flows into normal dunning.

## API

```
POST /api/method/cloud_billing.credits.purchase        { amount, currency, payment_method } → ledger_entry, new_balance
GET  /api/method/cloud_billing.credits.get_balance     → { balance, currency }
GET  /api/resource/Credit Ledger Entry?order_by=created_at desc
POST /api/method/cloud_billing.admin.adjust_credits    { team, amount, type, note }   # [Admin]
GET  /api/method/cloud_billing.admin.get_credit_ledger?team=TEAM-001                  # [Admin]
```

## Notes

- **Open items:** multi-currency credit handling, and credit-expiry mechanics (validity period, expiry debit timing) — not yet decided.
- Partial-overcharge corrections land here as a `credit` entry (see [invoicing.md](invoicing.md)).


===== ./invoicing.md =====

# Invoicing

## Purpose

Generate invoices in arrears from observed runtime + locked prices, dispatched in parallel to avoid the 1st-of-month bottleneck, and correct them without mutation.

## Billing philosophy

**Pure postpaid / in-arrears.** Everything (fixed + metered) is billed on the 1st for the month just ended, including the partial first month. A team joining June 15 gets its first invoice July 1 covering June 15–30, then full months. **No charge at sign-up** — prepaid-for-fixed is rejected because it needs pro-rata credit notes (banned). Bad-debt risk is bounded by the entitlement cap and, for credits-only teams, the wallet.

The billing period is always the calendar month.

## Two-phase generation

**Phase 1 — Draft pre-generation (28th)** — heavy computation, off-peak.

```python
for sub in active_subscriptions:
    enqueue("cloud_billing.billing.generate_draft_invoice", subscription=sub)
```

Each job (**reconcile-then-draft** — sync is push-based, so data is usually already on Central):
1. If the team's last sync is stale, pull events + meter rollups; else use what was pushed.
2. Compute line items per segment using the **locked price** (keyed by `resource_id`) + metered line items.
3. Apply tax ([tax.md](tax.md)).
4. Create a `Draft` invoice — no payment yet.

**Phase 2 — Open & collect (1st)** — one lightweight job per draft, parallel across workers.

```python
for inv in drafts(period_end=last_day_of_prev_month):
    enqueue("cloud_billing.billing.open_and_collect", invoice=inv)
```

Each job: apply credits (`FOR UPDATE` lock) → `Draft → Open` → notify → if amount due > 0, charge via gateway. The scheduler finishes in seconds; workers stagger collection naturally (respecting gateway rate limits).

## Billing computation

Join the Agent event log (time windows) to Central price-locks (locked price). Day-granularity by default.

```
Agent log (resource R):  plan-2vcpu Jun1→Jun10, plan-4vcpu Jun10→Jun22, plan-2vcpu Jun22→Jun30
Locked prices:           plan-2vcpu ₹1000/mo, plan-4vcpu ₹2000/mo
Result (new plan wins the day of change):
  plan-2vcpu Jun1–9   =  9 × (1000/30) = 300.00
  plan-4vcpu Jun10–21 = 12 × (2000/30) = 800.00
  plan-2vcpu Jun22–30 =  9 × (1000/30) = 300.00
```

Rules:
- **New plan wins the day** of a change.
- **`max(1, end − start)` floor** — a resource created *and* destroyed the same day is charged 1 day, not zero (closes the same-day-churn free faucet).
- **Granularity follows `billing_interval`.** The engine is generic over the unit (read from the locked resource). `daily`/`monthly` exercised at launch; `hourly` wired but unused (lights up for GPU/burst tiers later, no rewrite).

## Data Model

**Invoice** (stable)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | INV-YYYY-MM-NNNNN |
| team / subscription | Link | |
| invoice_type | Select | billable / cost_report (free/trial) |
| period_start / period_end | Date | |
| status | Select | Draft / Open / Paid / Overdue / Waived / Cancelled |
| subtotal | Currency | |
| (tax block) | | See [tax.md](tax.md) — output tax, zero-rating, withholding |
| credit_applied | Currency | |
| total | Currency | subtotal + output_tax |
| expected_collection | Currency | total − tds_amount (auto-charge target) |
| amount_paid | Currency | `paid` when amount_paid ≥ expected_collection |
| due_date | Date | |
| erpnext_invoice / pdf_url | Data | |

**Invoice Line Item** (child table — generated once, never updated)

| Field | Type | Notes |
|-------|------|-------|
| subscription_resource | Link | Source of locked price |
| resource_type / unit / quantity | | |
| rate | Currency | Locked price copied at generation |
| days | Int | Whole units active (with max-1 floor) |
| amount | Currency | days × (rate / units_in_period) |

## Invoice states

```
Draft → Open → Paid
              → Overdue → Waived (admin)
              → Cancelled
```

`Paid` only on webhook confirmation, never on the gateway API response. See [payments.md](payments.md).

## Corrections

Invoices are immutable once issued; correct by state, never by mutation:

- **Pre-payment** (Draft/Open): **cancel + reissue** (the 28th→1st buffer exists for this).
- **Post-payment** (Paid):
  - **Full dispute** → refund to source (`adapter.refund()`); invoice **stays `Paid`** + linked `Refund` (no "refunded" state — preserves GST immutability).
  - **Partial overcharge** → difference to the customer's **wallet** ([credits.md](credits.md)), applied next cycle.

All corrections **originate in Cloud Billing** (single money SOR) and sync the credit note **down** to ERPNext (statutory SOR). The credit-note ban is on *automatic proration* only; *admin correction* notes for GST downward revisions are allowed (in ERPNext).

## Forecast API

```
GET /api/method/cloud_billing.billing.get_forecast
    → { period_start, projected_total, credit_balance, shortfall, days_remaining, line_items[] }
```

Driven by the running-total meter rows ([metering.md](metering.md)) + fixed-resource accrual.

## Notes

- ERPNext sync is async, one-way, non-blocking; failure never rolls back the customer invoice.
- The reconciliation job (the "charged-but-never-webhooked" terminal state) is the most important hardening task — see [payments.md](payments.md) and [roadmap.md](roadmap.md).


===== ./migration.md =====

# Migration (v1 → v2)

## Purpose

Move existing Press v1 customers onto v2 billing without double-billing, throttling, or importing v1's unauditable balances as truth.

## Strategy — fresh start, gradual per-team

Press v2 is greenfield: **net-new users adopt v2 first.** Existing users migrate **per-team, opt-in, ~6 months after v2 is stable.** No shared cutover boundary → no double-billing window. Each team flips when it's ready, only after v2 is proven on net-new users.

## Per-team seeding (seed, don't backfill)

Per migrating team:
- One Agent `subscribed` event per running resource (the event log *starts* at migration).
- One **price-lock at the current v1 price** per running resource → instant, automatic grandfathering (no one's bill changes).
- One opening **Credit Ledger Entry** for the v1 prepaid balance.
- **No history backfill.** Historical v1 invoices imported **read-only** (for customer history display); never recomputed.

## Balances

- **Prepaid-credit teams:** import the balance as-is (one opening ledger entry).
- **Negative-balance teams: skipped.** They are asked to repay the debt first, then migrated. (v1 negative balances are the very data v2 doesn't trust.)

## Payment methods

- **Same gateway merchant accounts** as v1 → card tokens are already valid: **cards migrate by reference import, no customer action.**
- **UPI Autopay mandates require re-authorisation** — mandates are brittle across systems, and the ceiling must be re-pegged to the team's mapped trust tier ([payments.md](payments.md)). Part of each team's onboarding-to-v2.

## Tier mapping

Migration tier = `max( rules-applied-to-v1-history, current-run-rate × margin )`.

- Run the declarative promotion rules ([provisioning-and-entitlements.md](provisioning-and-entitlements.md)) retroactively over v1 invoices.
- Floor at the team's actual current run-rate so **no existing customer is throttled** by the act of migrating.
- The mapped tier sets the entitlement cap → which sets the mandate ceiling → which is why UPI mandates re-auth.

## Notes

- Cards don't have a ceiling, so they ignore the tier-mapping chain — they just import.
- Migration is explicitly **not** a launch task. See [roadmap.md](roadmap.md).


===== ./testing.md =====

# Testing

## Purpose

Prove correctness on the paths where v1 broke: concurrency, signatures, idempotency, billing math, and failure isolation.

## Unit tests

- **Gateway adapter contract suite** (every adapter must pass): successful charge, declined card, network timeout with retry (idempotency prevents double-charge), refund, valid + invalid webhook signature. Against gateway test mode or HTTP mock.
- **Credit ledger concurrency:** 10 concurrent threads apply credits to one team → correct final balance, no negative, no duplicate debit, `running_balance` matches cumulative sum.
- **Billing day computation:** known event-log timestamps → whole-day counts, new-plan-wins-the-day, `max(1,…)` floor, no sub-day arithmetic in output.
- **Metering aggregation:** counter (summed deltas) vs gauge (GB-days); idempotent re-push replaces not adds.
- **Two-axis state machine:** every valid transition passes; every invalid one raises `InvalidTransition`.
- **Webhook idempotency:** duplicate `gateway_event_id` → 200, no duplicate record, no second job.
- **Tax:** additive output, zero-rating reason, withholding (`expected_collection`, paid-state with withholding=0 and >0).

## Integration tests

- **Full Stripe / Razorpay cycle** including UPI mandate validation → charge → webhook → `Paid`, ledger debited, notification logged.
- **Two-phase invoice generation:** 50 subscriptions → drafts on 28th, open+collect on 1st with 10 concurrent workers → one draft each, all transitioned, **no invoice processed twice, no duplicate payment attempt.**
- **Usage event + meter sync:** events + rollups pushed → invoice line items match expected durations + metered amounts.
- **Free/trial cost report:** `cost_report` invoice generated (not billed), subsidy total includes the team.
- **ERPNext failure isolation:** ERPNext returns 500 → invoice still `Paid`, customer notified, sync queued for retry, no rollback.
- **Entitlement token:** offline verification; expired-token + Central-unreachable → deny new, keep running; suspend directive stops running.

## Security tests

- Webhook without valid signature → 400, **zero DB records**.
- Agent API key on a customer endpoint → 403.
- Replay of a processed webhook → 200, no side effects.
- Concurrent `pay_invoice` on one invoice → only one attempt reaches `captured`.
- No raw SQL interpolation (`bandit` + `grep`).

## Tools

| Layer | Tool |
|-------|------|
| Unit / integration | `frappe.tests.UnitTestCase` + `pytest` |
| HTTP mocking | `responses` (Razorpay), `stripe-mock` (Stripe) |
| Load | `locust` (1000-subscription run, webhook flood) |
| Static analysis | `bandit`, `ruff` |
| CI | GitHub Actions: lint → unit → integration per PR |


===== ./README.md =====

# Frappe Cloud v2 — Billing & Payments Spec

Spec for the **Billing** layer of Central — the sole system of record for money on Frappe Cloud v2. Split into focused domain files (structure modelled on [central-spec](https://github.com/rmehta/central-spec)).

Two applications:
- **Cloud Billing** (Central, `billing.frappe.cloud`) — money, plans, pricing, invoices, credits, tax, dashboards, gateways.
- **Subscription Agent** (per regional cluster) — thin; authoritative for *what actually ran*.

## The one principle everything hangs off

**The Agent is the source of truth for *what ran*; Central owns *intent + money*.** A customer can *request* a plan (intent, on Central) but is *billed* for what the cluster actually ran (observed by the Agent). See [architecture.md](architecture.md).

## Files

| File | Domain |
|------|--------|
| [architecture.md](architecture.md) | Problem statement, two-app split, source-of-truth, data/control flow, cross-cutting decisions |
| [plans-and-pricing.md](plans-and-pricing.md) | Plans, resources, grandfathering (price-lock), plan distribution & price display |
| [provisioning-and-entitlements.md](provisioning-and-entitlements.md) | Regional provisioning, entitlement tokens, trust tiers, caps, enforcement |
| [subscriptions.md](subscriptions.md) | Subscription intent, two-axis state, trial/free, lifecycle |
| [metering.md](metering.md) | Usage Meter — counter/gauge rollups, forecast |
| [invoicing.md](invoicing.md) | Two-phase generation, day-granularity billing, line items, states, corrections |
| [payments.md](payments.md) | Gateway adapter, payment methods, settlement, mandates, webhooks, retry, reconciliation |
| [credits.md](credits.md) | Credit ledger, wallet, settlement waterfall |
| [tax.md](tax.md) | Three-mechanic tax model (output / zero-rating / withholding) |
| [subscription-agent.md](subscription-agent.md) | The regional Agent app — DocTypes, sync behaviour |
| [dashboard.md](dashboard.md) | Admin & customer dashboards |
| [migration.md](migration.md) | v1 → v2 migration strategy |
| [testing.md](testing.md) | Testing strategy |
| [roadmap.md](roadmap.md) | Implementation phases & future considerations |
| [misc.md](misc.md) | Decision notes (e.g. why not `frappe/payments`) |

## Status

Draft. Derived from `design-doc-v2.md` (v2.1) and the 22 resolved decisions in `design-doc-v2-decisions.md`. Open items: multi-currency credit handling; the precise terminal-state model for the reconciliation job.


===== ./payments.md =====

# Payments

## Purpose

Charge invoices and collect payment through external gateways behind a uniform adapter, with signature-first webhooks, idempotent charges, mandate-aware ceilings, and reconciliation for lost confirmations.

## Gateway Adapter

Core billing logic never imports gateway code. Each gateway implements:

```python
class GatewayAdapter:
    # universal (every gateway implements)
    def setup_payment_method(self, team, setup_data) -> dict   # SetupIntent / mandate order
    def validate_payment_method(self, payment_method) -> bool  # micro-charge (Stripe)
    def charge(self, invoice, payment_method, idempotency_key) -> PaymentResult
    def refund(self, payment_attempt, amount, reason) -> RefundResult
    def verify_webhook_signature(self, payload: bytes, headers: dict) -> bool
    def parse_webhook_event(self, payload: dict, headers: dict | None) -> NormalisedEvent
    def get_transaction_status(self, gateway_txn_id: str) -> str

    # optional, gateway-specific (base default raises GatewayUnsupported)
    def create_customer(self, team) -> str
    def verify_payment_signature(self, data: dict) -> bool     # checkout callback (Razorpay)
    def cancel_mandate(self, mandate_reference, customer_reference=None) -> bool
    def get_mandate_status(self, mandate_reference: str) -> str
```

Notes on the seam:
- `parse_webhook_event` receives headers because Razorpay's dedupe id is in the `X-Razorpay-Event-Id` header while Stripe's is in the body.
- `verify_payment_signature` is the **client checkout callback** verification (Razorpay UPI Autopay authorisation / one-time order) — distinct from `verify_webhook_signature`. Stripe confirms via intent status, so it leaves this unsupported.
- Declines return a failed `PaymentResult`; transient/network failures raise `GatewayTimeout` so a retry reuses the same idempotency key.

Implemented: Stripe (USD, Payment Intents, SetupIntent, micro-charge), Razorpay (INR, UPI Autopay mandate order + recurring charge). PayPal to follow — one adapter class, no core changes.

## Payment Gateway (config)

One row per configured gateway. Credentials and webhook secrets are stored encrypted; the adapter for a charge/refund/webhook is resolved by `adapter_key`.

| Field | Type | Notes |
|-------|------|-------|
| name | Data | e.g. GW-Stripe, GW-Razorpay |
| title | Data | Display name |
| adapter_key | Select | stripe / razorpay / paypal — selects the `GatewayAdapter` impl |
| currency | Data | Settlement currency this gateway handles (USD, INR) |
| api_key | Password | Encrypted |
| api_secret | Password | Encrypted |
| webhook_secret | Password | Encrypted — used by `verify_webhook_signature` |
| supports_mandates | Check | True for UPI Autopay / SEPA-style gateways |
| is_enabled | Check | Disabled gateways reject new charges |
| is_default_for_currency | Check | Picked when a team's currency matches |

Managed only via the admin **Gateway Config** panel (see [dashboard.md](dashboard.md)). Secrets are never returned by any customer-facing API.

## Payment Method lifecycle

Add card → gateway setup flow (Stripe SetupIntent / Razorpay order) → customer confirms → **micro-charge (₹1 / $0.50) captured and refunded** to prove the card is live → `active`.

```
pending_validation → active
                   ↘ failed
active → expired (monthly expiry scheduler)
```

**Payment Method** (separate DocType — not child of Team)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| gateway | Link → Payment Gateway | |
| method_type | Select | card / upi_autopay / prepaid_credits |
| gateway_method_id | Data | Stripe `pm_xxx`, Razorpay mandate ID |
| status | Select | pending_validation / active / expired / failed |
| is_default | Check | |
| display_label | Data | "Visa ····4242" |
| expiry_month / expiry_year | Int | |
| mandate_max_amount | Currency | = trust-tier cap (mandate methods only) |
| validated_at | Datetime | |

## Settlement & mandates

See [credits.md](credits.md) for the full settlement model (≥1 source required; credits-then-card waterfall; wallet-gating for credits-only).

**Mandate ceilings.** A mandate (UPI Autopay, etc.) has a fixed `max_amount`. To make "bill exceeds mandate" structurally impossible, **mandate `max_amount` = the team's trust-tier cap**. A promotion that raises the cap requires **mandate re-authorisation** (customer re-consent); until then the customer is held at the old ceiling. **Cards are exempt** (off-session, any amount).

## Webhooks (signature-first)

All gateway webhooks land at `/api/method/cloud_billing.webhooks.<gateway>`:

1. Read raw bytes before any JSON parsing.
2. `adapter.verify_webhook_signature()` — **first operation, before any DB access**. Fail → HTTP 400. (Closes the v1 order-ID enumeration bug.)
3. Parse into `NormalisedEvent`.
4. Insert `Webhook Event` (unique on `gateway_event_id`) — duplicates fail silently, return 200.
5. Enqueue a background job for the state transition.

No business logic runs in the HTTP request cycle.

**Webhook Event** (separate DocType)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| gateway | Link → Payment Gateway | |
| gateway_event_id | Data | **Unique constraint** — dedupes replays |
| event_type | Data | |
| raw_payload | Long Text | Full JSON |
| status | Select | received / processed / failed / ignored |
| processed_at | Datetime | |
| error | Small Text | |

## Charge flow & idempotency

`Open` → `charge()` with `idempotency_key = payment_attempt.name` → **wait for webhook to mark `Paid`** (never mark paid on the API response). Each attempt is a new **Payment Attempt** record.

**Payment Attempt** (separate DocType — not child of Invoice)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| invoice | Link → Invoice | |
| gateway | Link → Payment Gateway | |
| payment_method | Link → Payment Method | |
| amount / currency | Currency / Data | |
| idempotency_key | Data | Unique — drives gateway dedupe |
| status | Select | initiated / authorised / captured / failed / refunded |
| gateway_transaction_id | Data | |
| initiated_at / completed_at | Datetime | |
| failure_code | Data | |
| failure_reason | Small Text | |
| retry_number | Int | 0 = first attempt |

## Retry & reconciliation

- Failed payments retried Day 1 / Day 3 / Day 7. After Day 7 → invoice `Overdue`, standing `past_due`. Notify with the failure reason each time.
- **Reconciliation job (daily):** scans ambiguous states against gateway APIs and resolves the **"charged-at-gateway-but-never-webhooked"** terminal state — without double-charging (idempotency key) or leaving revenue uncollected. The single most important hardening job.

## Refunds

- **Full dispute** → refund to source (`adapter.refund()`); invoice stays `Paid` + `Refund` record.
- **Partial overcharge** → credit the wallet (default for active customers; refund-to-source for churning customers).
- Symmetric across gateways via the adapter.

**Refund** (separate DocType — linked to the original Payment Attempt)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| payment_attempt | Link → Payment Attempt | The original charge |
| invoice | Link → Invoice | Stays `Paid` (no "refunded" state) |
| amount / currency | Currency / Data | |
| destination | Select | source (gateway) / wallet (credit ledger) |
| reason | Small Text | |
| gateway_refund_id | Data | |
| status | Select | initiated / completed / failed |
| created_at / completed_at | Datetime | |

## API

```
POST /api/method/cloud_billing.payments.initiate_payment_method_setup   # → client_secret
POST /api/method/cloud_billing.payments.confirm_payment_method          # → active after micro-charge
GET  /api/resource/Payment Method
PUT  /api/resource/Payment Method/{name}   { "is_default": 1 }
POST /api/method/cloud_billing.billing.pay_invoice                       # → Payment Attempt
POST /api/method/cloud_billing.webhooks.stripe
POST /api/method/cloud_billing.webhooks.razorpay
```

## Notes

- ERPNext is the statutory SOR; Cloud Billing is the SOR for the customer-facing balance. Corrections originate in Cloud Billing (see [invoicing.md](invoicing.md)).


===== ./roadmap.md =====

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
- **Multi-currency per team / per invoice** — currently one currency per team.
- **Cross-region consolidated invoice** — merge multi-cluster Agent events at Central before generation.
- **PayPal adapter** — one adapter class when demand justifies.

## Open items

- Multi-currency credit handling and credit-expiry mechanics ([credits.md](credits.md)).
- Precise terminal-state model for the reconciliation job ([payments.md](payments.md)).


===== ./tax.md =====

# Tax

## Purpose

Model tax correctly as **three structurally different mechanics** — not one rate field — so GST works, SEZ is auditable, and TDS withholding doesn't poison the paid-state.

## Three mechanics

| Mechanic | Examples | Effect |
|----------|----------|--------|
| **Additive output tax** | GST, VAT | Added to `total`. Customer pays the bigger number. |
| **Zero-rating with reason** | SEZ-LUT, export | `tax = 0` **plus a compliance reason code** (not "None" — an auditor will ask). |
| **Withholding** | TDS | Reduces the amount *collected*, not the `total`. Customer pays less and provides a certificate you reclaim. |

## Data Model (Invoice tax block)

| Field | Type | Notes |
|-------|------|-------|
| output_tax_type | Select | GST / VAT / none (additive) |
| output_tax_rate | Float | |
| output_tax_amount | Currency | added to total |
| zero_rating_reason | Select | sez_lut / export / null |
| tds_applicable | Check | customer self-declares (has TAN) |
| tds_rate | Float | |
| tds_amount | Currency | withheld — reduces collected, not total. **0 at launch** |
| tds_certificate_received | Check | gate for closing a withheld invoice |

## Collection & paid-state

- `total = subtotal + output_tax_amount`
- `expected_collection = total − tds_amount` (the auto-charge / mandate target)
- `paid` ⇔ `amount_paid ≥ expected_collection` (certificate gate trivially satisfied when withholding = 0)

So a TDS customer who legally short-pays is **not** marked permanently unpaid, and auto-charge never tries to debit money they will withhold.

## Launch scope

- **GST + SEZ ship fully** at launch.
- **TDS is Phase 2/3**, but the *seam* (withholding-aware `expected_collection` + paid-state) lands now → TDS is an additive change, not a rewrite. Only certificate reconciliation is deferred.

## Notes

- Mandate ceilings use `total` (the gross), not the reduced amount. See [payments.md](payments.md).
- Formal credit notes for downward GST revisions are issued in ERPNext (the statutory SOR). See [invoicing.md](invoicing.md).


===== ./provisioning-and-entitlements.md =====

# Provisioning & Entitlements

## Purpose

Define how a resource gets provisioned at a regional cluster — independent of Central's availability — and how Central bounds what each team may run via trust tiers and signed entitlement tokens.

## Concepts

- **Regional provisioning** — provisioning happens at the cluster / Bench Manager, not Central, so it survives Central being down. Central's subscription API records *intent* only.
- **Entitlement token** — a short-lived, signed credential issued by Central, verified **locally** by the cluster (no live call). Carries the team's structured cap.
- **Trust tier** — the cap *is* the team's trust tier, computed by Central from billing history. Auto-ramped.

## Trust tiers

The entitlement cap is the current trust tier's limit.

- **Ladder** (admin-defined): `t0` (entry/trial, e.g. $100, single cluster) → `t1` ($300) → `t2` …
- **Promotion** — declarative, auto-applied: `K consecutive paid invoices AND cumulative paid ≥ $X`. Admin override available. (Reuse press's existing thresholds.)
- **Demotion** — fast, on missed payment / chargeback / fraud signal. **Limits growth only**: running resources survive; only actual non-payment triggers stop/terminate (see [subscriptions.md](subscriptions.md)).
- **Two measures, never conflated:** provisioning checks *projected run-rate* (cluster, live); promotion checks *historical paid* (Central, monthly).

**Trust Tier** (per team — computed by Central from billing history)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| tier | Select | t0 (entry/trial) / t1 / t2 / … (admin-defined ladder) |
| max_spend | Currency | Monthly cap (= mandate ceiling for mandate teams) |
| max_resource_count | Int | |
| allowed_plans | JSON | |
| allowed_clusters | JSON | Trial = single cluster |
| promoted_at | Datetime | |
| promotion_basis | Small Text | Rule that granted it (`K paid months + ≥ $X`) — audit |
| manual_override | Check | Admin-set; exempt from auto-demotion |

## Entitlement token

Structured cap, not a scalar — so it can express categorical limits (no dedicated IP on trial, plan whitelist) and per-cluster partitioning.

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| cluster_slices | JSON | Per-cluster `{max_spend, max_resource_count}` — sums never exceed team total |
| allowed_plans | JSON | |
| allowed_resource_types | JSON | |
| suspend | Check | cap-0 + suspend directive (enforcement channel) |
| issued_at / expires_at | Datetime | ~24–48h lifetime = delinquency-exposure window |
| signature | Data | Verified offline at the cluster |

**Multi-cluster caps are pre-partitioned.** A per-team cap enforced independently per cluster is *not* a per-team cap (a team could double it across two clusters). Central divides the team total into per-cluster slices at issue time; the cluster enforces its slice locally. Trial = single cluster (`allowed_clusters = [one]`). Launch is single-cluster; the schema is cluster-scoped now, rebalancing logic deferred.

## Lifecycle rules

- **Onboarding requires Central** (first payment-method validation + first token). Steady-state does not.
- **Fallback when token expired AND Central unreachable:** deny *new* provisions, keep running ones alive (don't punish customers for our outage).
- **Credits-only teams:** effective cap = `min(tier cap, wallet-covered spend)` — the wallet gates provisioning. See [credits.md](credits.md).

## Enforcement (suspension)

Suspension is a Central-issued directive on the **same token channel** (next token = cap 0 + `suspend` flag). Staged:

1. `past_due` (a retry failed) → keep running (grace).
2. `suspended` (Day-7 retries failed) → stop / power-off, data preserved.
3. After ~30 days suspended → terminate, with notice.

Distinction: **Central unreachable** → keep running. **Central decides delinquent** → act on running resources.

## API

```
# [Customer] Create subscription — records INTENT (provision happens at cluster)
POST /api/resource/Subscription
     { "plan": "...", "billing_cycle": "...", "default_payment_method": "...", "cluster": "..." }

# [Central → Agent] Issue / refresh entitlement token
POST https://{agent}/api/method/subscription_agent.entitlement.receive_token
     { "team": "...", "cluster_slices": {...}, "signature": "..." }

# [Admin] Force standing transition
POST /api/method/cloud_billing.admin.set_subscription_status
     { "subscription": "...", "status": "suspended", "reason": "non-payment" }
```

## Notes

- The cluster knows only the cap (a number); the "trial" label and tier semantics live on Central.
- Token lifetime is the single dial trading outage-resilience against credit risk.


===== ./misc.md =====

# Misc / Decision Notes

Cross-cutting rationale that doesn't belong to a single domain file.

## Why we don't build on the existing `frappe/payments` app

> Note: central-spec's `billing.md` says "collect payment via frappe/payments." We deliberately diverge. This records why.

`frappe/payments` is a mature, well-tested app — but it is built for a **different shape of problem** than a billing engine.

**What `frappe/payments` is designed for:** one-off, *on-session* checkout. A `Payment Request` is created, the customer is redirected to the gateway (or an embedded button), they pay once, and a webhook/redirect confirms. Gateway settings live in per-gateway singletons (e.g. "Razorpay Settings", "Stripe Settings"). It is the right tool for webshop/ERPNext "pay this invoice now" flows.

**What v2 billing needs that doesn't map onto it:**

| Requirement | Why `frappe/payments` doesn't fit |
|-------------|-----------------------------------|
| **Off-session recurring auto-charge** | Its model is on-session redirect/checkout, not "charge a stored method/mandate at month-end without the customer present." |
| **Mandates pegged to trust tier** | No first-class UPI Autopay / mandate lifecycle with a `max_amount` we control and re-authorise on tier promotion (see [payments.md](payments.md)). |
| **Idempotency keys derived from `payment_attempt.name`** | No `Payment Attempt` model; no per-attempt idempotency contract to prevent double-charge on retry. |
| **Signature-first webhooks** | We require HMAC verification as the *first* operation before any DB access (the v1 enumeration bug). We need full control of the security ordering and our own `Webhook Event` dedupe on `gateway_event_id`. |
| **Retry / dunning state machine** | Day 1/3/7 retry → `past_due` → suspend is billing logic, not checkout logic. |
| **Reconciliation** | The "charged-but-never-webhooked" terminal-state scan needs our own attempt/refund records. |
| **Adapter isolation** | Core billing must never import gateway code; adding a gateway = one `GatewayAdapter` class passing a shared contract-test suite. `frappe/payments` controllers are coupled to its Payment Request / integration patterns. |
| **Multi-account / multi-currency by gateway** | We model many `Payment Gateway` config rows (per currency/account); the singleton-settings model fights this. |

**Decision:** build a thin **`GatewayAdapter`** layer owned by Cloud Billing (see [payments.md](payments.md)). Reusing `frappe/payments` would mean bending its checkout abstractions around a recurring-billing engine and inheriting webhook patterns we explicitly want to redesign — more friction than writing a focused adapter.

**Tracked as:** the Gateway Integrations milestone — porting the existing Stripe/Razorpay integrations into the adapter model and retiring the old path is [issue #24](issues/24-gateway-integration-port-decommission.md).

**What we still borrow:** the underlying gateway SDKs (the `stripe` / `razorpay` Python libraries) and `frappe/payments` as a *reference* for gateway quirks. We are not reinventing gateway protocols — only the billing-side orchestration around them.

**Revisit if:** a future need is genuinely one-off-checkout shaped (e.g. a standalone "buy a one-time add-on" flow with no subscription), where `frappe/payments` might be the simpler path for that surface alone.

## Other notes

- ERPNext is the statutory accounting SOR; Cloud Billing is the SOR for the customer-facing balance. Corrections originate in Cloud Billing and sync down to ERPNext (see [invoicing.md](invoicing.md)).
- `Team` and user roles are owned by Central core / IAM, not this spec; referenced via `Link → Team` and the `Billing Admin` / `Billing User` roles.


===== ./issues/20-notification-suite.md =====

# 20 — Notification suite (sole sender)

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [architecture.md](../architecture.md), [payments.md](../payments.md)

## What to build

The full notification suite, with **Cloud Billing as the sole sender** (fixing v1's duplicate emails from both Press and the gateway). Events: payment success, payment failure (with reason), each retry, overdue, credit-low, card/mandate expiry, trial-expiring. A `Notification Log` per team; customer notification preferences honoured.

## Acceptance criteria

- [ ] `Notification Log` per team; one sender (Cloud Billing) — no gateway-sent duplicates.
- [ ] Templates for success / failure / retry / overdue / credit-low / card-expiry / trial-expiring.
- [ ] Notifications fire from the correct state transitions (payment, retry, dunning).
- [ ] Customer notification preferences respected.
- [ ] Credit-low uses the forecast threshold (~80%) from #11.

## Blocked by

- #10
- #14


===== ./issues/15-refunds.md =====

# 15 — Refunds — full→source, partial→wallet

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [invoicing.md](../invoicing.md)

## What to build

Post-payment corrections. A `Refund` DocType linked to the original `Payment Attempt`. **Full dispute** → refund the full amount to source via `adapter.refund()`; the invoice **stays `Paid`** with a linked `Refund` (no "refunded" state — preserves GST immutability). **Partial overcharge** → add the difference to the customer's **wallet** as a credit ledger entry (applied next cycle). Corrections originate in Cloud Billing; a matching credit note syncs down to ERPNext (#17). Symmetric across Stripe and Razorpay.

## Acceptance criteria

- [ ] `Refund` DocType (linked to Payment Attempt) with `destination` source/wallet, status, gateway_refund_id.
- [ ] Full dispute → gateway refund to source; invoice remains `Paid` + linked Refund.
- [ ] Partial overcharge → wallet credit ledger entry, applied next invoice.
- [ ] Refund works symmetrically for Stripe and Razorpay via the adapter.
- [ ] Pre-payment corrections use cancel + reissue (no mutation of issued line items).

## Blocked by

- #06
- #10


===== ./issues/09-postpaid-invoice-generation-fixed.md =====

# 09 — Postpaid two-phase invoice generation (fixed resources)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [invoicing.md](../invoicing.md)

## What to build

Postpaid, in-arrears invoice generation for **fixed** resources, in two phases. **28th — reconcile-then-draft:** for each active subscription, reconcile sync if stale, then compute day-granularity line items (event-log time windows × locked price, with the `max(1, end−start)` floor), apply nothing yet, create a `Draft`. **1st — open & collect:** one parallel job per draft transitions `Draft → Open`, no double-processing. Partial first month is billed on the following 1st (no charge at sign-up). Line-item engine is generic over `billing_interval` (daily exercised, hourly wired).

## Acceptance criteria

- [ ] `Invoice` + `Invoice Line Item` (child, generated-once); status `Draft/Open/Paid/Overdue/Waived/Cancelled`.
- [ ] 28th job drafts one invoice per active subscription with correct day-weighted line items from the event log × locked price.
- [ ] `max(1,…)` floor: same-day provision+destroy charges 1 day, not 0.
- [ ] 1st job opens all drafts in parallel (10 workers) with **no invoice processed twice**.
- [ ] New-plan-wins-the-day verified; partial first month billed on the 1st, nothing at sign-up.

## Blocked by

- #03
- #04


===== ./issues/02-gateway-adapter-webhook-spine.md =====

# 02 — Gateway config + adapter + Stripe + signature-first webhook spine

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [payments.md](../payments.md)

## What to build

The gateway layer end-to-end: a `Payment Gateway` config DocType (encrypted credentials/webhook secret, `adapter_key`, currency), the `GatewayAdapter` interface, a Stripe adapter (charge / refund / `verify_webhook_signature` / `parse_webhook_event`), and a secure webhook receiver. The webhook endpoint verifies the gateway HMAC **as its first operation, before any DB access**, then stores a `Webhook Event` deduped on `gateway_event_id` and enqueues a job. No business logic in the request cycle. Core billing never imports gateway code.

## Acceptance criteria

- [ ] `Payment Gateway` config DocType; secrets encrypted and never returned by any customer API.
- [ ] `GatewayAdapter` interface + Stripe adapter passing a shared contract-test suite (charge, decline, timeout-with-idempotency, refund, valid/invalid signature).
- [ ] Signed test webhook → 200 and stored; **unsigned/invalid → 400 with zero DB writes**.
- [ ] Replay of a processed `gateway_event_id` → 200, no duplicate record, no second job.
- [ ] Signature verification occurs before any DB lookup (regression test for the v1 enumeration bug).

## Blocked by

None - can start immediately.


===== ./issues/24-gateway-integration-port-decommission.md =====

# 24 — Port & decommission existing gateway integrations

**Type:** AFK · **Milestone:** Gateway Integrations (Phase 1 foundation) · **Spec:** [payments.md](../payments.md), [misc.md](../misc.md)

## What to build

Rewrite the existing v1 / `frappe-payments` Stripe & Razorpay integration logic into the new `GatewayAdapter` model and **retire the old path**, so there is a single integration surface. The gateway *knowledge* (charge/refund flows, webhook event shapes, gateway quirks) is ported from the working implementations rather than reinvented; the *structure* is the new one — adapter isolation, signature-first webhooks, per-attempt idempotency. Core billing must import no gateway SDK code directly. This is the concrete consequence of the "why not frappe-payments" decision in [misc.md](../misc.md).

## Acceptance criteria

- [ ] Existing Stripe & Razorpay behaviors reimplemented as `GatewayAdapter` classes passing the shared contract suite.
- [ ] **No core billing module imports a gateway SDK directly** (adapter isolation verified by test/static check).
- [ ] Webhooks for both gateways route through the signature-first receiver with the idempotent event store (#02).
- [ ] The old `frappe-payments`-based gateway path is removed/disabled — one integration surface remains.
- [ ] Parity check: every behavior the old integration covered (charge, refund, webhook event types) is covered by the new adapters.

## Blocked by

- #02


===== ./issues/12-metered-billing-usage-meter.md =====

# 12 — Metered billing — Usage Meter (counter/gauge)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [metering.md](../metering.md)

## What to build

The metered stream. The Agent reads cluster metrics, **rolls up locally** (Central never stores raw samples), and ships per-`(resource_id, meter_type, period)` figures: `counter` (summed deltas, e.g. transfer) and `gauge` (GB-days integral, e.g. snapshot). A single **running-total row per current period** is overwritten daily for the live forecast and collapses at close. Central computes metered line items as `max(0, quantity − locked_allowance) × locked_rate` (rate + allowance locked at provision, #03). Rollups are idempotent (re-push replaces, never adds).

## Acceptance criteria

- [ ] Agent `Usage Meter` with `meter_type` (counter/gauge) and correct aggregation math for each.
- [ ] Running-total row per `(resource_id, meter_type, current_period)` overwritten daily; collapses to final at close.
- [ ] Central never stores raw samples — only rollups (bounded row count).
- [ ] Metered line item = `max(0, qty − allowance) × rate` using locked rate/allowance.
- [ ] Idempotent re-push after an Agent outage replaces the period figure (no double count).

## Blocked by

- #03
- #09


===== ./issues/14-retry-dunning-suspension.md =====

# 14 — Retry/dunning + staged suspension

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md), [subscriptions.md](../subscriptions.md)

## What to build

Failed-payment handling end-to-end. Retry at Day 1 / 3 / 7 (each a new `Payment Attempt`, customer notified with the failure reason). After Day 7 → invoice `Overdue`, standing `past_due` (keep running, grace). Continued non-payment → Central issues a **suspend directive on the entitlement-token channel** (cap 0 + `suspend`) → the Agent **stops/powers-off** the resource (data preserved). After ~30 days suspended → terminate. Central-unreachable never triggers a stop; only a deliberate directive does.

## Acceptance criteria

- [ ] Retry scheduler at Day 1/3/7; each a new attempt; notification per retry with failure reason.
- [ ] Day-7 failure → invoice `Overdue`, standing `past_due`, resource still running.
- [ ] Suspend directive rides the token channel; Agent stops the resource on receipt (data preserved).
- [ ] Staged escalation to terminate after the dunning window.
- [ ] Central-unreachable does **not** stop running resources (only a deliberate directive does).

## Blocked by

- #07
- #10


===== ./issues/23-migration-tooling.md =====

# 23 — Migration tooling (gradual per-team)

**Type:** HITL · **Milestone:** post-launch (~6mo) · **Spec:** [migration.md](../migration.md)

## What to build

Per-team, opt-in migration from Press v1 — **not a launch task**, run ~6 months after v2 is stable. Per migrating team: seed one Agent `subscribed` event + one price-lock at the **current v1 price** (instant grandfathering) + one opening credit ledger entry; no history backfill; historical v1 invoices imported read-only. Negative-balance teams skipped until they repay. Cards migrate by reference (same gateway accounts); UPI mandates require re-authorisation. Tier mapping = `max(rules-on-v1-history, current-run-rate × margin)` so no one is throttled. **HITL:** needs migration sign-off and per-batch review.

## Acceptance criteria

- [ ] Per-team seed: one subscribed event + price-lock at current v1 price + opening credit entry; no backfill.
- [ ] Historical v1 invoices imported read-only; never recomputed.
- [ ] Negative-balance teams excluded until repaid.
- [ ] Cards imported by reference (no customer action); UPI mandates flagged for re-authorisation.
- [ ] Migration tier = `max(rules-on-v1-history, current-run-rate × margin)`; no existing customer throttled.

## Blocked by

- #09
- #17


===== ./issues/26-billing-portal-frontend-scaffold.md =====

# 26 — Billing portal frontend scaffold (Frappe-UI)

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md)

## What to build

The shared **Frappe-UI** single-page-app shell that the customer (#18) and admin (#19) dashboards are built inside — set up once so both surfaces inherit press's exact design system rather than re-deriving colours per screen. This is the foundation slice for all billing UI.

Stack mirrors `frappe/press`'s `dashboard/`: **Vue 3 + Vite + Vue Router + Pinia + `frappe-ui`**, served from `press_billing/dashboard/` and mounted via a `www/` route + Frappe build pipeline.

**Design system is non-negotiable:** Tailwind config uses `presets: [frappeUIPreset]` from `frappe-ui/tailwind`. That preset is the single source of colour tokens, spacing, and typography — the SPA uses **only** press's tokens (`gray`, `blue` primary, semantic `green`/`amber`/`red`), no bespoke palette or hand-picked hex. Components come from `frappe-ui` (`Button`, `Dialog`, `ListView`, `Badge`, form controls); charts via `vue-echarts`; icons via `unplugin-icons`/`feather-icons`.

## Acceptance criteria

- [ ] `press_billing/dashboard/` SPA builds and serves; Tailwind extends `frappeUIPreset` (no custom colour palette defined anywhere).
- [ ] App shell: router, Pinia store, logged-in **team context**, and a `frappe-ui` resource layer pointing at the billing whitelisted endpoints.
- [ ] Shared layout primitives (page shell, nav, panel/card, money + status `Badge`) render with press's tokens — visually consistent with the press dashboard.
- [ ] A smoke route renders against a real endpoint (e.g. current team) to prove auth + data wiring end-to-end.
- [ ] Lint/build wired into the app's asset pipeline (`bench build`); no Desk-form fallback for these surfaces.

## Blocked by

- #01

## Notes

- Customer screens (built in #18) follow the billing wireframes: [central-spec wireframes#billing](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing).
- Keep the surface thin: the SPA renders and calls whitelisted APIs; all money/auth logic stays server-side.


===== ./issues/25-paypal-adapter.md =====

# 25 — PayPal adapter

**Type:** AFK · **Milestone:** Gateway Integrations (post-launch / to-follow) · **Spec:** [payments.md](../payments.md)

## What to build

A PayPal `GatewayAdapter` (charge / refund / `verify_webhook_signature` / `parse_webhook_event`) passing the shared contract suite, with webhooks flowing through the signature-first receiver. The spec marks PayPal "to follow" — implement when customer demand justifies it. The value of the adapter pattern is that this requires **no changes** to invoicing, payment, or subscription logic.

## Acceptance criteria

- [ ] PayPal adapter passes the shared `GatewayAdapter` contract suite (charge, refund, valid/invalid signature).
- [ ] PayPal webhooks route through the signature-first receiver with idempotent event store.
- [ ] Adding PayPal requires **no changes** to invoicing/payment/subscription modules.
- [ ] Currency + account config managed via the `Payment Gateway` DocType.

## Blocked by

- #02


===== ./issues/11-credit-application-waterfall.md =====

# 11 — Credit application at invoice (waterfall + wallet gating)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [credits.md](../credits.md), [invoicing.md](../invoicing.md)

## What to build

At open-and-collect, apply credits **first** (under `FOR UPDATE`), reducing the amount due, then charge the remainder to the card (waterfall). For **credits-only** teams, the effective entitlement cap is `min(tier cap, wallet-covered spend)`, and the forecast notifies at ~80% of balance; the next token refresh shrinks the cap before an overspend, while running resources are never stopped for this.

## Acceptance criteria

- [ ] Credits applied first under `FOR UPDATE`; `credit_applied` recorded on the invoice; remainder charged to card.
- [ ] Credits-only team: cap = `min(tier cap, wallet-covered spend)`; provisioning denied beyond wallet coverage.
- [ ] Forecast-driven top-up notification fires at ~80% of balance.
- [ ] Residual shortfall at settlement flows into dunning (#14), not an immediate stop.
- [ ] At-least-one-settlement-source enforced at onboarding (card or credits).

## Blocked by

- #06
- #09


===== ./issues/17-erpnext-async-sync.md =====

# 17 — ERPNext async Sales Invoice sync

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [invoicing.md](../invoicing.md), [architecture.md](../architecture.md)

## What to build

After an invoice is `Paid`, enqueue an async job to create the corresponding Sales Invoice in ERPNext (the statutory accounting SOR). One-way, non-blocking: failure retries with exponential backoff (3 attempts, then alerts ops) and **never blocks or rolls back** the customer-facing invoice. Cloud Billing remains the SOR for the customer-facing balance.

## Acceptance criteria

- [ ] Post-payment hook enqueues an ERPNext Sales Invoice sync job.
- [ ] Retries with exponential backoff (3 attempts), then alerts ops.
- [ ] **Failure isolation:** ERPNext 500 → invoice stays `Paid`, customer notified, sync queued for retry, no rollback.
- [ ] `erpnext_invoice` reference stored on success.
- [ ] Sync is one-way; correction credit notes (from #15) flow down to ERPNext, not back.

## Blocked by

- #10


===== ./issues/README.md =====

# Issues — Frappe Cloud v2 Billing & Payments

Tracer-bullet vertical slices derived from the [spec](../README.md) and [roadmap](../roadmap.md). Each is independently grabbable and demoable. Publish/grab in dependency order.

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

**Milestones:** **GW** = Gateway Integrations (front-loaded, Phase 1 foundation) · **P1**–**P4** = roadmap phases · **post** = post-launch.

| # | Slice | Type | Blocked by | Milestone |
|---|-------|------|-----------|-----------|
| [01](01-app-scaffold-plan-catalog.md) | App scaffold + Plan catalog + push to Agent Plan Cache | AFK | — | P1 |
| [02](02-gateway-adapter-webhook-spine.md) | Gateway config + adapter interface + Stripe + signature-first webhook | AFK | — | **GW** |
| [24](24-gateway-integration-port-decommission.md) | Port & decommission existing gateway integrations | AFK | 02 | **GW** |
| [08](08-razorpay-upi-mandate.md) | Razorpay adapter + UPI Autopay mandate (cap = tier) | AFK | 02, 07 | **GW** |
| [25](25-paypal-adapter.md) | PayPal adapter | AFK | 02 | **GW** (post) |
| [03](03-agent-event-log-price-lock.md) | Agent event log + push + Central price-lock | AFK | 01 | P2 |
| [04](04-subscription-intent-two-axis-state.md) | Subscription intent + two-axis state | AFK | 01 | P2 |
| [05](05-payment-method-lifecycle-stripe.md) | Payment Method lifecycle (Stripe) | AFK | 02 | P2 |
| [06](06-credit-ledger-wallet.md) | Credit ledger + wallet + concurrency | AFK | — | P2 |
| [07](07-trust-tier-entitlement-token.md) | Trust Tier + Entitlement Token | AFK | 04 | P2 |
| [09](09-postpaid-invoice-generation-fixed.md) | Postpaid two-phase invoice generation (fixed) | AFK | 03, 04 | P3 |
| [10](10-charge-invoice-payment-attempt-webhook.md) | Charge invoice → Payment Attempt → webhook → Paid | AFK | 02, 05, 09 | P3 |
| [11](11-credit-application-waterfall.md) | Credit application at invoice (waterfall + wallet gating) | AFK | 06, 09 | P3 |
| [12](12-metered-billing-usage-meter.md) | Metered billing — Usage Meter (counter/gauge) | AFK | 03, 09 | P3 |
| [13](13-tax-gst-sez-tds-seam.md) | Tax — GST + SEZ; TDS seam | AFK | 09 | P3 |
| [14](14-retry-dunning-suspension.md) | Retry/dunning + staged suspension | AFK | 07, 10 | P3 |
| [15](15-refunds.md) | Refunds — full→source, partial→wallet | AFK | 06, 10 | P3 |
| [16](16-free-trial-cost-report.md) | Free/trial cost_report | AFK | 07, 09 | P3 |
| [17](17-erpnext-async-sync.md) | ERPNext async Sales Invoice sync | AFK | 10 | P3 |
| [26](26-billing-portal-frontend-scaffold.md) | Billing portal frontend scaffold (Frappe-UI) | AFK | 01 | P4 |
| [18](18-customer-dashboard-forecast.md) | Customer dashboard + forecast | AFK | 26, 09, 11, 12 | P4 |
| [19](19-admin-dashboard.md) | Admin dashboard | AFK | 26, 09, 16 | P4 |
| [20](20-notification-suite.md) | Notification suite (sole sender) | AFK | 10, 14 | P4 |
| [21](21-reconciliation-job.md) | Reconciliation job | **HITL** | 10 | P4 |
| [22](22-security-load-hardening.md) | Security + load hardening | AFK | 10 | P4 |
| [23](23-migration-tooling.md) | Migration tooling (gradual per-team) | **HITL** | 09, 17 | post |

## Gateway Integrations milestone (GW)

The gateway layer is a first-class, front-loaded workstream — it's what this project rewrites away from `frappe/payments` (see [misc.md](../misc.md)). Members:

- **#02** — adapter interface + secure webhook spine + Stripe *(Phase 1 foundation; prerequisite for everything that moves money)*.
- **#24** — port the existing Stripe/Razorpay integrations into the adapter model and decommission the old `frappe-payments` path *(Phase 1 foundation)*.
- **#08** — Razorpay + UPI Autopay mandate; the adapter is foundation, the mandate-ceiling-=-tier wiring completes alongside **#07** (its blocker).
- **#25** — PayPal *(to-follow; post-launch, per spec)*.

## Notes

- **HITL:** #21 (reconciliation terminal-state model is an open design item), #23 (deferred ~6mo; needs migration sign-off). All others AFK — the 22 design decisions are settled.
- Multi-currency credits (future) is folded into #06 as a noted extension, not a separate slice.


===== ./issues/22-security-load-hardening.md =====

# 22 — Security + load hardening

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [testing.md](../testing.md)

## What to build

The hardening pass that proves v1's failure classes are closed. Security: webhook signature/replay tests, role/permission enforcement (Agent key can't hit customer/admin endpoints), no raw SQL interpolation (QueryBuilder throughout; `bandit` + `grep`). Load: a 1000-subscription invoice run and concurrent webhook flood (`locust`) demonstrating parallel two-phase generation holds and no duplicate payment attempts.

## Acceptance criteria

- [ ] Webhook without valid signature → 400, zero DB records; processed-event replay → 200, no side effects.
- [ ] Agent API key on a customer/admin endpoint → 403.
- [ ] Static analysis confirms no raw SQL string interpolation.
- [ ] 1000-subscription two-phase run completes with no invoice processed twice and no duplicate attempts.
- [ ] Concurrent webhook flood handled without duplicate state transitions.

## Blocked by

- #10


===== ./issues/10-charge-invoice-payment-attempt-webhook.md =====

# 10 — Charge invoice → Payment Attempt → webhook → Paid

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments.md](../payments.md), [invoicing.md](../invoicing.md)

## What to build

Close the money loop. When an invoice is `Open` with amount due, create a `Payment Attempt` (idempotency_key = its name), charge via the adapter, and **mark `Paid` only on webhook confirmation** — never on the gateway API response. Each attempt is a new record. The webhook (from #02) drives the `Open → Paid` transition and the ledger debit.

## Acceptance criteria

- [ ] `Payment Attempt` DocType (separate) with unique idempotency_key, status `initiated/authorised/captured/failed/refunded`.
- [ ] `open_and_collect` (or `pay_invoice`) initiates a charge with the idempotency key; never marks paid on the API response.
- [ ] Inbound webhook transitions the invoice to `Paid` and records `amount_paid`.
- [ ] **Concurrent `pay_invoice` on one invoice → only one attempt reaches `captured`.**
- [ ] Full Stripe test-mode cycle: open → charge → webhook → `Paid`, notification logged.

## Blocked by

- #02
- #05
- #09


===== ./issues/19-admin-dashboard.md =====

# 19 — Admin dashboard

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md)

## What to build

The admin surface (`Billing Admin` role, Frappe internal). Cost-Explorer-style aggregate-then-drill-down: Total MRR/Spend → by Cluster → by Service → by Plan → by Team → by Invoice → line items. Plus panels: Payment Analytics (attempt→success by gateway, failure reasons), Overdue Aging (0–7/8–15/15–30/30d+), Credit Utilisation, **Free/Trial Subsidy** (true cost via cost_report), Gateway Config, Team Lookup, Price Management. All endpoints require `Billing Admin`; customers get 403.

Built as **Frappe-UI** routes inside the portal scaffold (#26) — Vue 3 + `frappe-ui`, using the `frappe-ui/tailwind` preset for press's exact colours/components (no bespoke palette); drill-down tables via `ListView`, charts via `vue-echarts`.

## Acceptance criteria

- [ ] Summary + cluster/team drill-down endpoints; all gated to `Billing Admin` (customer → 403).
- [ ] Payment analytics (success rate + failure reasons by gateway) and overdue aging buckets.
- [ ] Free/trial subsidy panel sums cost_report invoices by cluster and plan.
- [ ] Team lookup returns any team's subscriptions, invoices, payment history, credit balance.
- [ ] Price management updates plan price without affecting existing locks.
- [ ] UI is Frappe-UI on the #26 scaffold, using only the `frappe-ui` preset tokens (press parity — no custom palette).

## Blocked by

- #26
- #09
- #16


===== ./issues/01-app-scaffold-plan-catalog.md =====

# 01 — App scaffold + Bundle/Add-on catalog + push to Agent Plan Cache

**Type:** AFK · **Milestone:** Phase 1 · **Spec:** [plans-and-pricing.md](../plans-and-pricing.md), [subscription-agent.md](../subscription-agent.md)

## What to build

Scaffold the two apps (`press_billing` on Central, `press_billing_agent` per cluster) and deliver the catalog end-to-end. The catalog is two DocTypes: a **Plan (bundle)** — one immutable identity with a flat **rate per (region, currency)** and a spec-only **includes** composition — and an **Add-on** (per-unit, same rate shape). A bundle's rate **is** its price; it is never `quantity × rate`. Central resolves the rate for a team's currency and the resource's cluster (most-specific region match, else global), and pushes the bundle identity + includes + full rate set to a cluster Agent's `Plan Cache`. Rates are mutable on Central (a rate change is editing a `Plan Rate` row or adding a region override — never a new plan).

## Acceptance criteria

- [ ] Both apps scaffold and install; `Plan` (with `Plan Rate` + `Plan Includes` child tables) and `Add-on` (with `Add-on Rate`) DocTypes exist with CRUD.
- [ ] A bundle holds **multiple currency rates without duplicating the plan** (e.g. USD 40 + INR 3200), and supports a **per-region override** row; `quantity`/`unit` on includes carry **no price**.
- [ ] Rate resolution picks the most-specific cluster match for a currency, else the global (blank-cluster) row; a rate edit does not create a new plan.
- [ ] `push_plans_to_agent` syncs bundle identity + includes + rate set into a test Agent's `Plan Cache`.
- [ ] Agent `Plan Cache` is read-only locally and carries `rates_json` + `includes_json` for display only (no computation).
- [ ] A live `get_plan_pricing(plan, currency, cluster)` read endpoint returns the resolved current Central rate.

## Blocked by

None - can start immediately.


===== ./issues/08-razorpay-upi-mandate.md =====

# 08 — Razorpay adapter + UPI Autopay mandate

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [payments.md](../payments.md), [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

A Razorpay adapter (card + UPI Autopay mandate) passing the same `GatewayAdapter` contract suite as Stripe, plus the mandate lifecycle. A mandate is created with **`max_amount` = the team's trust-tier cap**, so a bill can never exceed it. A tier promotion that raises the cap triggers **mandate re-authorisation** (customer re-consent); until re-consent the team is held at the old ceiling. Cards are exempt (off-session, any amount).

## Acceptance criteria

- [ ] Razorpay adapter passes the shared contract suite (charge, refund, valid/invalid signature).
- [ ] UPI mandate setup sets `max_amount` = current trust-tier cap.
- [ ] Tier promotion above the mandate ceiling emits a re-authorisation prompt; team functionally held at old cap until re-consent.
- [ ] Razorpay webhooks flow through the signature-first receiver (#02).
- [ ] Integration test: add card / mandate in test mode → validate → active.

## Blocked by

- #02
- #07


===== ./issues/13-tax-gst-sez-tds-seam.md =====

# 13 — Tax — GST + SEZ; TDS withholding seam

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [tax.md](../tax.md)

## What to build

The three-mechanic tax block on invoices: **additive output tax** (GST/VAT → `total`), **zero-rating with reason** (SEZ-LUT/export → tax 0 + compliance reason), and the **withholding seam** for TDS. Settlement targets `expected_collection = total − tds_amount` with `tds_amount = 0` at launch, and `paid ⇔ amount_paid ≥ expected_collection`. GST + SEZ ship fully; the TDS seam lands now so adding TDS later (certificate reconciliation) is additive, not a rewrite.

## Acceptance criteria

- [ ] Invoice tax block: output_tax_*, zero_rating_reason, tds_* fields.
- [ ] GST invoice: `total = subtotal + output_tax`; customer charged the gross.
- [ ] SEZ/export: tax 0 **with a stored reason code** (not "none").
- [ ] `expected_collection = total − tds_amount` (0 at launch); `paid` defined against expected_collection.
- [ ] Mandate ceiling uses `total` (gross), not the reduced amount.

## Blocked by

- #09


===== ./issues/03-agent-event-log-price-lock.md =====

# 03 — Agent event log + push + Central price-lock

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [subscription-agent.md](../subscription-agent.md), [plans-and-pricing.md](../plans-and-pricing.md)

## What to build

The source-of-truth spine. The Agent records an immutable `Plan Subscription Log` row per plan change, each carrying a stable `resource_id` and the `shown_rate` (+ `currency`) displayed at provision time, and pushes it to Central (`receive_usage_events`). On receiving a new `(resource_id)` segment, Central writes an **append-only price-lock row keyed by `resource_id`**, capturing the locked rate (= `shown_rate`) and currency, and logging a discrepancy if it differs from Central's currently-resolved rate. Push is on-demand-primary with a daily catch-up; events are marked synced only on Central ack.

## Acceptance criteria

- [ ] `Plan Subscription Log` (Agent): immutable, append-only, with `resource_id`, `shown_rate`, event_type, effective_from/to.
- [ ] Push to Central is idempotent; events marked `synced_to_central` only after ack; unsynced retried daily.
- [ ] Central writes an append-only price-lock keyed by `resource_id` = `shown_rate`; a destroy+reprovision yields a new lock.
- [ ] A `shown_rate` ≠ Central's current price is locked anyway and logged as a discrepancy.
- [ ] Locked price is read by billing; live plan price changes do not alter existing locks.

## Blocked by

- #01


===== ./issues/06-credit-ledger-wallet.md =====

# 06 — Credit ledger + wallet + concurrency

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [credits.md](../credits.md)

## What to build

An append-only `Credit Ledger Entry` that is the customer's prepaid wallet. Balance is always computed from the ledger sum — never stored as a scalar on Team. Support top-up purchase (credit entry) and the `running_balance` denormalization. Credit application uses `SELECT ... FOR UPDATE` on the team's latest ledger entry to prevent the v1 concurrent double-spend race. (Multi-currency credits and expiry mechanics are noted future extensions, out of scope here.)

## Acceptance criteria

- [ ] `Credit Ledger Entry` (append-only) with entry_type, amount (positive), running_balance, reference.
- [ ] Balance = ledger sum; no scalar balance field on Team.
- [ ] Top-up purchase + `get_balance` API.
- [ ] **Concurrency test:** 10 threads applying credits → correct final balance, no negative, no duplicate debit, running_balance matches cumulative sum.
- [ ] Credit application takes a `FOR UPDATE` lock on the latest entry.

## Blocked by

None - can start immediately.


===== ./issues/21-reconciliation-job.md =====

# 21 — Reconciliation job (charged-but-never-webhooked)

**Type:** HITL · **Milestone:** Phase 4 · **Spec:** [payments.md](../payments.md), [roadmap.md](../roadmap.md)

## What to build

A daily job that scans ambiguous payment states against gateway APIs and resolves the **"charged-at-gateway-but-never-webhooked"** terminal state — without double-charging (idempotency key) or leaving revenue uncollected. **HITL:** the precise terminal-state model is an open design item and needs a decision before/with implementation (what states are terminal, how a resolved-by-reconciliation payment is recorded vs a webhook-confirmed one, alerting thresholds).

## Acceptance criteria

- [ ] **Decision recorded** for the terminal-state model (resolve the open item) before merge.
- [ ] Daily scan queries the gateway for attempts stuck in ambiguous states.
- [ ] A charge confirmed at the gateway but missing a webhook is reconciled to `Paid` idempotently (no double-charge).
- [ ] An attempt with no gateway record is safely failed/retried, not left dangling.
- [ ] Ops alerted for states the job cannot resolve automatically.

## Blocked by

- #10


===== ./issues/16-free-trial-cost-report.md =====

# 16 — Free/trial cost_report

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [subscriptions.md](../subscriptions.md), [invoicing.md](../invoicing.md)

## What to build

Free/trial as the **entry trust tier**, not a separate path. The whole pipeline (provisioning, event log, metering, price-lock, line-item math) runs identically; Central branches at exactly one point — at invoice generation it emits `invoice_type = cost_report` (compute, **don't charge**) for entry-tier teams. This makes the subsidy figure a true cost. Trial is single-cluster; conversion flips the tier (cost_report → billable, resources keep running); expiry reuses the suspend directive.

## Acceptance criteria

- [ ] Entry-tier team provisions within trial cap (single cluster); usage flows through the normal pipeline.
- [ ] Invoice generated as `invoice_type = cost_report` — computed but **not charged**.
- [ ] Convert-to-paid flips tier; subsequent invoices are `billable`; resources keep running.
- [ ] Trial expiry unconverted → suspend directive (stop, then terminate) via #14 machinery.
- [ ] Subsidy total (for the dashboard) sums cost_report invoices accurately.

## Blocked by

- #07
- #09


===== ./issues/18-customer-dashboard-forecast.md =====

# 18 — Customer dashboard + forecast

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md), [invoicing.md](../invoicing.md)

## What to build

The self-service customer portal (`Billing User` role), strictly scoped to the logged-in team via permission query — no cross-team data ever returned. Surfaces: current-month forecast (projected bill vs credit balance, driven by the running-total meter rows + fixed accrual), active subscriptions, invoice history + detail (line items, status, PDF), payment methods, credit balance & ledger, notification preferences.

Built as **Frappe-UI** routes inside the portal scaffold (#26) — Vue 3 + `frappe-ui`, using the `frappe-ui/tailwind` preset for press's exact colours/components (no bespoke palette). Screens follow the billing wireframes ([central-spec wireframes#billing](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing)): Billing Overview (prepaid wallet vs postpaid outstanding variants), Invoice List, Invoice Detail, Top-Up dialog, Pay-Invoice dialog, Billing Settings.

## Acceptance criteria

- [ ] All customer endpoints auto-scoped to the caller's team; passing another team's name is ignored.
- [ ] Forecast API returns projected_total, credit_balance, shortfall, days_remaining, line_items.
- [ ] Forecast reads live metered running-totals + fixed accrual.
- [ ] Invoice history/detail with PDF download; payment methods; credit ledger view.
- [ ] Admin-only fields (gateway config, success rates, waive) never exposed here.
- [ ] UI is Frappe-UI on the #26 scaffold, using only the `frappe-ui` preset tokens (press parity — no custom palette); screens match the billing wireframes.

## Blocked by

- #26
- #09
- #11
- #12


===== ./issues/05-payment-method-lifecycle-stripe.md =====

# 05 — Payment Method lifecycle (Stripe)

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [payments.md](../payments.md)

## What to build

The `Payment Method` lifecycle on Stripe: a customer initiates setup (SetupIntent → client secret), confirms on the frontend, and the method is validated by a **micro-charge (₹1/$0.50) captured and immediately refunded** before moving to `active`. Support set-default and delete. Methods are separate DocTypes (not children of Team).

## Acceptance criteria

- [ ] `Payment Method` DocType (separate) with status `pending_validation → active / failed`, `expired` via monthly scheduler.
- [ ] `initiate_payment_method_setup` returns a client secret; `confirm_payment_method` runs the micro-charge + refund.
- [ ] Method becomes `active` only on a successful micro-charge; failure → `failed`.
- [ ] Set-default and delete work; exactly one default per team.
- [ ] Stripe test-mode integration test covers add → validate → active.

## Blocked by

- #02


===== ./issues/07-trust-tier-entitlement-token.md =====

# 07 — Trust Tier + Entitlement Token

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [provisioning-and-entitlements.md](../provisioning-and-entitlements.md)

## What to build

The entitlement system. A `Trust Tier` per team (computed by Central from billing history) defines the cap; an `Entitlement Token` is the signed, short-lived artifact Central issues and the cluster verifies **locally/offline**. The token carries a structured cap (`max_spend`, `max_resource_count`, `allowed_plans`, `allowed_resource_types`, per-cluster slices). The cluster enforces the cap on provisioning; when the token is expired **and** Central is unreachable, it denies *new* provisions but keeps running ones alive. Auto-promotion by declarative rule (`K paid months + ≥ $X`); demotion limits growth only.

## Acceptance criteria

- [ ] `Trust Tier` + `Entitlement Token` DocTypes; Central issues a signed token; Agent verifies signature offline (no live call).
- [ ] Cluster allows provision under cap, denies over cap; multi-cluster slices sum to ≤ team total.
- [ ] Expired token + Central unreachable → deny new provisions, running resources untouched.
- [ ] Auto-promotion rule fires on history; demotion blocks growth without stopping running resources.
- [ ] Provisioning check uses *projected run-rate*; promotion check uses *historical paid* (two measures, not conflated).

## Blocked by

- #04


===== ./issues/04-subscription-intent-two-axis-state.md =====

# 04 — Subscription intent + two-axis state

**Type:** AFK · **Milestone:** Phase 2 · **Spec:** [subscriptions.md](../subscriptions.md)

## What to build

Central's `Subscription` as the customer's *intent/contract* (not billing truth), plus `Subscription Change` as append-only history. Implement the **two-axis state model**: `account_standing` (`current/past_due/suspended`, Central-owned) is distinct from operational state (`running/stopped/terminated`, Agent-owned) — never one enum. Customer APIs create/change/cancel intent; each transition writes a `Subscription Change`. The create endpoint records intent only; the authoritative event is born at the cluster (#03).

## Acceptance criteria

- [ ] `Subscription` (intent) + `Subscription Change` (separate DocType, append-only) exist.
- [ ] `account_standing` is a Central-owned axis; no single combined operational/financial enum anywhere.
- [ ] Create / change-plan / cancel each write a `Subscription Change`; history is not directly editable.
- [ ] Invalid standing transitions raise `InvalidTransition` (exhaustively tested).
- [ ] Create endpoint is documented/behaves as intent; reconciliation against the Agent event is wired.

## Blocked by

- #01


===== ./metering.md =====

# Metering

## Purpose

Capture usage-based consumption (transfer, snapshot) for billing and forecasting **without** recreating v1's 10M-records problem.

## Concepts

- Metered resources are billed by *quantity*, not duration — the plan-change event log alone can't carry them. Hence a second stream: the **Usage Meter**.
- **Two meter types aggregate by opposite math:**
  - **counter** (e.g. transfer GB) — billed on the **sum** of deltas.
  - **gauge** (e.g. snapshot GB) — billed on the **integral over time** (GB-days).
- **Edge aggregation** — the Agent reads the cluster's raw metrics, rolls them up locally, and ships only the aggregate. Central never stores raw samples. This is what keeps v2 off v1's 10M path.

## Data Model

**Usage Meter** (Agent DocType)

| Field | Type | Notes |
|-------|------|-------|
| resource_id | Data | Same key as the price-lock on Central |
| meter_type | Select | counter / gauge |
| period_start / period_end | Datetime | |
| quantity | Float | Summed deltas (counter) or GB-days (gauge) |
| unit | Data | GB, etc. |
| last_sampled_at | Datetime | |
| idempotency_key | Data | `(resource_id, meter_type, period)` — a re-push **replaces**, never adds |
| synced_to_central | Check | |

## Rollup & forecast

- One **rollup row per `(resource_id, meter_type, billing_period)`** at close → Central receives ~one metered line per resource per meter per month, not per-day-per-resource.
- One **running-total row per `(resource_id, meter_type, current_period)`**, overwritten daily, gives the live forecast ([invoicing.md](invoicing.md) §forecast); it collapses to the final figure at close. Bounded row count.
- Idempotent: a re-push after an Agent outage replaces the period figure (recompute), never double-counts.

## Billing

Metered bill = `max(0, quantity − locked_allowance) × locked_rate`. Rate and allowance are **locked at provision** in the same price-lock row as fixed prices (see [plans-and-pricing.md](plans-and-pricing.md)), so metered pricing is grandfathered identically.

## Invariant

> Plan Subscription Log **+** Usage Meter rollups are the data Central needs to bill. The event log alone suffices only for *fixed* resources; *metered* resources additionally require the rollups.

## Notes

- Future meters (API call count, request volume) are additive — the counter/gauge model and the pipeline already exist. See [roadmap.md](roadmap.md).


===== ./subscriptions.md =====

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

- The create endpoint records intent; the real subscription event (with `resource_id`, `shown_rate`) is born at the cluster and reported by the Agent. Central reconciles intent against the Agent event.
- Enforcement (suspension) is covered in [provisioning-and-entitlements.md](provisioning-and-entitlements.md).
