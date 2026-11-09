# Screen-by-screen teardown

Each screen: what the customer comes to do, what works, what gets in the way.
`F-nn` points to [findings-register.md](../10-final-assessment/findings-register.md).
Paths are at central `a95b491e`.

---

## 1. Billing › Overview

`dashboard/src/pages/billing/BillingOverviewPage.vue`

**What the customer comes to do.** Three questions, in this order: *Do I owe
anything? What will this month cost? Am I about to hit a wall (limit, card,
suspension)?*

**Layout from top to bottom.**

1. Up to five banners (`BillingOverviewPage.vue:92-105`): outstanding/overdue,
   billing details missing, INR Action Required, free trial, GSTIN lapsed.
2. This cycle card (2/3 width) with the cycle facts card beside it.
3. Subscriptions card, with Projects and Stop all servers inside it.
4. Spend chart (2/3 width) with Breakdown and Limits beside it.

### What works

- The outstanding banner tells the story of the bill, not only the amount: "₹X
  overdue on your October invoice", then "Payment processing since…" or "2 payment
  attempts failed. Pay now to keep your servers running."
  (`OutstandingAlert.vue:59-80`). It switches its button to "View invoice" while a
  payment is in flight, so a customer cannot double-pay from here (`:82-93`).
- The headline is the amount the card will be charged, with tax, and the line under
  it splits subtotal and tax (`EstimatedCard.vue:192-222`).
- The cycle breakdown marks estimated lines and explains them in one sentence
  (`CycleBreakdownPanel.vue:86-90`, `ChargeBreakdown.vue:213-217`).
- The dunning ladder is published in advance: "Next retry", "Suspends on",
  "Suspended since", each with a tooltip (`lib/dunning.ts:18-61`).
- The GSTIN banner says what the customer loses (input tax credit, SEZ zero-rating)
  and offers both fixes: update or check again (`GstStatusBanner.vue:60-77`).

### What gets in the way

