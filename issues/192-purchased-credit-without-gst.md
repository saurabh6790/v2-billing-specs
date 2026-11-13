# 192 — A paid INR top-up was booked with no GST and no ERPNext advance

**Type:** HITL · **Milestone:** TD · **Priority:** P2 · **Size:** S · **Labels:** `type:bug` `priority:p2` `area:payments`
**Area:** central/billing/revenue/credits.py (`purchase`, `_top_up_split`), central/billing/payments/charges.py (`_to_wallet`), central/billing/ingester/advance.py
**Source:** found during the #191 live test (13 Nov 2026).

## Problem

One INR team holds purchased credit with no GST recorded against it and no advance in ERPNext. When a bill draws that credit, the collector takes its GST from the next top-up, so the team pays GST again at bill time and its top-up ask is larger than the bill minus the wallet.

## Current behaviour (evidence)

Production backup, read-only counts:

- INR purchased credits (`Credit Ledger Entry`, `entry_type = Credit`, `paid_in = 1`): 1 row, 1 team.
  - `reference_type` Top-up, booked 23 Oct 2026, about ₹1,000.
  - `tax_amount` 0, a gateway payment id is set, `advance_id` is empty.
- `Top-up Order`: 1 row, status Created (the unfinished ₹25,000 order). No order is behind the 23 Oct credit.
- GST on Indian top-ups has been recorded since 29 Sep 2026 (`da91026d`).
- `credits.purchase` books `tax_amount = 0` when `_top_up_split` decides the team pays no GST on top-ups. `charges._to_wallet` also books gateway money to the wallet.

Not yet known: which path booked the 23 Oct credit, and why the advance sync did not run.

## What we want

1. Find the path that booked this credit, from the code and the read-only data.
2. If a path books a paid INR top-up without its GST, or without queueing the advance sync, fix it.
3. Decide with finance how to correct the one existing credit (GST and the advance in ERPNext).

## Acceptance criteria

- [ ] The booking path is named, with evidence.
- [ ] Every paid INR top-up records its GST (or a stated reason for none) and queues the advance sync.
- [ ] The existing credit is corrected or left with a recorded decision.
