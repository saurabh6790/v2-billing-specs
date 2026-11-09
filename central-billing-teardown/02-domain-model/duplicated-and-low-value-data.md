# Duplicated and low-value data

What the customer sees more than once, sees on different bases, or sees but cannot
use. Paths are at central `a95b491e`.

## 1. One fact, many places

| Fact | Where it appears | Source | Same basis? |
|---|---|---|---|
| This cycle's cost | (1) This cycle headline, (2) Subscriptions header, (3) Limits "Spend per cycle", (4) chart's current bar, (5) breakdown tray total | (1)(3)(5) `get_forecast`; (2) `cycle_costs`; (4) `forecast.measured` or `projected_total`, whichever is set | **No.** (1)(3)(5) include tax and the rest of the month. (2) is before tax and only what has run. (4) is "measured" when present. |
| Spending limit | This cycle bar, Limits card, chart line, Tiers tray, plan menu | `trust_tier.current.max_spend` | Same limit, compared with **three** different spend figures (see F-01) |
| Wallet balance | Facts card, Wallet history subtitle, Payments "Prepaid credits" row | `credit_balance` | Yes |
| Outstanding amount | Outstanding banner, facts card "Due now" | `statement.opening + closing_outstanding`, computed twice in the browser (`BillingOverviewPage.vue:31-38`, `OutstandingAlert.vue:17-22`) | Yes, but the sum is written twice |
| Next payment date | Facts card, Payment schedule tray | `next_payment`, `payment_schedule` | Yes, two endpoints |
| Cycle end | "Bills in N days" badge, "Next invoice" row | `forecast.days_remaining`, `forecast.period_end` | Yes. Same date under two names. |
| Payment method | Facts card, Payments list, Payment schedule "From" | `payment_methods`, `payment_schedule.method` | Yes |
| Invoice rows | Invoices tab, Statement tab | `list_invoices`, `statement` | Same rows. Statement adds only "Paid" and CSV. |
| Metered service usage | Subscriptions table service rows, `MeteredServicesCard` | `metered_services` | The card is not mounted anywhere (dead) |

## 2. Data that adds nothing for a customer

| Data | Where | Why it adds nothing | Action |
|---|---|---|---|
| Invoice type "Billable" / "Cost Report" | Invoice panel subtitle (`BillingInvoicesPage.vue:186`) | Internal classification. A trial customer reading "Cost Report" has no idea what it means. | Drop, or say "Free trial: not charged" for cost reports |
| Raw gateway refund id | Refunds card (`RefundsCard.vue:75-80`) | Only useful to support. Customers quote the invoice, not the refund id. | Move behind a "Copy reference" action |
| Auto-recharge switch | Wallet history header (`WalletHistoryPanel.vue:51-57`) | Does nothing | Remove until built |
| Email invoice button | Invoice panel (`BillingInvoicesPage.vue:195-201`) | Always disabled | Remove until built |
| "Bills in N days" badge | This cycle card | Same date as "Next invoice" two cards over, and it is not the day money leaves the account | Replace with the payment date, or drop |
| Ledger `created_at` raw string | Wallet history (`WalletHistoryPanel.vue:98`) | Unformatted, includes seconds | Format as a date like every other money row |
| Statement "Paid" before "Amount" | `StatementCard.vue:27-32` | Reads backwards | Amount, Paid, Status |

## 3. Data that is missing where the decision is made

| Decision | Missing fact | Where it should show |
|---|---|---|
| Add a card | The size of the temporary validation charge and when it is refunded | Before "Add card" is pressed, not after |
| Buy a server | That billing is hourly, that tax is extra, and that a stopped server is not billed | Plan menu or summary |
| Remove a card | That it is the last chargeable method and an invoice is outstanding | Remove dialog |
| Make a card primary on a Prepaid team | That this turns on automatic charging | Before the change, in the menu or a confirm |
| "Primary payment method" is disabled | Why (wallet balance is paying first) | Tooltip or helper text on the disabled item |

## 4. Figures computed in the browser

The browser does money arithmetic in a few places. Each one is a second copy of a
rule the server also owns, so the two can drift.

| Calculation | File | Server owner |
|---|---|---|
| Top-up GST = `round(amount × rate) / 100` | `TopupDialog.vue:55-60` | Top-up order creation |
| Outstanding = opening + closing | `BillingOverviewPage.vue:31-38`, `OutstandingAlert.vue:17-22` | Statement |
| Over-limit split of the current bar | `EstimatedCard.vue:56-62`, `SpendCard.vue:67-77` | Entitlements |
| Wallet coverage "Covers 63% of this cycle" | `CycleFacts.vue:81-89` | Forecast |

Return these from the API. The browser should format, not compute.
