# 159 — Invoice receipt shows deductions above a Total that ignores them, hides TDS, and the Pay amount differs from Total

**Type:** AFK · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `type:ux` `priority:p2` `area:invoices`
**Area:** `dashboard/src/pages/billing/BillingInvoicesPage.vue`, `dashboard/src/components/billing/`, `central/billing/api/dashboard/invoices.py`
**Source:** [CB-01](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **Decided (9 Nov 2026):** D-10, the invoice list Amount column shows the invoice total.

## Problem

When credits, top-up GST or TDS apply, the receipt's figures do not add up and the amount to pay is not explained.

## Current behaviour

- Panel order: Subtotal, Tax, −Credits applied, −GST paid with top-ups, **Total** (= `total`, before deductions) (`BillingInvoicesPage.vue:243-295`).
- Button: "Pay {expected_collection} now" (`:400`); `expected_collection = total − tds_amount`, credits at open (`central/billing/revenue/invoicing/generate.py:205-208`). No TDS line.
- No affected invoices yet in production.
- Seen on central.local: Subtotal $25.00, Credits applied −$5.00, Total $25.00.

## What we want

Every figure is the sum of the lines above it, and the button equals Amount due.

**Who it affects:** Customers; customer accounts teams.

**Why it matters:** Distrust of the bill and support questions once credits or TDS apply.

## Options

- A. Invoice total → deductions → Amount due.
- B. Amount due only, breakdown on expand.
- C. Rename and reorder only.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] The list column is labelled "Total" and shows the invoice total; the amount still due appears on the invoice detail and the Pay button.
- [ ] Panel shows Invoice total, then each deduction including TDS, then Amount due.
- [ ] Pay button amount equals Amount due.
- [ ] List column label matches the figure shown (D-10 decided: total).
- [ ] A unit test of the panel covers credits, top-up GST and TDS.

## Dependencies

None.
