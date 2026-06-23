# Issues — Frappe Cloud v2 Billing & Payments

Tracer-bullet vertical slices derived from the [spec](../README.md) and [roadmap](../roadmap.md). Each is independently grabbable and demoable. Publish/grab in dependency order.

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

**Milestones:** **GW** = Gateway Integrations (front-loaded, Phase 1 foundation) · **P1**–**P4** = roadmap phases · **CM** = Central Merge (fold Billing into the `central` app as a module) · **AT** = Atlas Integration (Central provisions/records/enforces via the Atlas API — agentless, [ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md); specced in [atlas-integration](../atlas-integration/README.md)) · **CO** = Console UI migration (legacy `dashboard/` → `console/`; specced in [console-migration.md](../console-migration.md)) · **post** = post-launch.

| # | Slice | Type | Blocked by | Milestone |
|---|-------|------|-----------|-----------|
| [01](01-app-scaffold-plan-catalog.md) | App scaffold + Plan catalog (no Agent Plan Cache — [ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) | AFK | — | P1 |
| [27](27-rates-standalone-doctype-migration.md) | Plan/Add-on rates → one `Catalog Rate` DocType (Item Price style, Dynamic Link) + migration | AFK | 01 | P1 |
| [02](02-gateway-adapter-webhook-spine.md) | Gateway config + adapter interface + Stripe + signature-first webhook | AFK | — | **GW** |
| [24](24-gateway-integration-port-decommission.md) | Port & decommission existing gateway integrations | AFK | 02 | **GW** |
| [40](40-gateway-setup-validate-keys-webhook-autofill.md) | Gateway setup: validate credentials + auto-fill webhook secret | AFK | 02 | **GW** |
| [08](08-razorpay-upi-mandate.md) | Razorpay adapter + UPI Autopay mandate (cap = tier) | AFK | 02, 07 | **GW** |
| [25](25-paypal-adapter.md) | PayPal adapter | AFK | 02 | **GW** (post) |
| [03](03-agent-event-log-price-lock.md) | Central event log + price-lock (Central records; no Agent/push — [ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) | AFK | 01 | P2 |
| [04](04-subscription-intent-two-axis-state.md) | Subscription intent + two-axis state | AFK | 01 | P2 |
| [05](05-payment-method-lifecycle-stripe.md) | Payment Method lifecycle (Stripe) | AFK | 02 | P2 |
| [06](06-credit-ledger-wallet.md) | Credit ledger + wallet + concurrency | AFK | — | P2 |
| [07](07-trust-tier-entitlement-token.md) | Trust Tier + cap enforcement at provision (no Entitlement Token — [ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) | AFK | 04 | P2 |
| [09](09-postpaid-invoice-generation-fixed.md) | Postpaid two-phase invoice generation (fixed) | AFK | 03, 04 | P3 |
| [10](10-charge-invoice-payment-attempt-webhook.md) | Charge invoice → Payment Attempt → webhook → Paid | AFK | 02, 05, 09 | P3 |
| [11](11-credit-application-waterfall.md) | Credit application at invoice (waterfall + wallet gating) | AFK | 06, 09 | P3 |
| [12](12-metered-billing-usage-meter.md) | Metered billing — Usage Meter (counter/gauge) | AFK | 03, 09 | P3 |
| [13](13-tax-gst-sez-tds-seam.md) | Tax — GST + SEZ; TDS seam | AFK | 09 | P3 |
| [14](14-retry-dunning-suspension.md) | Retry/dunning + staged suspension | AFK | 07, 10 | P3 |
| [15](15-refunds.md) | Refunds — full→source, partial→wallet | AFK | 06, 10 | P3 |
| [28](28-secondary-payment-method-fallback.md) | Secondary payment methods + settlement fallback + UI | AFK | 10, 11, 14 | P3 |
| [29](29-razorpay-card-or-upi-gateway-aware-add.md) | Add-method: card-or-UPI choice, UPI ₹1L gate, currency-correct gateway | AFK | 05, 08, 28 | P3 |
| [16](16-free-trial-cost-report.md) | Free/trial cost_report | AFK | 07, 09 | P3 |
| [17](17-erpnext-async-sync.md) | ERPNext async Sales Invoice sync | AFK | 10 | P3 |
| [26](26-billing-portal-frontend-scaffold.md) | Billing portal frontend scaffold (Frappe-UI) | AFK | 01 | P4 |
| [18](18-customer-dashboard-forecast.md) | Customer dashboard + forecast | AFK | 26, 09, 11, 12 | P4 |
| [19](19-admin-dashboard.md) | Admin dashboard | AFK | 26, 09, 16 | P4 |
| [20](20-notification-suite.md) | Notification suite (sole sender) | AFK | 10, 14 | P4 |
| [21](21-reconciliation-job.md) | Reconciliation job | **HITL** | 10 | P4 |
| [22](22-security-load-hardening.md) | Security + load hardening | AFK | 10 | P4 |
| [23](23-migration-tooling.md) | Migration tooling (gradual per-team) | **HITL** | 09, 17 | post |
| [30](30-commitment-spend-floor-discount.md) | Commitment — team spend-floor + discounted monthly invoice | AFK | 09 | P3 |
| [31](31-commitment-clawback.md) | Commitment — clawback on breach | AFK | 30 | P3 |
| [32](32-live-priced-snapshot-add-on.md) | Live-priced snapshot add-on (`pricing_mode`, own `resource_id`, no allowance) | AFK | 12, 27 | P3 |
| [33](33-plan-configurator-authoring-ui.md) | Plan Configurator authoring UI (millicore + memory-ratio pre-fill) | AFK | 01, 27 | P4 |
| [34](34-money-module-minor-units.md) | `money` module: integer minor units + ISO-4217 exponent table | AFK | — | P1 |
| [35](35-rates-to-rate-units.md) | Rates → rate units (`minor×10⁶`): Catalog Rate / lock / shown_rate + proration engine | AFK | 34 | P1 |
| [36](36-invoice-tax-amounts-minor-units.md) | Invoice + tax amounts → minor units; migrate (convert stored, never recompute) | AFK | 34, 35 | P1 |
| [37](37-credit-ledger-minor-units.md) | Credit ledger → minor units (kills v1 float-drift balance) | AFK | 34 | P1 |
| [38](38-payments-boundary-minor-units.md) | Payments boundary → minor units; gateway adapters pass-through | AFK | 34, 36 | P3 |
| [39](39-erpnext-push-minor-units-boundary.md) | ERPNext push: minor→major decimal at boundary, round-off disabled | AFK | 36 | P3 |
| [46](46-multi-currency-gateway-config.md) | Multi-currency gateway config: `Payment Gateway Currency` child table + resolver | AFK | 02 | **GW** |
| [47](47-invoice-currency-lock.md) | Invoice `currency` lock | AFK | 09, 46 | P3 |
| [48](48-currency-aware-credit-ledger.md) | Currency-aware credit ledger | AFK | 06 | P2 |
| [49](49-gateway-config-ui-multi-currency.md) | Admin Gateway Config UI: currency grouping + `is_default` toggles | AFK | 46, 26 | P4 |
| [60](60-inr-collection-mode-threshold-action-required.md) | INR collection mode + ₹15k threshold + "Action Required" choice (Stripe-only methods; e-mandate ≤₹15k; manual/prepaid) | AFK | 10, 11, 14, 18 | P3 |
| [61](61-invoice-line-item-line-type.md) | `Invoice Line Item.line_type` — classify `fixed_bundle / metered / clawback` + `commitment` link | AFK | 09 (soft) | P3 |
| [62](62-commitment-rollup-doctypes.md) | Commitment + Team Fixed-Bundle Spend Rollup DocTypes + `evaluate_commitment()` skeleton | AFK | 61, 09 (soft) | P3 |
| [63](63-commitment-discount-application.md) | Commitment discount application — floor-met path, rollup stamping, `completed` status | AFK | 62 | P3 |
| [64](64-commitment-clawback.md) | Commitment clawback on breach — compute, emit `line_type=clawback` line, idempotent | AFK | 63 | P3 |
| [65](65-commitment-api.md) | Commitment API — customer (create / get_active / history) + admin (set_commitment) | AFK | 62 | P3 |
| [41](41-billing-as-central-module.md) | Vendor Billing backend into the `central` app as a `billing` module (UI not migrated) | **HITL** | — | **CM** |
| [42](42-adopt-central-capability-iam.md) | Adopt Central capability IAM (`billing:view`/`billing:manage`); retire `Billing Admin`/`Billing User` | **HITL** | 41, 43 | **CM** |
| [43](43-team-link-to-central-team-migration.md) | `team` `Data`→`Link (Team)` + data patch + Team Member access backfill | **HITL** | 41 | **CM** |
| [44](44-merge-hooks-fixtures.md) | Merge hooks/fixtures into Central; retire role/team-field bootstrap; drop SPA routing | AFK | 41, 42, 43 | **CM** |
| [45](45-test-suite-update-capability-authz.md) | Test suite update: capability authz + migration round-trip + demo seeds as real Teams | AFK | 41, 42, 43 | **CM** |
| [50](50-central-atlas-api-cluster-identity.md) | Central → Atlas API client + status callback + `cluster` identity | AFK | 03 | **AT** |
| [51](51-atlas-team-attribution.md) | Atlas: immutable `team` attribution on VM + Snapshot (IAM Execution Plan §2) | AFK | — | **AT** |
| [52](52-atlas-plan-attribution.md) | Atlas: `plan` attribution validated against the Central catalog | AFK | 01, 51 | **AT** |
| [53](53-central-subscribed-cancelled-events.md) | Central records `subscribed`/`cancelled` from Atlas lifecycle → price lock | AFK | 50, 51, 52 | **AT** |
| [54](54-changed-event-resize-plan-change.md) | `changed` event on resize/plan change (re-lock at new rate) | AFK | 53 | **AT** |
| [55](55-provision-gate-entitlement.md) | Provision gate: trust-tier cap checked synchronously at subscribe | AFK | 07, 51, 52 | **AT** |
| [56](56-enforcement-loop-running-vms.md) | Enforcement: Central calls Atlas to stop/terminate delinquent VMs | AFK | 51, 53 | **AT** |
| [57](57-snapshot-gauge-metering.md) | Snapshot gauge metering: Central samples Atlas daily → rollup | AFK | 12, 50, 51 | **AT** |
| [58](58-transfer-counter-metering.md) | Transfer counter metering from TAP device byte counters | AFK | 57 | post |
| [59](59-billing-time-pull-data-as-of.md) | Reconciliation read + per-team "data as of" freshness | AFK | 53, 57 | post |
| [66](66-console-migration-foundation.md) | Console migration foundation — API map + billing-setup guard + shared TS types | AFK | — | **CO** |
| [67](67-console-payments-plumbing.md) | Console payments plumbing — `@stripe/stripe-js` + Stripe/Razorpay/topup/pay composables (TS) | AFK | 66 | **CO** |
| [68](68-console-onboarding.md) | Console onboarding — billing-profile + payment-method steps + setup guard | AFK | 66, 67 | **CO** |
| [69](69-console-billing-overview.md) | Console Billing › Overview (consolidated: estimate/wallet/methods/subscriptions/tax/stop-billing) | AFK | 66, 67 | **CO** |
| [70](70-console-invoices.md) | Console Billing › Invoices — list + detail panel (line items, GST, credits, email/PDF) | AFK | 66, 67 | **CO** |
| [71](71-console-limit-tiers.md) | Console Billing › Limit Tiers ("Spending Limits") — summary + full ladder + explainer | AFK | 66 | **CO** |
| [72](72-console-notifications.md) | Console Notifications — top-level surface + preferences | AFK | 66 | **CO** |
| [73](73-console-team-permissions.md) | Console Team & Permissions — members + custom-role builder (`central.iam`) | AFK | 66 | **CO** |
| [74](74-decommission-legacy-dashboard.md) | Decommission legacy `dashboard/` SPA + `/legacy-dashboard` route; drop Atlas mock screens | AFK | 68, 69, 70, 71, 72, 73 | **CO** |

## Atlas Integration milestone (AT)

Wires the per-cluster reality into billing, **agentless**
([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)):
Central provisions, records the event log + meters, and enforces by **calling
Atlas's API** and reading runtime state back; Atlas's lifecycle transitions →
Central's price locks via a thin status callback. There is no per-cluster
billing app, no push spine, no Plan Cache, no signed token. Specced in
[atlas-integration](../atlas-integration/README.md); the dependency runs one way
— **Central depends on Atlas, Atlas never imports billing** — and all mapping
lives in `central/billing/integrations/atlas.py`.

**Land in order:** #50 + #51 (the two independent prerequisites: the Central→Atlas
API client + the Team boundary), then #52 (plan attribution), then #53 (the
tracer bullet — first end-to-end VM → price lock), then #54–#57 in any order.
#58–#59 are post-launch.

## Console UI migration milestone (CO)

Migrates the remaining billing/identity surfaces from the legacy Vue SPA
(`apps/central/dashboard/`) into the new primary console SPA
(`apps/central/console/`), then decommissions the legacy app. Console already owns
`/dashboard`; the legacy SPA is parked at `/legacy-dashboard` while its surfaces
are ported. Specced in [console-migration.md](../console-migration.md).

A **port, not a rewrite** — both SPAs run the same runtime (Vue 3 + vue-router +
frappe-ui `useCall`/`useList` against `/api/v2/method/*`) and the backend endpoints
are unchanged. The recurring tax is **JS → TS** (`vue-tsc` clean), the
**frappe-ui `^0.1.0` → beta.11** bump, and the CSS-class icon convention; the one
net-new chunk is the **Stripe/Razorpay plumbing** (#67). The new design
**consolidates** the legacy's seven billing pages into three (**Overview** absorbs
wallet/credits/payment-methods/subscriptions/profile/tax/stop-billing; **Invoices**
+ detail panel; **Limit Tiers** = the customer-facing rename of Trust Tier), plus
top-level **Team & Permissions** and **Notifications**.

**Decisions:** full TypeScript (`vue-tsc` clean); **drop** the legacy Atlas screens
(Region/Registry/VMs/AccessRequests on mock data) — console's real **Servers**
surface supersedes them.

**Land in order:** #66 (foundation) first, then #67 (payments plumbing), then the
read-heavy surfaces (#70, #71, #72) in any order, then #68/#69 (payments-dependent),
then #73, then #74 once parity is verified. A few **backend grounding gaps** —
full-ladder read for Limit Tiers, Stop-billing, auto-recharge toggle, email-invoice
/ download-PDF — are flagged in the spec; raise them at the dependent slice's start.

## Central Merge milestone (CM)

Folds the standalone Billing app into **Central** (`frappe/central`) as a
`billing` module and adopts Central's **capability IAM** in place of Billing's own
`Billing Admin`/`Billing User` roles. Driven by
[ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md).

- **#41** — vendor the **backend** in (imports → `central.billing.*`, DocType
  module = Billing, AGPL headers, full type annotations). The **dashboard UI is
  not migrated** — Central rebuilds it against the same APIs.
- **#42** — swap the authz seam to `central.iam.can(user, team, …)`; split
  customer endpoints into `billing:view` (reads) vs `billing:manage` (mutations);
  cross-team admin → operator bypass (`System Manager`). A `billing:operate`
  platform capability is deferred (Central-owned).
- **#43** — re-point `team` (a `Data` slug on 16 DocTypes) at the real `Team`
  DocType; idempotent data patch + **Team Member backfill** for access continuity.
- **#44** — merge scheduler/dashboard hooks; delete the role/team-field bootstrap;
  drop the `/billing` SPA route.
- **#45** — rebuild authz tests around capabilities, add a migration round-trip
  proof, seed demos as real Teams; keep the concurrency proofs green.

**Land in order:** #41 first (structure), then #43 + #42 together (identity +
authz), then #44 (wiring) and #45 (tests). All **HITL** for the code-moving slices
(#41–#43) — they need merge/license/access-continuity sign-off; #44–#45 are AFK
once those land.

## Gateway Integrations milestone (GW)

The gateway layer is a first-class, front-loaded workstream — it's what this project rewrites away from `frappe/payments` (see [misc.md](../misc.md)). Members:

- **#02** — adapter interface + secure webhook spine + Stripe *(Phase 1 foundation; prerequisite for everything that moves money)*.
- **#24** — port the existing Stripe/Razorpay integrations into the adapter model and decommission the old `frappe-payments` path *(Phase 1 foundation)*.
- **#40** — validated, self-wiring gateway setup: `validate_credentials` rejects bad keys on save, `register_webhook` auto-fills the signing secret so no secret is hand-pasted.
- **#46** — multi-currency gateway config: replaces the single `currency` field with a `Payment Gateway Currency` child table (`currency`, `is_default`) and introduces `resolve_gateway_for_currency()` as the canonical resolver.
- **#08** — Razorpay + UPI Autopay mandate; the adapter is foundation, the mandate-ceiling-=-tier wiring completes alongside **#07** (its blocker).
- **#25** — PayPal *(to-follow; post-launch, per spec)*.

## Notes

- **Agentless ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md), 2026-06-15):** the per-cluster **Subscription Agent** is retired. Central provisions via the **cluster manager API**, records the event log + metered usage itself, and enforces dunning by calling the cluster manager. **#03** (event log) and **#07** (cap enforcement) are Central-only; **#14** suspends via the cluster-manager call. No Plan Cache / Sync Log / Entitlement Token. A new outbound **cluster-manager integration** seam replaces plan-push / token-issue / usage-pull (own slice, TBD).
- **HITL:** #21 (reconciliation terminal-state model is an open design item), #23 (deferred ~6mo; needs migration sign-off), #41–#43 (Central Merge — moving code across apps + license change + access-continuity backfill need sign-off; the open `billing:operate` decision is Central-owned). All others AFK — the design decisions are settled.
- **Central Merge (#41–#45):** folds Billing into the `central` app and adopts its capability IAM ([ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md)). The dashboard UI is **not** migrated — Central rebuilds it against the same APIs. Supersedes the standalone role model in [security.md](../security.md) §3a–§3b.
- Multi-currency credits is tracked as **#48** (currency field on `Credit Ledger Entry`, P2); closes the open item in [credits.md](../credits.md).
- **#30–#33** come from the plan/pricing grilling session (see [final-plan-pricing.md](../final-plan-pricing.md), [ADR 0001](../docs/adr/0001-commitment-as-team-spend-floor.md), [ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)). All AFK — designs settled by the two ADRs. Tiered pricing is explicitly future ([final-plan-pricing.md](../final-plan-pricing.md) §10), no slice yet.
- **#34–#39** are the **integer-minor-units refactor** ([ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), grilled 2026-06-08): replace every `Currency` (float) money field with `Long Int` — amounts in minor units (paisa/cent), rates in `minor×10⁶`. A cross-cutting hardening pass over the now-built engine; all AFK (per-row round-trip assertions are the migration safety net). **Must land in dependency order** — #34 (the shared `money` module) first, then the flips (#35→#36, #37), then the boundaries (#38, #39) — because money math breaks under mixed float/int representations. Folds into #27 (rates) and #23 (migration tooling).
