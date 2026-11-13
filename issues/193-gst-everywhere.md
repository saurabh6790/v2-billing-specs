# 193 — GST is not applied, labelled or filed consistently across billing

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** L · **Labels:** `type:bug` `priority:p1` `area:tax`
**Area:** central/billing/revenue/tax.py, central/billing/ingester/gst.py, central/billing/payments/mandates.py, central/billing/payments/payments.py, central/billing/payments/settlement.py, central/billing/doctype/billing_profile/, dashboard/src/components/billing/, central/fixtures/notification_event_type.json
**Source:** GST audit, 13 Nov 2026, requested during the #191 review.

> **Decided (13 Nov 2026):** labels read "IGST 18%", "CGST 9% + SGST 9%" or "No GST (SEZ)". New mandates register `min(₹15,000, tier cap × (1 + GST rate))`; existing mandates are raised through the normal re-authorisation. Indian profiles with no state are asked for it in-app (billing address state where known); until a state is set, IGST applies and is shown. Build A (correctness) before B (labels), both before #147.

## Problem

Central knows only one combined GST rate. The IGST or CGST + SGST split exists only at the ERPNext boundary. Some limits compare pre-tax caps with GST-inclusive debits. One SEZ case files different tax from what is charged. Screens and notices say "GST" without naming the tax, or do not say whether an amount includes it.

## Evidence

- Production backup (read-only counts): 114 of 130 INR Billing Profiles have no state. With no place of supply, ERPNext applies IGST.
- Production backup: 0 zero-rated Tax Profiles; active mandates with a max amount: 2 card, 1 UPI.

## A — correctness

1. An SEZ team with a lapsed GSTIN is charged GST (`tax.py:84`), but `ingester/gst.py` `_zero_rated_sez` ignores the lapse, so the ERPNext invoice and top-up receipt carry no GST.
2. The mandate max is the pre-tax tier cap (`payments.mandate_ceiling`, `mandates.setup_mandate`, re-auth). A bill at the cap is debited cap × 1.18, above the mandate.
3. UPI eligibility compares the pre-tax cap with ₹1,00,000.
4. Credits-only headroom counts promotional credit at face value, though it must also pay GST.
5. Indian profiles without a state: ask for it; IGST until set.

## B — clarity

6. One tax label from the tax profile, used on the top-up dialog, invoices, forecast, wallet history, cycle breakdown and the top-up reminder.
7. Notices state whether amounts include tax: Payment Scheduled, Payment Reminder, Action Required, the payment panel, the invoice email.
8. The pre-debit notice shows the amount it will debit, with GST.
9. Forecast shortfall and "covers N%" count GST already paid with top-ups.
10. Spend-limit bars compare pre-tax spend with the pre-tax limit (D-13) and say "before tax".

## Acceptance criteria

- [ ] What is charged and what ERPNext files agree for every tax profile, including SEZ with a lapsed GSTIN.
- [ ] A bill at the tier cap is within the team's mandate.
- [ ] Every customer-visible amount that includes tax names it ("incl. IGST 18%"); SEZ shows "No GST (SEZ)".
- [ ] Indian profiles without a state are asked for it; IGST is shown until then.
