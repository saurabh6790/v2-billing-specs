# Calculation risks

Snapshot `a95b491e`. Each risk: what can go wrong, evidence, likelihood, impact, proposed change.
Severity follows the README scale. Likelihood is judged from code; no invoice data
was read. "Certain" means the code always behaves this way, not that harm has been
observed. Proposed changes are on hold until the risk is measured.

| ID | Risk | Evidence | Likelihood | Impact | Severity | Proposed change (on hold) |
|---|---|---|---|---|---|---|
| R-01 | **Two tax computations.** Central charges `total = base + round(base × 18%, 2)`. ERPNext builds the tax invoice from its template rows (CGST 9% + SGST 9%, each rounded by ERPNext). The legal invoice and the amount charged can differ by a paisa. The payment entry posts `min(attempt.amount, outstanding)`, which hides the gap instead of flagging it. | `revenue/tax.py:86`; `ingester/erpnext_sync.py:166-168,323`; `ingester/gst.py:47-56` | Medium: happens on bases where the two half-rates round differently | A Sales Invoice left with ₹0.01 outstanding, or a paisa over-collected; reconciliation noise for finance | P2 | Send Central's tax amounts to ERPNext as `Actual` rows, or split CGST/SGST in Central with the same rounding, and add an invariant comparing the two totals |
| R-02 | **Per-line rounding before sum.** Each line is rounded to 2 dp, then summed. A team with many small hourly segments accumulates rounding. | `lines.py:349,390`; `generate.py:197` | High that it happens, low size (≤ ₹0.005 × lines) | Totals differ from "rate × usage" by paise; hard to explain if a customer recomputes | P3 | Keep unrounded amounts on lines, round once at subtotal; or document the rule on the invoice |
| R-03 | **One unpriced meter blocks the whole invoice.** `metered_line_items` throws if any metered resource has no rate, so the team gets no invoice at all for the month. | `revenue/metering.py:477-482` | Low (needs a catalog gap) | Revenue delay for all of the team's usage; retried hourly until someone adds the rate | P2 | Bill the priced lines; hold only the unpriced meter with an operator alert |
| R-04 | **Below-minimum months are forgiven, not carried.** A team whose month is under the minimum invoice amount is never billed for it. | `generate.py:333-350` | Medium for small teams | Small leakage per team, by design | P3 | Confirm intent; consider carrying forward to the next invoice |
| R-05 | **No Central ↔ ERPNext balance check.** Wallet top-ups mirror as ERPNext advances; there is no invariant comparing the two. | `platform/invariants.py` (7 checks, none cross-system) | Medium | Advance balance drifts silently; found at year end | P2 | Add a daily cross-system check per team and currency |
| R-06 | **Browser computes top-up GST.** The dialog computes `round(amount × rate) / 100` from a rate the server rounds to 2 dp; the server computes `flt(credit × rate, 2)` and reverses `paid / (1 + rate)`. | `dashboard/src/components/TopupDialog.vue:55-60`; `api/dashboard/invoices.py:722`; `revenue/credits.py:413-435` | Low | The "Total to pay" shown can differ by a paisa from what the gateway asks | P3 | Return the payable amount from the server |
| R-07 | **Three "spend vs limit" figures.** The console compares the limit with: subtotal before tax, total with tax, and measured-so-far. The gate compares it with the sum of monthly run-rates. | `EstimatedCard.vue:56-62`; `useSpendingLimits.ts:38,56-60`; `SpendCard.vue:63-65`; `catalog/subscriptions.py:1066-1072` | Certain | Customer is refused a server while the screen shows room (or the reverse) | P1 (see F-01) | One server-computed "limit used" figure, the same one the gate uses |
| R-08 | **Proration denominator varies by month.** Day rate = monthly rate ÷ days in period. | `lines.py:145-152` | Certain | A 10-day server costs more in February than in July; defensible, but not stated anywhere a customer sees | P3 | State the rule on the plan menu and invoice |
| R-09 | **Partial refund leaves attempt Captured.** Only a full refund moves the attempt to Refunded; partial refunds are tracked only on Refund rows. | `states.py:58-68`; `payments/corrections.py` | Certain | Reports that read attempt status overstate collected money | P3 | Add `refunded_amount` on the attempt, or report from Refund rows |
| R-10 | **Team standing read three ways.** Dunning uses an anchor subscription; the console uses an arbitrary row; the provision gate uses "any row off Current". | [entity-ownership.md](../02-domain-model/entity-ownership.md) | Medium | Customer sees "Current" while being dunned, or the reverse | P2 | Store standing on Billing Profile |

## What could not be verified statically

- The real size of R-01 drift. It needs a sample of Central invoices next to their
  ERPNext Sales Invoices.
- Whether any production team has hit R-03 (search Billing Run Failure errors for
  "unpriced metered usage").
- Whether rounding in R-02 has ever produced a customer complaint.
