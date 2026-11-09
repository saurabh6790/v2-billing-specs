# Issues — Frappe Cloud v2 Billing & Payments

Tracer-bullet vertical slices derived from the [spec](../README.md) and [roadmap](../roadmap.md). Each is independently grabbable and demoable. Publish/grab in dependency order.

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

**Milestones:** **GW** = Gateway Integrations (front-loaded, Phase 1 foundation) · **P1**–**P4** = roadmap phases · **CM** = Central Merge (fold Billing into the `central` app as a module) · **AT** = Atlas Integration (Central provisions/records/enforces via the Atlas API — agentless, [ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md); specced in [atlas-integration](../atlas-integration/README.md)) · **CO** = Console UI migration (legacy `dashboard/` → `console/`; specced in [console-migration.md](../console-migration.md)) · **PC** = Polymorphic Catalog (product families as masters — VM / AI Tokens / SaaS Storage / Remote Storage; [ADR 0007](../docs/adr/0007-polymorphic-catalog-category-masters.md)) · **CC** = Composable Config (design-your-own compute priced from a per-resource rate card, beside curated presets; [ADR 0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)) · **SIM** = Billing Simulator (the projection engine — billing asked what it *will* do, read-only; [ADR 0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)) · **SP** = Stripe Primary (Stripe takes every instrument a Stripe India account can carry, Razorpay takes the rest; [ADR 0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md), corrected by [ADR 0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)) · **TR** = Trials (signup trials meet billing; [trials-review.md](../trials-review.md)) · **SA** = Security audit (23 Oct 2026 billing audit; see the milestone section) · **TD** = Teardown (9 Nov 2026 central billing product and UX teardown; see the milestone section) · **post** = post-launch.

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
| [34](34-money-module-minor-units.md) | ~~`money` module: integer minor units + ISO-4217 exponent table~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [35](35-rates-to-rate-units.md) | ~~Rates → rate units (`minor×10⁶`)~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [36](36-invoice-tax-amounts-minor-units.md) | ~~Invoice + tax amounts → minor units~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [37](37-credit-ledger-minor-units.md) | ~~Credit ledger → minor units~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [38](38-payments-boundary-minor-units.md) | ~~Payments boundary → minor units~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [39](39-erpnext-push-minor-units-boundary.md) | ~~ERPNext push: minor→major decimal at boundary~~ **OBSOLETE** (ADR 0003 deprecated) | — | — | — |
| [46](46-multi-currency-gateway-config.md) | Multi-currency gateway config: `Payment Gateway Currency` child table + resolver | AFK | 02 | **GW** |
| [47](47-invoice-currency-lock.md) | Invoice `currency` lock | AFK | 09, 46 | P3 |
| [48](48-currency-aware-credit-ledger.md) | Currency-aware credit ledger | AFK | 06 | P2 |
| [49](49-gateway-config-ui-multi-currency.md) | Admin Gateway Config UI: currency grouping + `is_default` toggles | AFK | 46, 26 | P4 |
| [60](60-inr-collection-mode-threshold-action-required.md) | INR collection mode + ₹15k threshold + "Action Required" choice (auto-charge ≤₹15k; manual/prepaid above it) | AFK | 10, 11, 14, 18 | P3 |
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
| [75](75-catalog-taxonomy-masters.md) | Catalog taxonomy masters — Plan Category + Sub-Category + Resource Type (replaces `plan_class`/enum) + migration | AFK | 27 | **PC** |
| [76](76-category-aware-configurator.md) | Category-aware Plan Configurator — pluggable builders (`vm_rungs` + `simple`) + Custom mints sub-category | AFK | 75 | **PC** |
| [77](77-new-product-families.md) | New families live — AI Tokens / SaaS Storage / Remote Storage (Frappe Box) + IP/Snapshot → add-ons | AFK | 75, 76 | **PC** |
| [78](78-retire-addon-fold-into-plan.md) | Retire `Add-on` — fold into a metered single-resource `Plan` (billing semantics on Category) + migration ([ADR 0008](../docs/adr/0008-add-on-as-metered-single-resource-plan.md)) | AFK | 75, 76 | **PC** |
| [79](79-per-resource-rate-card.md) | Per-resource rate card — price `Resource Type` via `Catalog Rate` (`priced_doctype = Resource Type`) + seed + admin edit | AFK | 27, 75 | **CC** |
| [80](80-composed-subscription-itemized-invoice.md) | Composed Subscription — composition on the Subscription; whole-config rate locked on the change row; bills one line at the locked rate | AFK | 79, 04, 03, 09 | **CC** |
| [81](81-sub-category-proportionality-bounds.md) | Profile proportionality + bounds on `Plan Sub-Category` (ratio, vCPU steps, disk range) validated at provision | AFK | 80, 75 | **CC** |
| [82](82-resize-composed-config-changed-event.md) | Resize a composed config — `changed`-event re-lock at current rates + preset↔composed switch | AFK | 80, 81, 54 | **CC** |
| [83](83-eligibility-rate-card-bounds-headroom.md) | `get_eligible_plans` returns rate card + profile bounds + headroom; provision re-validates server-side | AFK | 79, 81, 07 | **CC** |
| [84](84-customer-config-slider-ui.md) | Customer slider UI — design-your-own config + resize (console, Frappe-UI) | AFK | 83, 82, 66 | **CC** |
| [91](91-split-decision-from-effect-rating-dunning.md) | Split decision from effect in the rating and dunning paths (`rate_team_period`, `dunning_schedule`) — no behaviour change | AFK | — | **SIM** |
| [92](92-project-one-team-next-month.md) | Project one team's next month — engine + read-only transaction + line `basis` + Simulator Desk page | AFK | 91 | **SIM** |
| [93](93-derived-payment-outcomes.md) | Derived payment outcomes — the engine asserts *why* collection will fail | AFK | 92 | **SIM** |
| [94](94-multi-month-roll-forward.md) | Multi-month roll-forward + the state seam (wallet, standing, tier, suspension halts accrual) | AFK | 92 | **SIM** |
| [95](95-line-derivation-drill.md) | Line derivation drill — which segments, daily vs hourly churn, allowance vs overage | AFK | 92 | **SIM** |
| [104](104-collection-outlook-sweep.md) | Collection outlook — unbounded cheap sweep over existing unpaid invoices (who suspends, when) | AFK | 91 | **SIM** |
| [105](105-team-payment-behaviour.md) | Payment behaviour — retrospective: how reliably a team has actually paid (context for every projection) | AFK | — | **SIM** |
| [96](96-cohort-billing-projection-report.md) | Cohort **revenue** projection — bounded by construction, materialised summary + on-demand detail, stratified sampling | AFK | 92, 93 | **SIM** |
| [97](97-billing-scenario-and-overrides.md) | Scenario as input — `Billing Scenario` DocType + Billing Settings overrides | AFK | 92 | **SIM** |
| [98](98-price-change-what-if.md) | Price-change what-if — new segments from date *D*; grandfathered vs repriced split | AFK | 97 | **SIM** |
| [99](99-injected-events.md) | Injected events — hypothetical resize / provision / cancel / top-up / decline | AFK | 94, 97 | **SIM** |
| [100](100-diff-mode-blast-radius.md) | Diff mode + blast radius (cohort aggregate) | **HITL** | 96, 97 | **SIM** |
| [101](101-get-forecast-on-projection-engine.md) | Reimplement `get_forecast` on the projection engine — one rating path, not two | AFK | 92 | **SIM** |
| [102](102-scenario-library.md) | Scenario library — the canned failure catalogue | AFK | 99 | **SIM** |
| [103](103-cassette-record-replay-regression.md) | Cassette record/replay — golden-master regression on real shapes | AFK | 92 | **SIM** |
| [106](106-gateway-currency-capabilities-collection-mode-rename.md) | Silent-debit capability onto `Payment Gateway Currency`; `stripe_auto`/`emandate` → `auto_charge` (+ patch) | AFK | 46, 60 | **SP** |
| [107](107-stripe-india-card-mandate.md) | Stripe India card e-mandate — register, debit off-session ≤ ₹15k, pre-debit notice; Razorpay mandates grandfathered | AFK | 106 | **SP** |
| [108](108-instrument-picker-add-method.md) | Add-method instrument picker (UPI · Card · RuPay card · Netbanking); gateway fixed per method | AFK | 107 | **SP** |
| [109](109-gateway-fallback-routing-config.md) | Terminal-decline fallback to the other rail + routing config in Billing Settings + success rate by gateway × network × currency | AFK | 108 | **SP** |
| [110](110-two-payment-surfaces-capability-routing.md) | Split recharge from auto-pay; route each instrument by what Stripe India can actually carry ([ADR 0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)) | AFK | 108 | **SP** |
| [111](111-stripe-owns-its-predebit-window.md) | Stripe runs its own pre-debit window (26h `processing`); map its mandate failure codes | AFK | 107 | **SP** |
| [112](112-trial-servers-sleep-in-production.md) | Trial servers sleep in production (today only staging teams sleep) | AFK | — | **TR** |
| [113](113-convert-only-the-trials-the-customer-keeps.md) | A card converts only Active trials; an Ended trial converts when the user starts it | AFK | — | **TR** |
| [114](114-no-free-trial-for-a-team-that-has-paid.md) | No free trial for a team that has paid before (lapsed card, dunning) | AFK | 115 | **TR** |
| [115](115-decide-trial-once-at-request-time.md) | Store "is free trial" once on the Resource Action; stop re-reading the card | AFK | — | **TR** |
| [116](116-check-the-spend-limit-at-conversion.md) | Check the spend limit when trials convert | AFK | 113 | **TR** |
| [117](117-trial-per-product-for-paying-teams.md) | Free trial per product for teams that already pay | **HITL** | 114, 115 | **TR** |
| [118](118-count-trials-per-owner.md) | Count open trials per owner, not per team | AFK | — | **TR** |
| [119](119-convert-trials-for-teams-that-pay-without-a-card.md) | Convert trials for Manual Checkout and prepaid teams | **HITL** | 113 | **TR** |
| [120](120-card-setup-charge-matches-what-we-say.md) | Card setup charges what the screen says (Stripe $0.50, Razorpay ₹1) | **HITL** | — | **TR** |
| [121](121-welcome-credit-amount-per-product.md) | ~~Welcome credit amount per product~~ (dropped) | — | — | **TR** |
| [122](122-metered-services-and-trial-sites.md) | Rule for team-level metered usage inside a trial site | **HITL** | — | **TR** |
| [123](123-billing-day-simulation-findings.md) | Fix what the 1 November billing day simulation found | AFK | — | post |
| [124](124-billing-audit-and-dashboards-at-scale.md) | Keep the billing audit and dashboards off the hot path at scale | AFK | — | post |
| [125](125-record-every-payment-method-and-top-up-failure.md) | Record why adding a payment method or topping up the wallet failed | AFK | — | post |
| [126](126-first-charge-and-3ds-gaps.md) | Close the gaps that make a first charge or a mandate debit fail | AFK | — | post |
| [127](127-partner-pays-invoicing-limits-and-dunning.md) | Invoice the partner when it pays, ask the partner above the limit, and handle partner dunning | AFK | central#508 | post |
| [128](128-bind-every-payment-to-its-intent.md) | Settle or credit a payment only when it matches the intent we stored | AFK | — | **SA** |
| [129](129-verify-cards-and-mandates-at-the-gateway.md) | Activate a card or mandate only from what the gateway says | AFK | — | **SA** |
| [130](130-razorpay-charges-and-refunds-safe-to-retry.md) | Make Razorpay recurring charges and refunds safe to retry | AFK | — | **SA** |
| [131](131-never-lose-a-gateway-webhook.md) | Never lose a gateway webhook, and give late money a home | AFK | 128 | **SA** |
| [132](132-track-refunds-until-the-gateway-finishes.md) | Track a refund until the gateway finishes it | AFK | — | **SA** |
| [133](133-finish-the-paypal-integration.md) | Finish the PayPal integration | AFK | — | **SA** |
| [134](134-receive-disputes-on-every-gateway.md) | Receive and record disputes on every gateway | AFK | — | **SA** |
| [135](135-page-and-isolate-money-jobs.md) | Page and isolate the daily and hourly money jobs | AFK | — | **SA** |
| [136](136-lock-the-invoice-before-cancel.md) | Lock the invoice before cancel or an on-session order | AFK | — | **SA** |
| [137](137-read-only-money-records.md) | Make money records read-only and keep their history | AFK | — | **SA** |
| [138](138-map-every-stripe-outcome.md) | Map every Stripe outcome and pin the API version | AFK | — | **SA** |
| [139](139-keep-payment-records-refunds-need.md) | Keep the payment records that refunds and disputes need | AFK | — | **SA** |
| [140](140-two-layer-permissions-billing.md) | Add query conditions and has_permission to team-scoped billing DocTypes | AFK | — | **SA** |
| [141](141-hosted-checkout-payment-attempt.md) | Record a Payment Attempt for hosted-checkout invoice payments | AFK | 128 | **SA** |
| [142](142-predebit-before-every-mandate-debit.md) | Send the pre-debit notice before every mandate debit | AFK | — | **SA** |
| [143](143-no-test-endpoints-and-scoped-pilot-credential.md) | Ship no test endpoints, and scope the pilot credential | **HITL** | — | **SA** |
| [144](144-rate-limits-and-safe-exports.md) | Rate-limit payment endpoints and escape CSV exports | AFK | — | **SA** |
| [145](145-operator-alerts-to-raven.md) | Send billing operator alerts to a Raven channel, with email as a setting | AFK | — | **SA** |

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

