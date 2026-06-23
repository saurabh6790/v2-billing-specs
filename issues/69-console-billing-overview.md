# 69 — Console Billing › Overview (consolidated)

**Type:** AFK · **Milestone:** Console UI migration (CO) · **Spec:** [console-migration.md](../console-migration.md)

## What to build

The consolidated Billing Overview page (per the new design) — it **absorbs** the
legacy Overview, Credits, PaymentMethods, Subscriptions, and Settings pages into
one scrollable surface in `console/` (TypeScript).

Cards, top to bottom:

- **Estimated this cycle** — forecast + day-of-cycle + alert threshold + MoM delta
  (`get_team_overview`, `get_forecast`).
- **Wallet** — balance, **+ Add** (topup via #67), auto-recharge state
  (`get_credit_balance`, `credit_ledger`, `create_topup_order`/`confirm_topup`).
- **Payment methods** — primary/backup, add/reorder/set-default/remove
  (`list_payment_methods`, `get_payment_method_options`, setup/confirm/reorder/
  set-default/remove).
- **Billing contact** — email + address, edit (`get_billing_profile`/`save_billing_profile`).
- **Subscriptions** — per-server plan · region · monthly price (`list_subscriptions`).
- **Tax & compliance** — region + GSTIN (`get_billing_profile`/`save_billing_profile`).
- **Stop billing** — suspend all servers (🟡 endpoint TBD — raise at slice start).

## Acceptance criteria

- [ ] All cards render real data; mutations persist (POST endpoints; no GET-write rollback).
- [ ] Add/reorder/remove/set-default payment method works; wallet top-up completes via #67.
- [ ] View-only members see the page read-only (`canManage` from `useCapabilities`).
- [ ] `vue-tsc` clean; frappe-ui beta components reconciled.

## Blocked by

- #66, #67

## Notes

- **Grounding gaps:** Stop billing + auto-recharge toggle have no endpoint yet — confirm/extend before building those controls.
- Money/status via `lib/{format,status}`; one solid primary per card group.
