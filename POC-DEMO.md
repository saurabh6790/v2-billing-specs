# Frappe Cloud v2 — Billing & Payments POC

A working proof-of-concept of the v2 billing redesign, built as **two Frappe
apps** and driven entirely test-first. This doc is the demonstration script:
what it is, how to stand it up, and a guided walk-through of the flows.

---

## 1. What this is

A ground-up rebuild of Frappe Cloud billing as a clean **Central + regional
Agent** split, fixing v1's structural failure classes rather than patching them.

| v1 problem | v2 fix (demonstrable here) |
|---|---|
| Prepaid credits as a scalar field → negative, unauditable balances | Append-only **Credit Ledger** + per-team **Credit Wallet** lock anchor; balance = ledger sum, `FOR UPDATE` concurrency-safe |
| 10M+ usage rows/day | **Edge-aggregated** metering on the Agent; Central stores bounded rollups only |
| "Pay Now" on locked invoices, no state machine | Invoice state machine `Draft→Open→Paid/Overdue/Waived/Cancelled`; **Paid only on webhook** |
| Webhook signature checked *after* DB lookup (enumeration bug) | **Signature-first** receiver; verify before any content-keyed DB access |
| Credit double-spend under concurrency | `FOR UPDATE` ledger booking — proven by a 10-thread test |
| Thousands of synchronous ERPNext syncs | **Async, one-way, failure-isolated** Sales Invoice sync with backoff |
| Single blocking 1st-of-month invoice loop | **Two-phase** generation (28th draft / 1st open), parallel, no double-processing |
| Billed for things that weren't running | Billing computed from the **Agent event log** (what actually ran) × **locked price** |

**Two apps**

- **`press_billing`** (Central — money SOR): plans/pricing, gateways, payment
  methods, subscriptions (intent), invoices, credit ledger, trust tiers,
  entitlement tokens, tax, dunning, refunds, reconciliation, notifications,
  dashboards. The only component that talks to gateways.
- **`press_billing_agent`** (regional cluster — "what ran" SOR): immutable event
  log, metered rollups, offline entitlement-token enforcement. No money logic.

---

## 2. What's built (25 of 26 slices)

| Area | Slices | Key modules |
|---|---|---|
| Catalog & sync | #01 plans/bundles+add-ons, region×currency rates | `plans`, `pricing`, `sync` |
| Gateways | #02 adapter+webhook spine, #24 Stripe/Razorpay port, #25 PayPal | `gateways/` |
| Event log & grandfathering | #03 Agent log + Central price-lock | `events`, `pricelock` |
| Subscriptions | #04 intent + two-axis state | `subscriptions` |
| Payment methods | #05 cards (SetupIntent+micro-charge), #08 UPI mandate=tier cap | `payments`, `mandates` |
| Credits | #06 ledger+wallet, #11 credits-then-card waterfall + wallet gating | `credits`, `settlement` |
| Entitlements | #07 Trust Tier + Ed25519 signed token + offline enforcement | `entitlements`, `signing` |
| Invoicing | #09 two-phase generation, #10 charge→attempt→webhook→Paid | `billing`, `charges` |
| Metering | #12 counter/gauge edge aggregation + metered line items | `metering` |
| Tax | #13 GST + SEZ zero-rating + TDS withholding seam | `tax` |
| Lifecycle | #14 dunning→suspend→terminate, #15 refunds, #16 trial cost_report | `dunning`, `refunds`, `trials` |
| Integration | #17 async ERPNext sync, #21 reconciliation | `erpnext_sync`, `reconciliation` |
| Hardening | #22 roles + webhook flood + SQL scan + 100-sub run | `security` |
| Notifications | #20 sole-sender suite | `notifications` |
| Dashboards | #26 Frappe-UI scaffold, #18 customer, #19 admin | `dashboard`, `admin`, `dashboard/` SPA |

**Deferred:** #23 migration tooling (revisit if the POC gets a go-ahead).

**Tests:** `press_billing` **215**, `press_billing_agent` **34** — all
integration tests, TDD throughout, including real multi-threaded concurrency
proofs (credit double-spend, parallel invoice open, concurrent webhook flood,
concurrent pay→one-capture).

---

## 3. Stand it up

**Bench:** `/Users/frappe/workspace-2/dev-bench` (Frappe 17-dev, Python 3.14).
**Sites:** `billing.local` (Central) + `agent.local` (Agent), both resolve to
127.0.0.1; the dev web server resolves by Host header.

```bash
cd /Users/frappe/workspace-2/dev-bench

# 1. Migrate both apps
bench --site billing.local migrate
bench --site agent.local  migrate

# 2. Build the customer/admin SPA (Frappe-UI)
cd apps/press_billing/dashboard && yarn install && yarn build && cd -

# 3. Seed demo data covering every scenario (both sites)
bench --site billing.local execute press_billing.demo_scenarios.seed_all
bench --site agent.local   execute press_billing_agent.demo.seed

# 4. Run the server
bench start          # or:  ! bench start
```

