# ERPNext Mapping

The single reference for the re-base: every concept from the from-scratch design and where it lands
now. Read alongside [ADR 0005](docs/adr/0005-build-on-erpnext-and-reuse-payments.md). "Custom"
means a DocType in the `central` app's `billing` module; "ERPNext" means a stock ERPNext DocType we
configure and write to; "payments" means `frappe/payments`.

## DocType map

| Original custom DocType | Re-based onto | Disposition |
|-------------------------|---------------|-------------|
| `Invoice` | **Sales Invoice** | Retired. Statutory + customer-facing invoice are one record. |
| `Invoice Line Item` | **Sales Invoice Item** | Retired. |
| `Plan` (bundle) | **Item** (service, `is_stock_item=0`) | Retired. Bundle = one Item; "rate is the price". |
| `Add-on` | **Item** (service) | Retired. Add-on = one Item; billed `qty × rate`. |
| `Plan Includes` | **Item** custom child / BOM-style attribute | Retired → composition stored as Item spec + allowance. |
| `Catalog Rate` | **Item Price** (price list per currency; region via Pricing Rule) | Retired. |
| `Tax Profile` | **Sales Taxes and Charges Template** + **Tax Category** + **Tax Withholding Category** | Retired. |
| `Payment Attempt` | **Payment Request** (initiate) + **Payment Entry** (settle) | Retired. |
| `Webhook Event` | Kept custom (dedupe log) **or** payments `Integration Request` | Thin; see [payments.md](payments.md). |
| `Refund` | **Payment Entry** (Pay, against return / credit note) | Retired; ERPNext return-invoice + Payment Entry. |
| `Payment Method` | Kept custom, links payments gateway token | Kept (see below). |
| `Payment Gateway` | **payments `Payment Gateway`** + `<Gateway> Settings` | Replaced by payments. |
| `Subscription` (intent) | **Custom — kept** | Two-axis state; not ERPNext Subscription. |
| `Subscription Change` | **Custom — kept** | Append-only history. |
| `Price Lock` | **Custom — kept** | `resource_id` grandfathering; no ERPNext equivalent. |
| `Credit Ledger Entry` | **Custom — kept**, posts to ERPNext Payment Entry (advance) | Wallet ledger; GL stays whole. |
| `Credit Wallet` | **Custom — kept** | Lock anchor for concurrency. |
| `Trust Tier` / `Trust Tier Level` | **Custom — kept** | Entitlement cap; not accounting. |
| `Entitlement Token` | **Custom — kept** | Ed25519 signed offline token. |
| `Commitment` | **Custom — kept** + **Pricing Rule** for the discount | Floor/clawback custom; discount via Pricing Rule. |
| `Usage Rollup` / `Usage Meter` | **Custom — kept** (Agent + Central) | Feeds Sales Invoice Items. |
| `Billing Notification Log` / `Notification Preference` | **Custom — kept** | Sole-sender suite. |
| `Billing Profile` | **Customer** (+ custom fields) | Map team → ERPNext Customer; profile fields as custom fields. |

## Concept map (behaviour, not just tables)

| Concept | Original | Re-based |
|---------|----------|----------|
| Draft → Open → Paid | Custom invoice states | Sales Invoice `docstatus` 0→1 + `status` (Unpaid/Paid/Overdue) |
| Two-phase generation (28th draft, 1st collect) | Custom scheduler | Same scheduler; phase-1 makes **draft Sales Invoices**, phase-2 **submits + Payment Request** |
| Proration / `qty × rate` | `money` module, rate units | **Unchanged** — computed in minor units, written to Sales Invoice Item as major-unit decimal at the boundary |
| Output tax (GST/VAT) | Custom additive block | **Sales Taxes and Charges** rows (template by Tax Category) |
| Zero-rating (SEZ/export) | Custom `zero_rating_reason` | ERPNext SEZ / export Tax Category + **LUT** (regional) |
| Withholding (TDS) | Custom `tds_amount`/`expected_collection` seam | **Tax Withholding Category** — native: Payment Entry withholds, invoice stays whole |
| Credit waterfall (credits→card) | Custom | Custom wallet allocation, then Payment Request for the remainder |
| ERPNext sync (async, one-way) | old issue #17 | **Deleted** — Sales Invoice is the record, written in-process |
| Gateway adapter contract | Bespoke `GatewayAdapter` class | **Extension methods on payments controllers** (charge/refund/webhook/mandate) |
| Money representation | Integer minor units everywhere | Minor units in the **compute core**; major-unit decimal at the **Sales Invoice boundary** (round-off disabled) — see [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) |

## The money boundary (important)

ERPNext stores money as `Currency` (float). [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)
is **not** abandoned — it governs everything *before* the Sales Invoice:

```
Agent runtime + Price-lock (rate units, minor×10⁶)
        │  proration / qty×rate, round half-away-from-zero ONCE per line
        ▼
Line amount in integer MINOR units  ──┐
        │                             │  money.from_minor(amount, currency)  → Decimal(exponent dp)
        ▼                             ▼
Credit ledger / gateway charge      Sales Invoice Item.rate / .amount  (major-unit Decimal)
(stay integer minor units)          ERPNext round-off DISABLED → grand_total == paise-precise total
```

So: the charge the gateway sees and the credit ledger are integer minor units (gateway-exact); the
Sales Invoice is the major-unit decimal presentation, equal to the minor-unit total to the paisa.
The `money` module + curated ISO-4217 exponent table remain the only place conversion/rounding live.

## What disappears

- **Old #17** ERPNext async sync — there is no second invoice.
- **Old #24** decommission frappe/payments — reversed; payments is now a dependency.
- The custom `Invoice`, `Invoice Line Item`, `Payment Attempt`, `Tax Profile`, `Catalog Rate`,
  `Plan`, `Add-on`, `Payment Gateway`, `Refund` DocTypes — migrated to ERPNext primitives and
  retired (see [migration.md](migration.md)).
