# 167 — Operators cannot charge again, send a payment link or release a hold from an invoice; Cancel shows no effects

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** M · **Labels:** `type:operations` `priority:p2` `area:operator-desk`
**Area:** `central/billing/doctype/`, `central/identity/doctype/team/`, `central/workspace_sidebar/billing.json`
**Source:** [CB-19](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

> **HITL:** needs decision D-03 in [product-decisions-required.md](../central-billing-teardown/13-brainstorming/product-decisions-required.md) before the parts it governs are built.

## Problem

Common collection tasks need engineering because Desk has no action for them.

## Current behaviour

- Invoice form actions: Cancel, Refund Part, Cancel and Refund, Retry Failed Refunds (`central/billing/doctype/invoice/invoice.js:6-42`).
- Cancel asks only for a reason (`:44-61`).

## What we want

Operators can retry collection, send a payment link and retry a held sync from the invoice, and see what Cancel will do before confirming.

**Who it affects:** Support; finance.

**Why it matters:** Escalations; slower cash.

## Options

- A. Add the three actions + an effects summary on Cancel.
- B. Put actions on the team view (#149) only.

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A, scoped by D-03.

## Acceptance criteria

- [ ] Each action requires operator permission and a reason, and writes a Billing Event.
- [ ] Cancel lists effects (credit note, dunning stop, refunds) before Confirm.

## Dependencies

D-03; #149.
