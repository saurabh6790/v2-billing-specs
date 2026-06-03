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