**Catalog** (Central): **3 clusters** — `in-mumbai` (India), `eu-frankfurt` (EU),
`me-dubai` (Middle East) — and **5 plan sizes** (1→16 vCPU), each priced **per
cluster × currency** (INR / EUR / USD). The same five plans are offered in every
region, so a team paying in one currency can subscribe to **any** region. **4
trust tiers** (`t0` trial → `t3` enterprise) with rising spend caps and promotion
thresholds. One metered **Bandwidth Overage** add-on, priced per GB per currency.

A team runs **multiple instances** — droplet/EC2-style: any plan in any region,
capped by its tier — but **bills in a single currency** wherever they run. Each
region's instances are grouped into **one invoice per region per month** (multiple
day-weighted line items); a team thus has one Subscription and one invoice stream
per region it occupies.

**Ten teams** (Central) — spread across tiers, currencies, regions and states,
all navigable from the Desk **Billing** workspace, the `/billing` portal team
switcher, or `get_team_billing`. Higher tiers carry ~10 months of paid invoices
**per region**:

| Team | Tier | Currency | Instances (region · plan) | Demonstrates |
|---|---|---|---|---|
| `acme-corp` | t3 | INR | in·8vcpu + in·2vcpu, eu·4vcpu, me·1vcpu | **Grandfathering** — in·8vcpu billed at locked ₹9,360 vs ₹12,000 catalog; 4 instances / 3 regions |
| `globex` | t3 | EUR | eu·16vcpu + eu·4vcpu, in·2vcpu | Enterprise, €-billed, multi-region, 10-month history |
| `initech` | t2 | USD | me·4vcpu + me·1vcpu, eu·2vcpu | Growth tier, $-billed, 3 instances |
| `umbrella` | t2 | INR | eu·4vcpu, in·2vcpu | **Cross-region** — INR-billed team running in **EU + India** |
| `wayne-ent` | t2 | INR | me·2vcpu, in·1vcpu | **Cross-region** INR → ME + India, on a **Razorpay UPI mandate** |
| `stark-ind` | t1 | INR | in·2vcpu | Dunning — `past_due`, 3 failed retries, still running |
| `cyberdyne` | t1 | EUR | eu·2vcpu | Escalated — `suspended` + cap-0 suspend token |
| `hooli` | t1 | INR | in·1vcpu | Prepaid credits — under-funded wallet → **shortfall alert** |
| `soylent` | t1 | USD | me·2vcpu | Refund — partial overcharge → wallet |
| `piedpiper` | t0 | INR | in·1vcpu | Free trial — entry tier, computed not charged |

Each active team's first instance carries a **metered transfer overage** on the
current month, so an open invoice shows fixed plan line(s) **and** an overage line.