## Stripe Primary milestone (SP)

[ADR 0022](../docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) rebalances the two gateways.
Stripe was chosen when it had no UPI, so "Indian customer" and "Razorpay customer" were the same
sentence; that stopped being true, and two gateways carrying comparable responsibility means two
saved-method models, two mandate implementations, two dunning behaviours, and every billing feature
built twice. We become a **Stripe India merchant** so INR settles domestically, Stripe takes every instrument that
account can carry, and **Razorpay narrows to what it cannot** — RuPay, UPI (one-time and Autopay),
netbanking, and card mandates on networks Stripe will not register. Being an Indian Stripe merchant is
what *costs* us UPI rather than what grants it ([ADR 0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)),
and that is the trade being made deliberately.

**The ₹15,000 silent-debit ceiling does not move with the rail.** It is an RBI rule that binds Stripe
India identically, so [payments-inr.md](../payments-inr.md)'s threshold, states and case matrix all
survive intact. Anyone reading this milestone as "the cap goes away with Razorpay" has misread it, and
that misreading is the expensive one.

- **#106 first, and deliberately behaviour-free.** It moves the silent-debit capability onto the
  *(gateway, currency)* row (Stripe is ceilingless in USD and capped in INR, which a per-adapter
  scalar cannot say) and collapses `stripe_auto`/`emandate` into `auto_charge`. Renaming a Select with
  live rows in it only gets more expensive once the picker ships.
