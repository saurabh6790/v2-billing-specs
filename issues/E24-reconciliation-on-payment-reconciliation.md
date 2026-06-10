# E24 — Reconciliation on ERPNext Payment Reconciliation + gateway scan

**Builds on:** ERPNext · **Replaces:** old #21 · **Phase:** P4 · **Type:** HITL
**Blocked by:** E10

## Goal

The daily job that resolves the **"charged-at-gateway-but-never-webhooked"** terminal state without
double-charging or leaving revenue uncollected — the single most important hardening job. Built on
ERPNext **Payment Reconciliation** + **Payment Ledger Entry** plus a gateway status scan. See
[payments.md](../payments.md).

## Scope

- **Scan** ambiguous states: Sales Invoices `Unpaid`/`Overdue` with an in-flight Payment Request and
  no terminal webhook; Payment Requests stuck `initiated`/`authorised` past a threshold.
- **Gateway truth:** `fc_get_transaction_status(txn_id)` for each — if the gateway says **captured**
  but we have no Payment Entry, **create the Payment Entry** (idempotency key prevents a re-charge)
  and settle via Payment Reconciliation; if **failed**, record failure → fallback/dunning; if still
  **pending**, leave for the next run.
- **HITL terminal-state model:** ambiguous/disputed cases surface to an operator with a
  `resolved_by` provenance field recording the human decision (the open design item from old #21).
- Read-only against the gateway except for the idempotent Payment Entry creation.

## Acceptance

- A charge captured at the gateway whose webhook was lost is settled within a day, exactly once
  (no double Payment Entry, no double charge).
- Payment Reconciliation matches the Payment Entry to the Sales Invoice; the GL balances.
- Operator-resolved cases record who decided and why (`resolved_by`).

## Out of scope

The webhook hot path (E03/E10); dunning escalation (E14).
