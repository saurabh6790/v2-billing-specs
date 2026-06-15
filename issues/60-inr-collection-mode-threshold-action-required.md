# 60 — INR collection mode + ₹15k threshold + "Action Required" choice

> **Renumbered 2026-06-15:** was #50; moved to #60 to free the #50–#59 block for the Atlas-integration (AT) milestone. The implemented central code/commits reference the original "#50".

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [payments-inr.md](../payments-inr.md), [ADR 0005](../docs/adr/0005-inr-collection-emandate-threshold-prepaid.md), [payments.md](../payments.md) · **Design:** [docs/design/inr-collection-action-required.md](../docs/design/inr-collection-action-required.md)

## What to build

Approach B from [ADR 0005](../docs/adr/0005-inr-collection-emandate-threshold-prepaid.md): usage-based INR collection that auto-charges silently while the bill stays ≤ ₹15,000, and at the threshold hands the customer a **choice** (pay-per-invoice vs prepaid wallet) instead of failing — without blocking the account.

1. **`collection_mode`** on the team/subscription: `stripe_auto` · `emandate` · `manual_checkout` · `prepaid` · `action_required` (transient). Drives charging and dunning copy.
2. **Capability-driven collection layer.** Adapters declare `supports_off_session_charge`, `max_silent_charge` (Stripe = ∞, Razorpay = ₹15,000 = `1_500_000` paise), `requires_predebit_notice`. The charge loop picks a silent rail by (currency, amount) or routes to the customer-chosen path.
3. **Threshold detection.** Trip `action_required` when an `emandate` team's **invoice OR month-to-date forecast** ≥ `min(₹15,000, tier cap)` (forecast reuses [#18](18-customer-dashboard-forecast.md)). Hysteresis: don't auto-revert to `emandate` on a later small month.
4. **Razorpay e-mandate ≤ ₹15k path** with the pre-debit notification step before the off-session debit; webhook-confirmed settlement (extends [#10](10-charge-invoice-payment-attempt-webhook.md)).
5. **The choice flow (API + state):** `choose_collection_mode(team, mode)` → sets mode, clears `action_required`, opens the relevant next step (payable invoice / top-up). Reversible from settings.
6. **Manual checkout** reuses the on-session one-time Razorpay checkout (top-up machinery) against an invoice — any amount, no AFA wall.
7. **Action-Required surface API:** a read endpoint feeding the banner — `{action_required, reason, threshold, projected_total, current_invoice_total, wallet_balance, open_balance, shortfall}` — plus a notification ([#20](20-notification-suite.md)) on trip.
8. **Mode-aware dunning** ([#14](14-retry-dunning-suspension.md)): postpaid → retries; manual/prepaid → "pay this invoice" / "top up." Account keeps running until the normal suspension window.
9. **Retire** the standalone PayPal adapter ([#25](25-paypal-adapter.md)); PayPal becomes a Razorpay top-up method.
10. **UI:** the "Action Required" banner + choice flow + settings mode switch (per the design brief). Backend ships the data; design team refines the visuals.

## Acceptance criteria

- [x] `collection_mode` exists with the five values; defaults sane per currency (INR → `prepaid` or chosen; international → `stripe_auto`).
- [x] Adapter capability flags drive rail selection; `max_silent_charge` enforced (Razorpay ≤ ₹15k, Stripe ∞).
- [x] An `emandate` team whose invoice/forecast crosses `min(₹15k, tier cap)` flips to `action_required`, raises a banner + notification, and is **not** silently charged or blocked.
- [x] `set_collection_mode` sets `manual_checkout` or `prepaid`, clears `action_required`, and is reversible from settings.
- [x] `manual_checkout` invoices pay on-session for **any amount** (no ₹15k limit), webhook-confirmed (never premature `Paid`).
- [~] `prepaid` draws the wallet; under-funded → partial + `Open` remainder + top-up prompt. *(existing credit waterfall #11; mode now routes to it — no new code.)*
- [x] Razorpay e-mandate ≤ ₹15k charges off-session after a pre-debit notification.
- [x] No off-session >₹15k AFA-link state machine exists (explicitly out of scope).
- [x] Standalone PayPal adapter removed; INR routing/tests updated.
- [x] Banner-feed read endpoint returns the documented fields; dunning copy is mode-aware.

**Done** (commits on `fixes`): items 1+5 `5a45d49`, item 4 `8929d7f`, item 2 `60d9809`, item 3 `77b4fd4`. Tests: `test_collection_mode` (16), `test_emandate` (4), plus charges/dunning/dashboard/webhooks/adapters green. Demo-seed `collection_mode` wiring is the only nice-to-have left.

## Blocked by

- #10
- #11
- #14
- #18

## Notes

- **Lean v1 option (ADR 0005):** ship with INR limited to `manual_checkout` / `prepaid` only (both on-session, zero AFA machinery) and add the ≤ ₹15k silent `emandate` rail later. Items 4 + the e-mandate parts of 2/3 become the follow-up; everything else still lands.
- The ₹15k cap is **RBI**, gateway-independent — not a place to "try another gateway." Above it, on-session or prepaid is the only path.