- **#107** is the rail itself: an INR card mandate registered on Stripe India, debited off-session
  under the same ceiling and the same pre-debit notice. Existing Razorpay card mandates are
  **grandfathered, not migrated** — re-registration is a fresh AFA, which is a churn event with no
  benefit to the customer — so both mandate implementations live in the tree through the transition.
- **#108** is what the customer actually sees: four tiles, and the tile picks the gateway. We never
  detect the card network, because Stripe Elements iframes the PAN and the customer already knows
  which card they hold. Gateway is fixed when the method is created; a charge never shops between
  gateways.
- **#109** is the safety net plus the evidence: fallback only on a *terminal* decline (an ambiguous
  timeout that falls back double-charges someone), routing knobs in Billing Settings so the bet is
  reversible without a deploy, and success rate by gateway × network × currency so the bet can be
  settled with a number.
- **#110 and #111 correct the milestone against Stripe's documentation** ([ADR 0023](../docs/adr/0023-stripe-first-by-capability-two-payment-surfaces.md)).
  Three of ADR 0022's premises were wrong: Stripe does offer UPI and UPI Autopay but **not to
  India-based accounts**, netbanking is not a Stripe product at all, and India card mandates are
  **Visa and Mastercard only**. The routing survives and its reasoning inverts — being an Indian
  Stripe merchant is what costs us UPI, not what grants it. That closes the open question (all UPI is
  Razorpay's, so no instrument spans two gateways) and splits the one picker into the two surfaces
  billing actually has: wallet recharge and auto-pay setup.

## Billing Simulator milestone (SIM)

Billing asked what it *will* do, rather than run and observed afterwards — [ADR 0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md). The engine does not model billing; it **is** the billing engine called with a virtual clock on a code path that cannot write (`START TRANSACTION READ ONLY`, so a stray write fails at the database rather than in review). Vocabulary is fixed: a **scenario** is the input, a **projection** is the output, the **Simulator** is the Desk surface — and **run** keeps meaning the monthly billing run, so nothing read-only borrows it.

**Everything in SIM is a Desk surface, at `/desk/...`.** Admin and ops work in Desk; the frappe-ui SPA at `/dashboard` is customer-only. That means `frappe-ui` components are **not available** — a Desk page is vanilla JS and jQuery, styled against Desk's own CSS custom properties (`--fg-color`, `--border-color`, `--subtle-fg`, …), not `bg-surface-*` / `text-ink-*`. The one convention that carries over from the frappe-ui standard is sentence case: never uppercase a header, column label or section title. Note the route prefix is `/desk` on Frappe 17-dev — `/app/*` redirects to it, not the reverse.

**One engine, two callers — not one engine, two modes.** The billing engine already exists and rates real invoices today; nothing here rewrites it. #91 splits each act's *decision* from its *effect*, after which the scheduled run calls the decision and then acts on it, while the simulator calls the same decision and displays it. The engine carries no `simulate` flag, because a flag would scatter `if not simulating:` across every effect site and make the safety property "we remembered the branch everywhere" — which is precisely what the read-only transaction replaces. Actual billing stays on its existing schedule (cron drafts on the 1st, daily sweep collects); projections are on demand, with an optional nightly cohort batch.

- **#91** is the enabling refactor and is deliberately behaviour-free: it splits each billing act's decision from its effect. Kept separate from #92 so the riskiest diff in the milestone — the invoice generator and the dunning ladder — is reviewed on its own rather than alongside a new Desk page.
- **#92** is the tracer bullet: one team, one future month, live config, end to end.
- **#93/#94** deepen it — *why* collection fails, and what happens over six months as the wallet drains and standing advances.
- **#105 is the backward-looking half.** A projection alone does not tell an operator whether to act — "suspends on the 12th" means one thing for a team that has never missed a payment and the opposite for one that is late every month. It reads existing invoices and attempts only, so it shares #104's cost class and needs no bounding.
- **#104 and #96 are the two cohort surfaces, and they are separated by cost class.** *Who gets suspended, and when* needs no rating — it is `dunning_schedule` over invoices that already exist, so it scales with **delinquency**, not with the book, and runs unbounded over everything in under a second even at lakh scale (#104). *What will these teams be billed* requires rating each team, and at a few lakh teams a six-month projection is days of compute on a system concurrently onboarding new signups. So #96 is **bounded by construction**: it sizes and cost-estimates the cohort first, **refuses** anything over budget rather than queueing it, answers book-wide questions by stratified sample instead of by grinding, runs on its own queue, and will not start while the monthly run is drafting or collecting.
- **Where scale bites in #96 is the surface, not the engine.** None of the monthly run's bottlenecks apply to a projection — nothing is inserted (no `tabSeries` lock), no gateway is called (no concurrency cap), no wallet is locked — and per-team work is independent, so the engine is linear and scales with workers. What breaks is that a Query Report executes inside the web request. Hence: materialise a scalar summary row per team from a background batch, and compute per-team detail only on drill-in.
- **#97–#100** make configuration an input: overrides, price-change what-ifs, injected events, and the cohort blast radius.
- **#101** points the customer forecast at the same engine, so the number a customer sees and the number an operator simulates cannot drift.
- **#103** is the regression harness. Diffing projections across a deploy is confounded by data drift, so it records the reads and replays against them; #92 only owes it a hook.

## Trials milestone (TR)

Signup trials (built in `central/signups/` by Prathamesh, #470 and #495) run a site with no Subscription for a set number of days, so the billing engine never sees them. The problems are at the two edges: when a site is decided to be a trial, and when a card turns it into a paid server. Full write-up: [trials-review.md](../trials-review.md).

- **Step 1, stop wrong charges and leaks:** #112 (ship first, a few lines), then #115, #113, #114.
- **Step 2, tighten limits:** #116, #118. No visible change for a normal user.
- **Step 3, needs product decisions:** #117, #119, #120, #121, #122.
- Config only, no issue: set Trial Days and Trial Deletion Days to 7 for the 7 + 7 day flow.

## Security audit milestone (SA)

From the billing security audit of 23 Oct 2026. The report and its probes stay on the bench (`docs/bug-reviews/central-billing/`), because this repository is public. Issues here state the fix and the risk, not how to exploit it.

- **Step 1, close the money paths:** #128, #129. Then audit past data as #128 says.
- **Step 2, retries and lost events:** #130, #131, #132.
- **Step 3, jobs and locks:** #135, #136, #137.
- **Step 4, gateway coverage:** #133, #134, #138, #141, #142.
- **Step 5, hardening:** #139, #140, #143 (needs the pilot credential decision), #144.
- **#145** routes operator alerts to Raven. It can ship any time, and steps 2 and 4 send their new alerts through it.

## Teardown (TD)

From the [central billing teardown](../central-billing-teardown/README.md), checkpoints 1 to 3: billing setup and payment methods, invoices and collection, cost and limits, wallet and credits, subscriptions and projects, purchase-time billing, operator back office. Each issue cites `path:line` at central `a95b491e` and production counts from the backup of 3 Nov 2026. Problem IDs (`CB-nn`) point to the [problem register](../central-billing-teardown/12-problem-discovery/problem-register.md). Ordered by priority; HITL issues need a decision from [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) first.

Decisions already made (9 Nov 2026): Prepaid = the wallet pays first, the saved method only for the shortfall, and Prepaid stays separate from Auto Charge; the spending limit is checked against base cost before tax, with "taxes are added on top" wherever cost is shown; no auto-recharge; budget alerts are built; invoices held for accounting sync are expected until the integration is finalised (no issue).

| # | Slice | Type | Priority | Size | Problem |
|---|-------|------|----------|------|---------|
| [146](146-unfinished-payment-method-setups.md) | Payment-method setups and top-ups that fail or are abandoned leave no end state and nothing the customer can see | HITL | P1 | M | CB-21 |
| [147](147-spending-limit-one-figure.md) | The spending limit is compared with three figures on screen, and none is the one the server-create gate uses | AFK | P1 | M | CB-25 |
| [148](148-show-and-change-how-you-pay.md) | Customers cannot see or change how they pay, and making a card primary silently changes it | HITL | P1 | M | CB-03 |
| [149](149-team-billing-view-for-support.md) | Support has no single view of a team's billing | HITL | P1 | M | CB-18 |
| [150](150-prepaid-meaning-screen-vs-engine.md) | Prepaid copy assumes credits only, and adding or promoting a method silently turns Prepaid into Auto Charge | AFK | P2 | S | CB-04 |
| [151](151-overview-setup-banner-flash.md) | Overview shows "Add your billing details" on every load, even for teams with complete details | AFK | P2 | XS | CB-27 |
| [152](152-invoice-list-error-state.md) | Invoice list shows "No invoices yet" when loading fails | AFK | P2 | XS | CB-06 |
| [153](153-banner-pay-now-deep-link.md) | Overview "Pay now" opens the invoice list instead of the owed invoice | AFK | P2 | XS | CB-08 |
| [154](154-onboarding-country-autosave.md) | Onboarding saves a billing country from the browser time zone without the user choosing it | AFK | P2 | XS | CB-12 |
| [155](155-card-check-charge-disclosure.md) | Onboarding says "No charge today" but adding a card makes a small refunded charge | AFK | P2 | XS | CB-11 |
| [156](156-budget-alerts-never-sent.md) | Budget alerts are saved but never sent | AFK | P2 | S | CB-23 |
| [157](157-facts-card-label-truncation.md) | Overview facts card labels shrink to single letters when a side panel is open | AFK | P2 | XS | CB-28 |
| [158](158-invoice-filter-and-statement.md) | Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices | AFK | P2 | S | CB-16 |
| [159](159-receipt-totals-add-up.md) | Invoice receipt shows deductions above a Total that ignores them, hides TDS, and the Pay amount differs from Total | AFK | P2 | S | CB-01 |
| [160](160-wallet-history-readable.md) | Wallet history shows raw timestamps, internal notes, no expiry per grant, and only the latest 50 entries | AFK | P2 | S | CB-29 |
| [161](161-topup-presets-and-gst.md) | Top-up quick amounts ignore currency and the forecast, and GST is computed in the browser | AFK | P2 | S | CB-32 |
| [162](162-one-cost-figure-on-overview.md) | This cycle's cost appears five times on the Overview, from two sources and two tax bases | AFK | P2 | M | CB-26 |
| [163](163-customer-safe-error-messages.md) | Server error text reaches customers word for word in payment and invoice flows | AFK | P2 | M | CB-20 |
| [164](164-pay-now-names-method.md) | "Pay ₹X now" charges immediately without naming the payment method | AFK | P2 | S | CB-09 |
| [165](165-live-payment-status.md) | After paying, "Waiting for your bank to confirm" never updates without a reload | AFK | P2 | S | CB-07 |
| [166](166-manual-checkout-gateway.md) | Manual Checkout always opens the Razorpay sheet whatever gateway the order was created on | AFK | P2 | S | CB-10 |
| [167](167-operator-invoice-actions.md) | Operators cannot charge again, send a payment link or release a hold from an invoice; Cancel shows no effects | HITL | P2 | M | CB-19 |
| [168](168-last-payment-method-removal.md) | The last payment method can be removed while an invoice is owed, with a warning that does not say so | HITL | P2 | S | CB-02 |
| [169](169-payment-invoice-accessibility.md) | Accessibility gaps in payment-method and invoice screens | AFK | P2 | S | CB-17 |
| [170](170-remove-disabled-email-invoice.md) | Remove controls that never work: "Email invoice" and the "Auto-recharge" switch | AFK | P3 | XS | CB-15 |
| [171](171-primary-method-controls.md) | "Primary payment method" is disabled without a reason while "Move up" does the same thing | AFK | P3 | XS | CB-05 |
| [172](172-mandate-label-duplicate.md) | "UPI Autopay" is shown twice on a mandate row with no UPI ID | AFK | P3 | XS | CB-24 |
| [173](173-billing-details-form-polish.md) | Billing details form: country editable after currency lock, vague lock text, address field order | AFK | P3 | XS | CB-13 |
| [174](174-customer-copy-glossary.md) | Customer copy in payment and invoice screens uses internal words | AFK | P3 | S | CB-14 |
| [175](175-pause-billing-keeps-charging.md) | "Pause billing" stops the server but not the charges, and a paused server that is later terminated bills on | AFK | P1 | M | CB-34 |
| [176](176-stop-versus-pause-billing.md) | A stopped server should bill for its disk only; today it bills in full and nothing tells the customer | AFK | P2 | M | CB-35 |
| [178](178-purchase-payment-gate-mismatch.md) | The New server page says no payment method is needed when the team has any credit, then the server refuses the create | AFK | P2 | S | CB-39 |
| [177](177-purchase-price-basis.md) | The server price at purchase does not say it is before tax, leaves out the IPv4 charge, and says servers are billed to the payment method | AFK | P2 | S | CB-38 |
| [179](179-record-purchase-refusals.md) | Refused server creates and resizes leave no record, so nobody can see how often customers hit the spending limit | AFK | P2 | S | CB-40 |
| [181](181-desk-billing-home-for-support.md) | The Desk billing home counts internal teams as customers and has nothing for support work | AFK | P2 | S | CB-41 |
| [182](182-operator-alerts-desk-queue.md) | Open operator alerts are visible only in Raven or email, with no list in Desk | AFK | P2 | S | CB-42 |
| [180](180-project-limit-gaps.md) | A project's spending limit is checked only when a server is tagged, and its errors show internal ids | AFK | P3 | S | CB-36 |
| [183](183-revenue-reports-count-waived.md) | Revenue reports count waived internal invoices as revenue; the economics reports do not | AFK | P1 | S | CB-44 |
| [184](184-invoice-list-phone-width.md) | At phone width the invoice list hides Status and Amount off to the right, and the invoice panel keeps focus behind it | AFK | P2 | S | CB-43 |
| [185](185-credit-expiry-notice.md) | Promotional credit expires with no notice to the team | AFK | P2 | S | CB-45 |
| [187](187-usage-day-ledger.md) | Store metered usage per day (Usage Day), and build the monthly figure from the days | AFK | P1 | M | CB-48 |
| [186](186-bill-ai-usage-from-grove.md) | AI usage is never billed: Central thinks Grove is prepaid, Grove expects Central to bill in arrears | HITL | P1 | M | CB-46 |
| [188](188-storage-price-and-unit.md) | Object storage is metered but priced at zero, and its GiB figure is labelled GB | HITL | P2 | S | CB-47 |
| [189](189-bundled-transfer-unmetered.md) | Every server promises 1 TB of transfer a month, and nothing measures transfer | HITL | P3 | S | CB-49 |

- **Quick wins first:** #151, #152, #153, #154, #155, #170 (each under a day, no decision needed).
- **#146** builds on **#125** (record why setups and top-ups failed).
- **#150** (Prepaid copy) ships before or with **#148** (how you pay).
- **Metered services (D8):** #187 (per-day usage store) first, then #186 (bill AI from Grove; export Grove's Revenue report before its 90-day purge), #188, #189. Design: [daily-usage-store.md](../central-billing-teardown/13-brainstorming/daily-usage-store.md).
- **Checkpoint 3:** #175 (pause keeps charging) is P1 and needs no decision. #176 (stopped servers bill disk only) follows #175. #179 (record refusals) is needed to measure #147.

## Notes

- **Agentless ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md), 2026-06-15):** the per-cluster **Subscription Agent** is retired. Central provisions via the **cluster manager API**, records the event log + metered usage itself, and enforces dunning by calling the cluster manager. **#03** (event log) and **#07** (cap enforcement) are Central-only; **#14** suspends via the cluster-manager call. No Plan Cache / Sync Log / Entitlement Token. A new outbound **cluster-manager integration** seam replaces plan-push / token-issue / usage-pull (own slice, TBD).
- **HITL:** #21 (reconciliation terminal-state model is an open design item), #23 (deferred ~6mo; needs migration sign-off), #41–#43 (Central Merge — moving code across apps + license change + access-continuity backfill need sign-off; the open `billing:operate` decision is Central-owned). All others AFK — the design decisions are settled.
- **Central Merge (#41–#45):** folds Billing into the `central` app and adopts its capability IAM ([ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md)). The dashboard UI is **not** migrated — Central rebuilds it against the same APIs. Supersedes the standalone role model in [security.md](../security.md) §3a–§3b.
- Multi-currency credits is tracked as **#48** (currency field on `Credit Ledger Entry`, P2); closes the open item in [credits.md](../credits.md).
- **#30–#33** come from the plan/pricing grilling session (see [final-plan-pricing.md](../final-plan-pricing.md), [ADR 0001](../docs/adr/0001-commitment-as-team-spend-floor.md), [ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)). All AFK — designs settled by the two ADRs. Tiered pricing is explicitly future ([final-plan-pricing.md](../final-plan-pricing.md) §10), no slice yet.
- **#34–#39** were the **integer-minor-units refactor** ([ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md)) — retype every `Currency` money field to `Long Int` minor units. **OBSOLETE — do not build:** ADR 0003 was never implemented and is deprecated; money is stored as float `Currency` in major units throughout, and any minor-unit conversion stays local to a gateway adapter that requires it (see [catalog-pricing-decisions.md](../catalog-pricing-decisions.md)). Each issue carries an OBSOLETE banner.