**Agent records** (`agent.local`) mirror the Central teams: the pushed **Plan
Cache** (5 plans), an immutable **Plan Subscription Log** per resource (one
re-provisioned/`changed` segment, some unsynced), per-resource **Usage Meters**
feeding the overage, **Sync Logs**, and **Entitlement Tokens** whose
`enforcement_state` shows the key distinction — `acme-corp`/`globex` → **running**,
`cyberdyne` → **stopped** (suspend token), `stark-ind` → **running** despite an
**expired** token (a stale token never stops a customer's resources).

> Gateway SDKs: `stripe>=15` + `razorpay` are declared in
> `press_billing/pyproject.toml` (the old `stripe 2.56` breaks on Python 3.14).
> PayPal needs no SDK (pure REST). No live gateway credentials are required for
> the demo — charges/refunds/webhooks are exercised in test mode.

---

## 4. Demo walk-through

### 4a. The data model — Desk **Billing** workspace

Open **`http://billing.local:8000/app/billing`** (log in as Administrator).

The seed lands the admin on `acme-corp` (a t3 enterprise team) with the whole
pipeline in real records:

- **Invoices** → one invoice stream **per region** (acme runs in 3), each with ~10
  months of **Paid** invoices + an **Open** June invoice. Open the June **in-mumbai**
  invoice (₹14,773.60) to see acme's two India instances grouped as **two fixed
  plan lines** ("Pro · 8 vCPU / 16 GB" @ the **grandfathered** ₹9,360 + "Basic ·
  2 vCPU / 4 GB" @ ₹3,000, 30 days each) **plus a metered Bandwidth Overage** line
  ("200 GB over 800 GB included" @ ₹0.80/GB) **plus 18% GST**. Each line reads in
  plain language — plan/add-on **titles**, the included allowance, what drove it.
- **Price Lock** → acme's lock carries `discrepancy = 1`: `locked_rate` ₹9,360 vs
  `central_rate` ₹12,000 — the grandfathering made visible.
- **Credit Ledger / Payment Methods / Catalog & Config** → wallet ledger, the
  active card or UPI mandate, and the 5-plan × 3-cluster × 3-currency catalog.

> Talking point: the invoice is *computed* from the Agent's event log joined to
> Central's locked prices — not from a stored "amount". The grandfathered rate
> rides the price-lock forever even as the catalog price rises.

### 4b. The customer portal — **Frappe-UI** SPA

Open **`http://billing.local:8000/billing`** (press-parity UI; the `frappe-ui`
tailwind preset is the sole colour source — no bespoke palette).

A **team switcher** (top of the sidebar) flips between all ten teams for the demo,
and a **customer ⇄ admin** toggle swaps the two shells. Amounts render in the
team's own currency (₹ / € / $) throughout — switch to `globex` to see everything
in **EUR**, `initech` in **USD**.

- **Overview** — trust tier / cap / standing, **instances across regions**, billing
  currency, a one-line **This-Month projection** (→ Forecast), a **credit-shortfall
  alert** when a prepaid wallet can't cover the projection (see `hooli`), and
  **mode-aware** payment details (postpaid → card, prepaid → credits).
- **Forecast** *(own tab)* — the month-end projection itemised: each **service +
  metered overage** (plan titles, not slugs) with usage, subtotal + tax, and (for
  prepaid) wallet balance vs shortfall — in the team's currency.
- **Invoices** — history with status badges (`current`→**Active**, `past_due`→**Past
  Due**); click through to the itemised dialog (per-region instances + overage).
- **Payment Methods** — cards/mandates on file; remove or set-default.
- **Credits** — wallet balance + ledger, in the team's currency.

Every endpoint is **auto-scoped to the caller's team** — passing another team's
name is rejected, not widened.

### 4c. The admin dashboard

Open **`/billing/admin`** (gated to the `Billing Admin` role; a customer or the
Agent key gets 403). Sidebar: **Overview / Teams / Analytics**.

- **Overview** — MRR (₹73,050, **INR-normalised** across currencies), teams,
  on-time vs delinquent, suspended, payment failures.
- **Teams** — per-team tier, standing, resources, MRR, invoices; click a team to
  drill into its subscriptions / invoices / payments.
- **Analytics** — drill-downs the demo asked for: **payment-failure** list (which
  invoice, reason), **delinquent** teams + outstanding, **cluster-wise** and
  **plan-wise** consumption (INR run-rate), **trial subsidy** (converted vs not),
  and **conversion rate** (90% — 9 paid of 10).

> All run-rate/MRR figures are normalised to INR via each plan's INR catalog rate,
> so EUR/USD regions are comparable on one axis (cluster totals = plan totals = MRR).

### 4d. Flows worth narrating (each backed by tests)

- **Grandfathering** — admin changes a plan's rate (`admin.update_plan_rate`);
  existing price-locks are untouched, only new provisions lock the new rate.
- **Credits-then-card waterfall** — at invoice open, credits apply first, the
  remainder is charged to the card; credits-only teams are gated by
  `min(tier cap, wallet)`.
- **Dunning → suspend → terminate** — Day 1/3/7 retries → Overdue/past_due
  (still running) → Day-14 suspend directive on the entitlement-token channel →
  the Agent *stops* the resource; Central being unreachable never stops it.
- **Reconciliation** — a charged-but-never-webhooked payment is reconciled to
  Paid from gateway truth, read-only, idempotently (no double charge).
- **Trial = entry tier** — entry-tier invoices are `cost_report` (computed, not
  charged); convert-to-paid flips them to `billable` with resources untouched.
- **Refunds** — full dispute → source (invoice stays Paid); partial overcharge →
  wallet credit applied next cycle.

### 4e. The Agent operator dashboard

Open **`http://agent.local:8000/cluster`** — a press-style operator view over the
Agent's local state (same Frappe-UI design language): **Overview**, **Event Log**
(run segments + locked rate + sync state), **Usage Meters** (counter/gauge),
**Plan Cache**, **Entitlements** (enforcement: running / stopped / terminated),
and **Sync Log**. This is the cluster-side mirror of the Central teams.

---

## 5. Verify it

```bash
cd /Users/frappe/workspace-2/dev-bench
bench --site billing.local run-tests --app press_billing        # 222 tests
bench --site agent.local   run-tests --app press_billing_agent  #  34 tests
```

Highlights: 10-thread credit double-spend prevention, 10-worker parallel invoice
open (no double-processing), concurrent webhook flood (exactly one stored), full
Stripe test-mode open→charge→webhook→Paid cycle, signature-first webhook (400 +
zero DB writes on a bad signature), and offline Ed25519 token verification on the
Agent.

---

## 6. Known limitations (POC scope)

- The SPA is **build-verified** (`yarn build` passes, press-parity preset) but
  not browser/E2E-tested here.
- ERPNext sync, gateway charges, and webhooks run against **mocked/test-mode**
  endpoints — no live credentials wired.
- **Migration tooling (#23)** is deferred pending a go-ahead.
- Each team bills in **one** currency (the catalog is multi-currency across teams:
  INR / EUR / USD, with INR-normalised admin run-rates). Prepaid credit wallets
  are INR-denominated.
