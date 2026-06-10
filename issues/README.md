# Issues — Frappe Cloud v2 Billing (ERPNext-rebased)

Tracer-bullet vertical slices for the ERPNext-rebased billing platform. Each is independently
grabbable and demoable. Derived from [the spec](../README.md) and re-based per
[ADR 0005](../docs/adr/0005-build-on-erpnext-and-reuse-payments.md).

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

The original (`/Users/frappe/workspace/billing-specs`) issues #01–#45 were written for a from-scratch
engine. This list re-bases them: **E-prefixed** slices build on ERPNext + `frappe/payments`. The
disposition table below maps every old issue to its fate.

## Re-based slice list

| # | Slice | Builds on | Replaces (old #) | Phase |
|---|-------|-----------|------------------|-------|
| [E01](E01-catalog-on-erpnext-items.md) | Catalog → **Item + Item Price + Pricing Rule**; price-lock kept custom | ERPNext | 01, 27, 33 | Foundation |
| [E02](E02-money-module-and-sales-invoice-boundary.md) | `money` module (minor units) + **Sales Invoice boundary** (round-off off) | ERPNext | 34–39 | Foundation |
| [E03](E03-gateway-on-payments-mixin-webhook-spine.md) | Gateway base: **reuse frappe/payments** + `FCGatewayMixin` + signature-first webhook + validated setup | payments | 02, 24, 40 | Foundation |
| E04 | Agent event log + push + Central price-lock | custom | 03 | P2 |
| E05 | Subscription intent + two-axis state; team→**Customer** link | custom | 04 | P2 |
| E06 | Payment Method lifecycle (Stripe) over payments controllers | payments | 05 | P2 |
| E07 | Credit ledger + wallet + concurrency; **mirror advances into ERPNext** | custom + ERPNext | 06 | P2 |
| E08 | Trust Tier + Entitlement Token | custom | 07 | P2 |
| [E09](E09-invoice-generation-to-sales-invoice.md) | Postpaid two-phase generation → **Sales Invoice** | ERPNext | 09 | P3 |
| [E10](E10-charge-payment-request-payment-entry.md) | Charge → **Payment Request** → webhook → **Payment Entry** → Paid | ERPNext + payments | 10 | P3 |
| E11 | Credit waterfall + wallet gating (credits then card) | custom + ERPNext | 11 | P3 |
| E12 | Metered billing → **Sales Invoice Items** | custom + ERPNext | 12 | P3 |
| [E13](E13-tax-via-sales-taxes-and-withholding.md) | Tax: **Sales Taxes (GST/SEZ)** + **Tax Withholding (TDS seam)** — config | ERPNext | 13 | P3 |
| E14 | Retry/dunning + staged suspension (off Sales Invoice status) | ERPNext + custom | 14 | P3 |
| E15 | Refunds — **return invoice + Payment Entry** to source / wallet | ERPNext | 15 | P3 |
| E16 | Free/trial cost_report (unsubmitted/flagged draft) | ERPNext | 16 | P3 |
| E17 | Razorpay + UPI Autopay mandate (cap = tier) | payments | 08 | GW/P3 |
| E18 | Secondary methods + settlement fallback + UI | custom + payments | 28, 29 | P3 |
| E19 | Commitment spend-floor (**Pricing Rule** discount) + clawback | ERPNext + custom | 30, 31 | P3 |
| E20 | Live-priced snapshot add-on (current Item Price) | ERPNext + custom | 32 | P3 |
| E21 | Customer dashboard + forecast | API | 18, 26 | P4 |
| E22 | Admin dashboard | API | 19, 26 | P4 |
| E23 | Notification suite (sole sender) | custom | 20 | P4 |
| [E24](E24-reconciliation-on-payment-reconciliation.md) | Reconciliation on **ERPNext Payment Reconciliation** + gateway scan | ERPNext | 21 | P4 (HITL) |
| E25 | Security + load hardening (capability IAM, 100-sub run) | central.iam | 22 | P4 |
| E26 | PayPal over payments PayPal Settings | payments | 25 | post |
| E27 | Per-team migration off the custom DocTypes | — | 23 | post (HITL) |

Foundation slices (**E01–E03**) and a few materially-changed slices (**E09, E10, E13, E24**) have
full issue files in this directory. The remaining slices keep the **logic** of their original issue
(linked above by old #) and change only the substrate per [erpnext-mapping.md](../erpnext-mapping.md);
they're written up as their original spec adjusted by the mapping, not re-authored from zero.

## Disposition of the original 45 issues

| Old # | Fate under the re-base |
|-------|------------------------|
| 01 App scaffold + Plan catalog | → **E01** (Item + Item Price); app already scaffolded as `central/billing` |
| 02 Gateway adapter + webhook | → **E03** (reuse payments + mixin) |
| 03 Agent event log + price-lock | → **E04** (unchanged) |
| 04 Subscription intent + two-axis | → **E05** (+ Customer link) |
| 05 Payment Method lifecycle | → **E06** |
| 06 Credit ledger + wallet | → **E07** (+ ERPNext advance mirror) |
| 07 Trust Tier + Entitlement Token | → **E08** (unchanged) |
| 08 Razorpay + UPI mandate | → **E17** |
| 09 Postpaid invoice generation | → **E09** (Sales Invoice) |
| 10 Charge → attempt → webhook | → **E10** (Payment Request/Entry) |
| 11 Credit waterfall | → **E11** |
| 12 Metered billing | → **E12** (Sales Invoice Items) |
| 13 Tax GST/SEZ/TDS | → **E13** (Sales Taxes + Tax Withholding — now config) |
| 14 Retry/dunning/suspension | → **E14** |
| 15 Refunds | → **E15** (return invoice + Payment Entry) |
| 16 Free/trial cost_report | → **E16** |
| **17 ERPNext async sync** | **DELETED** — Sales Invoice is the record, in-process |
| 18 Customer dashboard | → **E21** |
| 19 Admin dashboard | → **E22** |
| 20 Notification suite | → **E23** (unchanged) |
| 21 Reconciliation job | → **E24** (ERPNext Payment Reconciliation) |
| 22 Security + load | → **E25** (capability IAM unchanged) |
| 23 Migration tooling | → **E27** (now app-internal off custom DocTypes) |
| **24 Decommission frappe/payments** | **REVERSED** — payments is now a dependency |
| 25 PayPal adapter | → **E26** (over payments) |
| 26 Frontend scaffold | folded into **E21/E22** (Central rebuilds UI) |
| 27 Rates → standalone DocType | → **E01** (Item Price already standalone) |
| 28 Secondary payment methods | → **E18** |
| 29 Razorpay card-or-UPI | → **E18/E17** |
| 30 Commitment spend-floor | → **E19** (Pricing Rule discount) |
| 31 Commitment clawback | → **E19** |
| 32 Live-priced snapshot | → **E20** |
| 33 Plan Configurator UI | → **E01** (Item authoring) |
| **34–39 Integer-minor-units refactor** | **RE-SCOPED** into **E02** (money module + Sales Invoice boundary) |
| **41–45 Central Merge** | **DONE** — billing already a module in `central` ([ADR 0004](../docs/adr/0004-billing-as-central-module-capability-iam.md)) |
| 40 Gateway setup validate/auto-fill | → **E03** |

## Land order

**E02 → E01 → E03** (foundation) first — money boundary, catalog, gateway seam. Then P2 (E04–E08),
P3 (E09–E20), P4 (E21–E25). E26/E27 post-launch. E24 and E27 are **HITL** (reconciliation
terminal-state model; migration sign-off).
