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

# 3. Seed a rich demo team end-to-end
bench --site billing.local execute press_billing.demo.seed

# 4. Run the server
bench start          # or:  ! bench start
```

> Gateway SDKs: `stripe>=15` + `razorpay` are declared in
> `press_billing/pyproject.toml` (the old `stripe 2.56` breaks on Python 3.14).
> PayPal needs no SDK (pure REST). No live gateway credentials are required for
> the demo — charges/refunds/webhooks are exercised in test mode.

---

## 4. Demo walk-through

### 4a. The data model — Desk **Billing** workspace

Open **`http://billing.local:8000/app/billing`** (log in as Administrator).

The seed builds a `demo` team showing the whole pipeline in real records:

- **Invoices** → `INV-2026-05-…` **Paid** ₹3,776 (₹3,200 + 18% GST) and
  `INV-2026-06-…` **Open** ₹5,018.93 — open the June invoice to see **two
  day-weighted fixed line items** (11 days @ ₹3,200 + 19 days @ ₹4,800 from a
  mid-month plan change) **plus a metered** transfer-overage line **plus GST**.
- **Price Lock** → the grandfathered rate segments behind those line items.
- **Credit Ledger** → a ₹5,000 top-up.
- **Payment Methods** → an active Visa ····4242.
- **Catalog & Config** → Plan / Add-on / Tax Profile / Trust Tier / Gateway.

> Talking point: the invoice is *computed* from the Agent's event log joined to
> Central's locked prices — not from a stored "amount". Day-weighting,
> new-plan-wins-the-day, and the max(1-day) floor are all visible in the lines.

### 4b. The customer portal — **Frappe-UI** SPA

Open **`http://billing.local:8000/billing`** (press-parity UI; the `frappe-ui`
tailwind preset is the sole colour source — no bespoke palette).

- **Overview** — current-month **forecast** (projected bill vs credit balance,
  shortfall, days remaining) + active subscriptions.
- **Invoices** — history with status badges.
- **Payment Methods** — cards on file (no gateway secrets ever leave the server).
- **Credits** — wallet balance + ledger.

Every endpoint is **auto-scoped to the caller's team** — passing another team's
name is rejected, not widened.

### 4c. The admin dashboard

Open **`/billing/admin`** (gated to the `Billing Admin` role; a customer or the
Agent key gets 403). Total billed / collected / outstanding, spend by cluster,
and the **free/trial subsidy** (true cost of non-paying teams).

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

---

## 5. Verify it

```bash
cd /Users/frappe/workspace-2/dev-bench
bench --site billing.local run-tests --app press_billing        # 215 tests
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
- Single billing currency per team (multi-currency per invoice is future).