| # | Problem | Evidence | Finding |
|---|---|---|---|
| 1 | Three cards show "spend against your limit", each on a different basis, and none of them is the number the server-create gate uses. | `EstimatedCard.vue:56-62` (subtotal before tax), `useSpendingLimits.ts:38,56-60` (total with tax), `SpendCard.vue:63-65` (measured so far), `catalog/subscriptions.py:1066-1072` (gate: sum of monthly rates) | F-01 |
| 2 | The current-cycle cost appears five times: headline, Subscriptions header ("this cycle before tax"), Limits "Spend per cycle", the chart's last bar, and the breakdown tray total. They come from two endpoints (`forecast`, `cycle_costs`) and differ by tax and by what has run so far. | `EstimatedCard.vue:196`, `PayingForCard.vue:67-70`, `LimitsCard.vue:78-85`, `SpendCard.vue:63-78`, `CycleBreakdownPanel.vue:80-83` | F-08 |
| 3 | Four date ideas on one screen: "Bills in N days" (cycle end), "Next invoice" (cycle end again), "Next payment date" (charge day), and "Due" on invoices. "Bills in" and "Next invoice" are the same date with two names. | `EstimatedCard.vue:201-204`, `CycleFacts.vue:198-229` | F-08 |
| 4 | Up to five banners can stack above the fold. The trial, setup and Action Required banners can all be true for a new INR team. There is no order of importance. | `BillingOverviewPage.vue:92-105` | F-08 |
| 5 | The Subscriptions card holds three unrelated things: the cost list, project management, and a red "Stop all servers" button that asks you to type the team name. Destructive server control sits in the middle of the bill. | `PayingForCard.vue:111-139`, `StopAllServersRow.vue:76-98` | F-11 |
| 6 | "Pause billing" stops the server. So does the server's own Stop, and so does "Stop all servers". Three names for one effect, two of them under "billing". | `PayingForCard.vue:153-160`, `catalog/subscriptions.py:1134-1146` | F-11 |
| 7 | Pause and Resume show a success toast even when the server call fails. | `usePayingFor.ts:99-100` | F-03 |
| 8 | The Subscriptions empty state for a team with no servers offers one button: "Open Object Storage". Servers are the main product. | `PayingForCard.vue:80-88` | F-18 |
| 9 | Terminated servers stay in the Subscriptions list, greyed, for the rest of the cycle. With "View all" capped at 5 rows, they push live rows out of view. | `PayingForTable.vue:52,64-76`, `PayingForCard.vue:18,52` | F-18 |
| 10 | The page makes 19 API calls on first load. Each card loads on its own, so the page fills in pieces. | see [screen-map.md](../01-discovery/screen-map.md#overview-api-calls) | F-08 |

### Trays on the Overview

**Wallet history** (`WalletHistoryPanel.vue`)
- An "Auto-recharge" switch sits in the header. Flipping it shows "Auto-recharge
  isn't available yet" and flips back (`:27-31,51-57`). A control that cannot work
  should not be on screen. F-13.
- Each entry shows `created_at` as the raw server string (`:98`). Every other money
  date in the app goes through `formatDate`. F-16.

**Payment schedule** (`PaymentSchedulePanel.vue`)
- Good: amount, charge date, method, auto-debit ceiling, pre-debit notices, and
  "If this goes unpaid" with dates, plus "Servers stop at suspension. Nothing is
  deleted" (`:88-178`). This is the clearest screen in billing.
- The payment-date form opens at the top of the tray, above the schedule it
  changes (`:73-75`). A customer who opened the tray to read the date meets a form
  first.

**Limit tiers** (`TiersPanel.vue`)
- Clear table with "Current" and "Next" tags and a "Contact support" link for a
  higher limit. Fine.
- "Limit: The most your team can spend in one billing cycle" (`:111-112`) is not
  what the server-create gate checks. F-01.

**Budget alert** (`EstimatedCard.vue:279-312`)
- The button is labelled "Budget alerts"; its tooltip carries the state ("Nearing
  your ₹20,000 alert before tax"). The state is only visible on hover; the bell
  colour is the only visible signal. Minor.

---

## 2. Billing › Invoices

`dashboard/src/pages/billing/BillingInvoicesPage.vue`, `InvoiceListView.vue`

**What the customer comes to do.** Find an invoice, download it, pay it if owed.

### What works

- Rows lead with the period ("October 2026"), not the invoice number, and the
  search matches both (`InvoiceListView.vue:64-74,129-140`).
- The receipt panel groups lines by server, shows tax, credits and "GST paid with
  top-ups" separately, and says which method paid (`BillingInvoicesPage.vue:235-320`).
- The Pay button names the amount ("Pay ₹X now") and is replaced by "Waiting
  for your bank to confirm the payment…" while a payment is in flight (`:394-411`).
- An invoice not issued yet says so in the footer: "This invoice is being prepared.
  You can pay it once it is issued." (`:389-393`).

### What gets in the way

| # | Problem | Evidence | Finding |
|---|---|---|---|
| 1 | "Email invoice" is a permanently disabled button with a "coming soon" tooltip. | `BillingInvoicesPage.vue:195-201` | F-13 |
| 2 | The panel subtitle shows the internal invoice type: "Billable" or "Cost Report". | `BillingInvoicesPage.vue:186`; options in `doctype/invoice/invoice.json` | F-15 |
| 3 | The status filter offers Outstanding, Paid, Overdue. Invoices can also be Waived or Cancelled; those cannot be filtered. | `InvoiceListView.vue:92-101` | F-15 |
| 4 | The Statement tab says "Tax invoices are issued separately." The PDF on each invoice row *is* the tax invoice (ERPNext print format), so this sends the customer looking for something that is already here. | `StatementCard.vue:49` | F-15 |
| 5 | The Statement table orders columns Period, Paid, Status, Amount: the paid figure comes before the amount it pays. | `StatementCard.vue:27-32` | F-15 |
| 6 | The Statement and the invoice list show the same rows (period, status, amount) on two tabs. The Statement adds only "Paid" and a CSV. | `StatementCard.vue:34-42` vs `InvoiceListView.vue:64-90` | F-08 |
| 7 | Manual Checkout teams always get the Razorpay sheet when they press Pay, whatever gateway the backend opened the order on. | `usePayInvoiceCheckout.ts:41`; backend picks by currency, `payments/charges.py:463-467` | F-10 |
| 8 | Refunds card: a refund in `Pending` gets a plain grey badge and no explanation. The raw gateway refund id is printed under each refund. | `RefundsCard.vue:35-39,75-80`; status options in `doctype/refund/refund.json` | F-16 |

---

## 3. Billing › Payments

`dashboard/src/pages/billing/BillingPaymentsPage.vue`, `PaymentMethodsCard.vue`

**What the customer comes to do.** Add or change a card, choose which pays first,
fix billing details.

### What works

- One ordered list: credits, then each method, labelled Primary / Fallback n, with
  the order the engine really uses (`PaymentMethodsCard.vue:203-318`).
- The second line of a method says something new: expiry, or the per-debit ceiling
  of a mandate (`:81-93`).
- A reader without manage rights sees "Billing is not set up yet. Ask a team admin
  to add billing details." instead of a dead button (`BillingPaymentsPage.vue:39-48`).
- A failed load gets its own alert with Retry (`:28-34`).

### What gets in the way

| # | Problem | Evidence | Finding |
|---|---|---|---|
| 1 | Removing the last payment method is allowed with no warning, even with an invoice outstanding and the team on Auto Charge. The dialog says "Invoices will fall back to your other methods, if any." | `PaymentMethodsCard.vue:320-329`, `payments/payments.py:326-349` | F-02 |
| 2 | While the wallet has any balance, even ₹1, "Primary payment method" is disabled on every card. "Move up" still works and has the same effect on the order. | `PaymentMethodsCard.vue:125-136`, `PaymentMethodRowActions.vue:41-59` | F-06 |
| 3 | The wallet row is labelled "Primary" whenever its balance is above zero, whatever the collection mode. | `PaymentMethodsCard.vue:232` | F-06 |
| 4 | On a Prepaid team, making a card primary also switches the team to Auto Charge, with no prompt. The toast only says "{card} is charged first". | `PaymentMethodsCard.vue:138-157` | F-05 |
| 5 | There is no control to choose Auto Charge, Manual Checkout or Prepaid. The only entry is the INR Action Required banner, which says "You can switch anytime in Billing settings." No such screen exists. | `CollectionActionBanner.vue:135`; only callers of `setCollectionMode` are that banner and `PaymentMethodsCard.vue:111` | F-05 |
| 6 | The add row says "Add a card" / "Add another card", but the dialog offers UPI, RuPay and netbanking too. | `PaymentMethodsCard.vue:307-314` | F-15 |
| 7 | The card treats Prepaid as "credits first, nothing else charged". The backend still debits a Prepaid team's saved method once credit runs out (`central/billing/payments/collection_mode.py:105-112`). | `PaymentMethodsCard.vue:32-36,97-100` | F-23 |

### Add payment method dialog

`dashboard/src/components/AddMethodDialog.vue`

- Good: tiles name the instrument, show network marks, and give the reason a tile
  is blocked ("Not available for your account yet") (`:51-96,109-115`).
- The card check charges a small amount that is refunded. The dialog says so only
  after the customer presses "Add card" (`:263-268`). Onboarding said "No charge
  today" two screens earlier. F-04.
- The Amex/Diners note is hard-coded text. The backend sends `note`, but only its
  presence is used, not its content (`:350-357`). F-19.

### Top up wallet dialog

`dashboard/src/components/TopupDialog.vue`

- Good: shows amount, GST and total to pay before the gateway opens, and says
  "We add the credit to your wallet once the payment goes through."
- Quick amounts are 1,000 / 5,000 / 10,000 / 25,000 in every currency (`:42`). For a
  USD team that is $1,000 to $25,000. F-07.
- GST is computed in the browser (`:55-60`). If server rounding ever differs, the
  "Total to pay" shown here will not match the gateway amount. F-17.

### Billing details

`BillingProfileForm.vue`, `BillingCountryField.vue`, `BillingDetailsCard.vue`

- Good: required fields are marked on submit; GSTIN placeholder and "Its first two
  digits must match the selected state"; a partial save says exactly which fields
  are still missing (`BillingProfileForm.vue:128-134`).
- "Billed in USD: locked by billing activity." (`BillingCountryField.vue:75-80`) is
  vague. The backend message says what the activity is: "this team already has a
  wallet, payment method, or invoice" (`api/dashboard/account.py:130`). Use that.

---

## 4. Onboarding: billing step

`dashboard/src/components/onboarding/BillingStep.vue`

- Good: a three-step "How billing works" card, and the welcome credit with its
  expiry ("Use it within N days").
- Step one says "No charge today. We save it and check that it works." (`:46-47`).
  The check is a charge that is refunded (`AddMethodDialog.vue:265`), and on a trial
  team the banner on the same step says "Adding a payment method ends the free
  trial today… and billing starts" (`TrialBillingBanner.vue:45`). Three statements
  about the same click. F-04.

---

## 5. Server create, resize and trial upgrade

`PlanGroup.vue`, `NewServerPage.vue`, `ResizeServerDialog.vue`, `TrialUpgradePanel.vue`

- Good: plans that do not fit the spending limit are hidden or marked "Over your
  spending limit", and an empty menu explains why with a support link
  (`NewServerPage.vue:384-402`).
- Good: "Resizing uses today's rates. Your current rate cannot be restored." and
  "Disk size cannot be decreased later." are stated before the change.
- Prices are shown per month only (`PlanGroup.vue:131-133`). Billing is by the hour
  for changes and stops while a server is stopped, and the first day is billed in
  full (commits of 5 Nov 2026). None of this is said at the point of purchase.
- Prices do not say whether tax is included. The Overview headline includes tax;
  the plan menu does not say either way.
- When the server-side limit check refuses, the message says "This configuration
  (₹X) exceeds your remaining headroom (₹Y)." (`catalog/subscriptions.py:1060`).
  "Headroom" is not a word the customer has seen anywhere else. F-09.
