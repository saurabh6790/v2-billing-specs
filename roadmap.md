# Roadmap

Phasing for the ERPNext-rebased billing platform. The domain phases are unchanged from the original
plan; the re-base changes *what each slice builds on* (ERPNext primitives + `frappe/payments`), and
deletes/reverses a few slices. See [issues/README.md](issues/README.md) for the slice list.

**Targets:** Demo 30 Jun 2026 · Feature-complete 31 Jul 2026.

## Foundation (ERPNext + payments base)

- Confirm the bench: `frappe` + `erpnext` + `payments` + `central` (billing module). Done —
  `/Users/frappe/workspace-2/cenral-bench`.
- **Catalog on ERPNext** — bundles/add-ons as Items, rates as Item Prices, region/commitment via
  Pricing Rule; price-lock kept custom.
- **`money` module** — minor-unit ISO-4217 table + `to_minor`/`from_minor`/`round_rate`; the Sales
  Invoice boundary (round-off disabled). Re-scopes old #34–#39.
- **Gateway base** — `frappe/payments` `Payment Gateway` + settings controllers, extended with the
  `FCGatewayMixin` (off-session charge, signature-first webhook spine, validated self-wiring setup).
  Reverses old #24.

## P2 — intent, events, methods, credits

- Agent event log + push + Central price-lock.
- Subscription intent + two-axis state (custom).
- Payment Method lifecycle (Stripe SetupIntent + micro-charge) over payments controllers.
- Credit ledger + wallet + concurrency; mirror advances into ERPNext.
- Trust tier + entitlement token.

## P3 — invoicing, charge, tax, dunning

- Postpaid two-phase generation → **Sales Invoice**.
- Charge → **Payment Request** → webhook → **Payment Entry** → Paid.
- Credit waterfall + wallet gating.
- Metered billing → Sales Invoice Items.
- Tax: **Sales Taxes (GST/SEZ)** + **Tax Withholding (TDS seam)** — config, not custom code.
- Retry/dunning + staged suspension; refunds (return invoice + Payment Entry).
- Commitment spend-floor (Pricing Rule discount) + clawback; live-priced snapshot add-on.
- Razorpay + UPI Autopay mandate; secondary methods + fallback.

## P4 — dashboards, notifications, hardening

- Customer dashboard + forecast; admin dashboard (Central rebuilds the UI against the APIs).
- Notification suite (sole sender).
- Reconciliation job on ERPNext Payment Reconciliation (HITL terminal-state model).
- Security + load hardening (100-sub run).

## Deleted / reversed by the re-base

- **Old #17 (ERPNext async Sales Invoice sync)** — deleted; the Sales Invoice *is* the invoice,
  written in-process.
- **Old #24 (decommission frappe/payments)** — reversed; payments is a dependency.
- **Old #34–#39 (integer-minor-units refactor)** — re-scoped into the `money` module + the Sales
  Invoice boundary.

## Post-launch

- PayPal adapter (over payments PayPal Settings).
- Per-team migration tooling off the old custom DocTypes (HITL) — see [migration.md](migration.md).
- Multi-currency credits; tiered pricing.
