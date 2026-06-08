# Issues — Frappe Cloud v2 Billing & Payments

Tracer-bullet vertical slices derived from the [spec](../README.md) and [roadmap](../roadmap.md). Each is independently grabbable and demoable. Publish/grab in dependency order.

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

**Milestones:** **GW** = Gateway Integrations (front-loaded, Phase 1 foundation) · **P1**–**P4** = roadmap phases · **post** = post-launch.

| # | Slice | Type | Blocked by | Milestone |
|---|-------|------|-----------|-----------|
| [01](01-app-scaffold-plan-catalog.md) | App scaffold + Plan catalog + push to Agent Plan Cache | AFK | — | P1 |
| [27](27-rates-standalone-doctype-migration.md) | Plan/Add-on rates → one `Catalog Rate` DocType (Item Price style, Dynamic Link) + migration | AFK | 01 | P1 |
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

## Gateway Integrations milestone (GW)

The gateway layer is a first-class, front-loaded workstream — it's what this project rewrites away from `frappe/payments` (see [misc.md](../misc.md)). Members:

- **#02** — adapter interface + secure webhook spine + Stripe *(Phase 1 foundation; prerequisite for everything that moves money)*.
- **#24** — port the existing Stripe/Razorpay integrations into the adapter model and decommission the old `frappe-payments` path *(Phase 1 foundation)*.
- **#08** — Razorpay + UPI Autopay mandate; the adapter is foundation, the mandate-ceiling-=-tier wiring completes alongside **#07** (its blocker).
- **#25** — PayPal *(to-follow; post-launch, per spec)*.

## Notes

- **HITL:** #21 (reconciliation terminal-state model is an open design item), #23 (deferred ~6mo; needs migration sign-off). All others AFK — the 22 design decisions are settled.
- Multi-currency credits (future) is folded into #06 as a noted extension, not a separate slice.
- **#30–#33** come from the plan/pricing grilling session (see [final-plan-pricing.md](../final-plan-pricing.md), [ADR 0001](../docs/adr/0001-commitment-as-team-spend-floor.md), [ADR 0002](../docs/adr/0002-live-priced-storage-add-ons.md)). All AFK — designs settled by the two ADRs. Tiered pricing is explicitly future ([final-plan-pricing.md](../final-plan-pricing.md) §10), no slice yet.
- **#34–#39** are the **integer-minor-units refactor** ([ADR 0003](../docs/adr/0003-money-as-integer-minor-units.md), grilled 2026-06-08): replace every `Currency` (float) money field with `Long Int` — amounts in minor units (paisa/cent), rates in `minor×10⁶`. A cross-cutting hardening pass over the now-built engine; all AFK (per-row round-trip assertions are the migration safety net). **Must land in dependency order** — #34 (the shared `money` module) first, then the flips (#35→#36, #37), then the boundaries (#38, #39) — because money math breaks under mixed float/int representations. Folds into #27 (rates) and #23 (migration tooling).
