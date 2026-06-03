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
| **#16** | Free/trial `cost_report` (entry trust tier; compute-don't-charge; convert/expire) | done |
| **#13** | Tax — GST + SEZ zero-rating + TDS withholding seam (`Tax Profile` + invoice tax block) | done |
| UI specs | Pinned dashboards (#18/#19) to **Frappe-UI** + press `frappe-ui/tailwind` preset; added **#26** portal scaffold | done (spec only) |

Test counts: **press_billing 143**, **press_billing_agent 29** (run `bench --site <site> run-tests --app <app>`).

## Git branch state (no remote; local stacked branches, NOT merged)

`press_billing` branches (each stacked on the previous):
- `issue-01-app-scaffold-plan-catalog` → `issue-02-gateway-adapter-webhook-spine` → `redesign-bundle-addon-pricing` → `issue-24-port-decommission-gateways` → `issue-07-trust-tier-entitlement-token` → `issue-08-razorpay-upi-mandate-lifecycle` → `issue-03-event-log-price-lock` → `issue-04-subscription-intent-two-axis` → `issue-05-payment-method-lifecycle-stripe` → `issue-06-credit-ledger-wallet` → `issue-09-postpaid-invoice-generation` → `issue-10-charge-payment-attempt-webhook` → `issue-11-credit-waterfall-wallet-gating` → `issue-12-metered-usage-meter` → `issue-16-free-trial-cost-report` → `issue-13-tax-gst-sez-tds` (**current HEAD**)

`press_billing_agent` branches:
- `issue-01-app-scaffold-plan-catalog` → `redesign-bundle-addon-pricing` → `issue-07-trust-tier-entitlement-token` → `issue-03-event-log-price-lock` → `issue-12-metered-usage-meter` (**current HEAD**)

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

## Architecture as built (#12 metered billing)

**Agent (`press_billing_agent` metering.py + `Usage Meter`):** edge aggregation — one row per (resource_id, meter_type, period), unique `idempotency_key`; status open(running total)→closed(final). `record_counter` (sum of deltas), `record_gauge` (value×days = GB-days integral), `running_total` (forecast), `close_period`. Each update marks unsynced. `sync.push_unsynced_meters` idempotent push → Central `receive_meter_rollups` (re-push REPLACES the period figure, never adds), marks synced on ack; on daily scheduler. Central never sees raw samples.

**Central (`press_billing` metering.py + `Usage Rollup`):** `ingest_rollup` upserts by idempotency_key (replace quantity; **stamp locked_allowance + locked_rate once at first receipt** — allowance from the locked plan's includes, per-unit rate from the matching metered Add-on resolved for currency+cluster; skips resources with no active price-lock). `metered_line_items` = `max(0, qty − locked_allowance) × locked_rate`, wired into `billing.generate_draft_invoice` so a draft carries **both fixed + metered** lines. Tests: agent `test_metering.py` (6), central `test_metering.py` (6).

## Architecture as built (#16 free/trial cost_report)

**Trials (`press_billing/trials.py`):** free/trial = entry trust tier; identical pipeline, one branch at invoice generation. `entry_tier()` (Trust Tier Level is_default, else min sequence), `is_trial_team`, `invoice_type_for(team)` → cost_report for entry-tier else billable (used by `billing.generate_draft_invoice`). `open_and_collect` short-circuits cost_report: computed, expected_collection 0, no credits/charge, opened as a subsidy record. `convert_to_paid(team, level=None)` flips to a paid tier (manual_override; resources/locks untouched → next period billable). `expire_trial(team)` issues a suspend directive on the entitlement-token channel (cap 0 + suspend). `subsidy_total(from, to)` = Σ cost_report subtotals (admin dashboard #19). Tests `tests/test_trials.py` (5).

## Architecture as built (#13 tax)

**Tax (`press_billing/tax.py` + `Tax Profile`):** three mechanics, not one rate. Per-team `Tax Profile` (output_tax_type GST/VAT + rate; zero_rated + zero_rating_reason sez_lut/export — reason mandatory, controller-enforced; tds_applicable + rate). `resolve_tax(team, subtotal)` → tax block. Invoice tax block fields: output_tax_type/rate/amount, zero_rating_reason, tds_applicable/rate/amount, tds_certificate_received (replaced the single `output_tax`). `billing.generate_draft_invoice`: `total = subtotal + output_tax_amount`; `expected_collection = total − tds_amount` (credits reduce further at open; credits capped at collectable = gross−TDS). `tax.is_paid` (amount_paid ≥ expected_collection, cert gate trivially met when nothing withheld); `tax.mandate_ceiling_amount` = gross total. tds_amount 0 at launch (no team self-declares); seam live. Tests `tests/test_tax.py` (7).

## Now: build UI + demo (user request, 2026-06-03)

Pivoting to the **Frappe-UI** customer dashboard so we can demo what's built. Plan: **#26** portal scaffold (Vue 3 + frappe-ui + `frappe-ui/tailwind` preset, in `press_billing/dashboard/`) → **#18** customer screens against the billing wireframes (Billing Overview, Invoice List/Detail, Payment Methods, Credits). Backend APIs the UI needs mostly exist (`plans.get_plan_pricing`, `credits.get_balance`, Invoice/Payment Method resources, `payments.*`); may add thin read endpoints + a `billing.get_forecast`. See [[billing-ui-stack]].

## Next up (after UI/demo)

1. **#14** — retry/dunning + staged suspension: consumes the residual-shortfall `Open` invoices (#11), drives account_standing past_due→suspended + token suspend directive; trial-expiry (#16 `expire_trial`) plugs into the same staging.
2. Remaining: refunds #15, ERPNext sync #17, reconciliation #21, notifications #20, PayPal #25.

## Open spec inconsistency (not yet fixed)

`roadmap.md` and `architecture.md` still say `cloud_billing`/`subscription_agent`; `plans-and-pricing.md`/`payments.md` use `press_billing.*`. A global rename sweep was offered but not done — confirm with user.

## Session: comprehensive demo dataset + invoice readability (2026-06-03)

Reworked the demo seed into a realistic multi-region dataset and fixed the "what
am I being charged for?" gap in invoices/forecast.

**Invoice / forecast readability.** `dashboard.get_invoice` and `get_forecast`
now run each line item through `_describe_line(team, li)` → a human row: plan/
add-on **title** (resolved from `Plan`/`Add-on`), a `kind` (`Plan` / `Overage`),
and a `detail` that spells out the driver ("200 GB over 800 GB included", "30
day(s) this period"). `get_forecast` also returns `currency`, `subtotal`,
`tax_amount`/`tax_type`. `InvoiceDialog.vue` + `Overview.vue` render the item +
kind badge + detail and pass the per-invoice/forecast **currency** to `money()`.
`utils.money(v, currency)` maps ISO codes (INR/EUR/USD) → ₹/€/$ (default INR).

**New seed (`press_billing.demo_scenarios.seed_all`).** Full `_wipe_all()` (drops
every press_billing record incl. catalog + child tables), then builds:
- **3 clusters** (`in-mumbai`/`eu-frankfurt`/`me-dubai`), **5 plan sizes**
  (1→16 vCPU) each priced **per cluster × currency** (INR/EUR/USD via FX + a
  regional multiplier) — same 5 plans in every region → cross-region works.
- **4 trust-tier levels** (t0→t3), one metered `addon-transfer` (per-currency).
- **10 teams** across tiers/currencies/regions/states (see POC-DEMO table):
  `acme-corp` (grandfathered, 10mo INR), `globex` (10mo EUR), `initech` (USD ME),
  `umbrella`/`wayne-ent` (INR paying in EU/ME — cross-region; wayne on a Razorpay
  UPI mandate), `stark-ind` (overdue), `cyberdyne` (suspended), `hooli` (prepaid
  shortfall), `soylent` (refund), `piedpiper` (trial cost_report).
- Per-team Trust Tier / Tax Profile (GST 18% INR, VAT 19% EUR, VAT 5% USD — tax
  follows the customer) / Billing Profile; N closed monthly Paid invoices via
  `billing.generate_draft_invoice` over one open price-lock + a current-month
  metered overage.
- **Grandfathering** = provision `acme-corp` with `shown_rate` = 0.78× catalog →
  the price-lock records `locked_rate` 9360 vs `central_rate` 12000, `discrepancy
  = 1`; billing honours the locked rate forever.

**Agent mirror (`press_billing_agent.demo.seed`).** Rewritten to mirror the 10
teams: Plan Cache (5), one Plan Subscription Log per resource (+ an acme `changed`
segment, some unsynced), per-resource Usage Meters feeding the overage, Sync Logs,
and Entitlement Tokens (acme/globex running, cyberdyne stopped/suspended, stark
expired-but-running).

**Admin MRR currency fix.** `admin.get_cluster_consumption` / `get_plan_consumption`
were summing raw `locked_rate` across currencies; now use `_plan_monthly_inr`
(INR catalog rate) like MRR/`list_teams`, so cluster totals = plan totals = MRR
(₹73,050). Conversion 90%, 2 delinquent, 1 suspended, 3 failures.

Tests green: **222** central + **34** agent. Note: the seeds commit, and several
tests delete-all + commit, so **re-run both seeds after running tests** before a
demo. SPA rebuilt (`yarn build`).

## Session: multi-instance teams, currency end-to-end, Forecast tab (2026-06-03)

Three follow-ups on the demo dataset/portal.

**Multi-instance teams (droplet/EC2-style).** `demo_scenarios.TEAMS` now lists a
`resources = [(cluster, plan), ...]` per team — any plan in any region, capped by
tier, billed in the team's single currency. `_build_team` provisions one
price-lock per instance, then creates **one Subscription + invoice stream per
cluster** (instances in a region group into one invoice's day-weighted line
items). e.g. `acme-corp` = 4 instances / 3 regions → 3 subscriptions, 30 invoices;
its in-mumbai June invoice carries **two** plan lines (grandfathered ₹9,360 + ₹3,000)
+ overage. The terminal state (overdue/suspended/…) lands on the primary cluster;
other regions carry an Open current invoice. First instance keeps the
grandfathered rate + the metered overage.

**Currency end-to-end (not just INR).** Added `dashboard._team_currency(team)`
(reads any price-lock's currency). `get_credit_balance` and `get_team_overview`
now return the team currency (+ `clusters` count); `get_forecast` already carried
it. `utils.money(v, currency)` maps INR/EUR/USD → ₹/€/$. Wired currency through
**Credits** (balance + ledger), **Overview** (credit balance, alert, instances ×
regions, billing currency), **Invoices** list, **InvoiceDialog**, and the new
**Forecast** page. Verified `globex` renders **EUR** everywhere, `initech` **USD**.

**Forecast as its own customer tab.** New `Forecast.vue` + route `/billing/forecast`
+ sidebar nav (trending-up icon). Holds the full month-end projection (services +
overage, subtotal/tax, wallet vs shortfall). Overview keeps only a compact
"This Month → View forecast" summary + the shortfall alert.

Tests: **222** central + **34** agent green. Re-seed both sites after tests (seeds
commit). Docs updated: POC-DEMO (catalog/teams table → instances·region·plan,
multi-region invoice example, portal Forecast tab + currency notes), session1.
