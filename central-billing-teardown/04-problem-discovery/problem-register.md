# Problem register

One register for all workstreams. One ID per root problem; symptoms of the same
root are merged ([duplicate-analysis.md](../06-github-backlog/duplicate-analysis.md)).
Scope at this checkpoint: **D1 Billing setup and payment methods** and **D2
Invoices and collection**.

- **Evidence:** E2 = read in code and follows from it; E4 = measured in the
  production backup ([measurements.md](measurements.md)).
- **Status:** *Verified* = shown by code or data. *Hypothesis* = plausible, not shown.
  *Suggestion* = an improvement with no defect behind it.
- **F-nn** = the same problem in the earlier pass
  ([findings-register.md](../10-final-assessment/findings-register.md)).
- Paths start at the central repo root, commit `a95b491e`.

## Summary

| ID | Problem | Class | Domain | Status | Evidence | Priority | Earlier |
|---|---|---|---|---|---|---|---|
| CB-21 | Most payment-method setups never finish, and the failed or abandoned ones stay "Pending Validation", unseen | Reliability | D1 | Verified | E2 + E4 | **P1** | — |
| CB-22 | Both external outstanding invoices are held for accounting sync, so no customer could pay | Operational | D2 | Verified at backup time | E4 | **P1** (confirm) | F-25 related |
| CB-03 | No screen shows or changes the collection mode; making a card primary silently switches mode | Missing capability | D1 | Verified | E2 + E4 | **P1** | F-05 |
| CB-04 | The console says Prepaid charges nothing else; the backend debits a Prepaid team's saved method | Bug | D1 | Verified | E2 + E4 | **P1** | F-23 |
| CB-18 | Support has no single view of a team's billing | Operational | D1/D2 | Verified | E2 | **P1** | — |
| CB-01 | Receipt panel: deductions shown above a Total that ignores them; TDS not shown; Pay amount differs from Total | Bug | D2 | Verified | E2 | P2 | — |
| CB-02 | The last payment method can be removed with an invoice owed | Functional | D1 | Verified | E2 | P2 | F-02 |
| CB-06 | A failed invoice-list load shows "No invoices yet" | Bug | D2 | Verified | E2 | P2 | — |
| CB-07 | "Waiting for your bank…" never updates on its own | UX | D2 | Verified | E2 | P2 | — |
| CB-08 | The banner's "Pay now" opens the invoice list, not the invoice | UX | D2 | Verified | E2 | P2 | — |
| CB-09 | "Pay ₹X now" charges at once and does not say which method | UX | D2 | Verified | E2 | P2 | — |
| CB-10 | Manual Checkout always opens the Razorpay sheet | Bug | D2 | Verified (code) | E2 | P2 | F-10 |
| CB-11 | "No charge today" vs the card check charge | UX | D1 | Verified | E2 | P2 | F-04 |
| CB-12 | Onboarding saves a billing country from the browser time zone with no user action | UX | D1 | Verified (code); data fits | E2 + E4 | P2 | — |
| CB-16 | Invoice filter misses Cancelled and Waived; Statement tab repeats the list and misstates tax invoices | UX | D2 | Verified | E2 + E4 | P2 | F-15, F-08 |
| CB-17 | Accessibility gaps in the payment and invoice screens | UX (a11y) | D1/D2 | Verified in code; not tested with assistive tech | E2 | P2 | — |
| CB-19 | Operator invoice actions stop at cancel and refund | Missing capability | D2 | Verified | E2 | P2 | — |
| CB-20 | Server errors reach customers word for word | Reliability | D1/D2 | Verified | E2 | P2 | error-message-audit |
| CB-05 | Wallet holds the "Primary" label; "Primary payment method" disabled with no reason while "Move up" works | UX | D1 | Verified | E2 | P3 | F-06 |
| CB-13 | Billing details form: country editable after currency lock, vague lock text, field order | UX | D1 | Verified | E2 | P3 | — |
| CB-14 | Customer copy uses internal words | UX | D1/D2 | Verified | E2 | P3 | F-15 |
| CB-15 | "Email invoice" is a permanently disabled button | UX | D2 | Verified | E2 | P3 | F-13 |
| H-01 | A failed Pay call may show the previous call's "Payment initiated" toast | Bug | D2 | Hypothesis | — | — | — |
| H-02 | Manual Checkout says "We email you each bill"; sending not traced | UX | D1 | Hypothesis | — | — | — |
| H-03 | Side panel at phone width covers the list with no focus move or Escape | UX (a11y) | D2 | Hypothesis | — | — | — |
| S-01 | Warn before a saved card expires | Suggestion | D1 | — | — | — | — |
| S-02 | Extra invoice recipients (accounts team) | Suggestion | D2 | — | — | — | — |

No P0: no verified case of money taken or lost wrongly in D1/D2. CB-04 is the
nearest: it can charge a customer who believes they will not be charged, and 4
teams are in that position today.

---

## Verified problems

### CB-21 Most payment-method setups never finish, and the rest stay "Pending Validation" unseen
- **Observed (E4).** 13 of 18 payment methods are Pending Validation, 6–20 days
  old. 10 teams have no other method. Of 64 external teams, 6 started a method and
  2 finished. 4 Razorpay `payment.failed` events for pending UPI setups were
  marked Ignored.
- **Mechanism (E2).** `list_payment_methods` drops Pending Validation rows
  (`central/billing/api/dashboard/methods.py:34`), so the customer sees no trace of
  the attempt. `apply_payment_method_event` ignores any event that is not a card
  failure or has no matching method (`central/billing/payments/payments.py:395-417`),
  so a UPI bank failure does not move the row to Failed. Nothing found expires old
  pending rows.
- **Impact.** No active method means no welcome credit ("Your first payment method
  unlocks it", `BillingStep.vue:104`) and no paid servers. Support cannot see
  "tried and failed" either: the row exists only in Desk.
- **Not established.** Abandon, decline or lost confirmation, per row. The
  Stripe Checkout Session path (`cs_…` references) was not traced in the console.

### CB-22 Every external outstanding invoice is held for accounting sync
- **Observed (E4).** 2 of 2 external Outstanding invoices (₹11,367.17, ₹2,200.80):
  `hold_reason = Accounting Sync`, `erpnext_sync_status = Pending`, no ERPNext
  invoice. 4 Cancelled external invoices carry the same hold.
- **Mechanism (E2).** An invoice is payable only once issued
  (`dashboard/src/composables/useInvoiceDetail.ts:24-31`). The panel shows "This
  invoice is being prepared. You can pay it once it is issued."
  (`BillingInvoicesPage.vue:389-393`) with no date and no contact.
- **Impact.** Cash is not collected; the customer cannot act; the screen gives
  no reason to worry or to write in.
- **Not established.** Whether production still holds these after 3 Nov, and
  whether the hold is configuration (ERPNext sync off) or failure. Confirm before
  acting.

### CB-03 Collection mode cannot be seen or changed, and changes as a side effect
- **Observed (E2).** No control sets Auto Charge / Manual Checkout / Prepaid. The
  only chooser is the INR "Action required" dialog, which says "You can switch
  anytime in Billing settings" (`CollectionActionBanner.vue:134-136`). No such
  screen exists. Making a card primary on a Prepaid team also calls
  `setCollectionMode('Auto Charge')`, and the toast says only "{card} is charged
  first" (`PaymentMethodsCard.vue:138-157`).
- **Observed (E4).** All 64 external teams are Prepaid.
- **Impact.** Customers do not know how they will be billed. One click changes it
  without telling them. Support has nowhere to point them.

### CB-04 Prepaid means different things on screen and in the engine
- **Observed (E2).** The card treats Prepaid as "credits first, nothing else
  charged" (`PaymentMethodsCard.vue:19-36`). `is_debit_allowed` holds debits only
  for Manual Checkout and Action Required (`central/billing/payments/collection_mode.py:105-112`),
  and dunning retries Prepaid off-session (`central/billing/revenue/dunning.py:326-339`).
- **Observed (E4).** 4 Prepaid teams hold an active card or UPI method.
- **Impact.** Once their credit runs out, those teams can be charged when the
  screen told them they would not be.
- **Decision needed.** Which meaning is intended (D-01).

### CB-18 Support has no single view of a team's billing
- **Observed (E2).** `get_team_billing` returns a team's subscriptions, invoices and
  attempts (`central/billing/api/admin/teams.py:33-60`) but has no caller.
  `central/identity/doctype/team/` has no `team_dashboard.py`, so the Team form
  links to no billing records. The sidebar lists 95 items by DocType, including the
  retired Entitlement Token (`central/workspace_sidebar/billing.json:257-258`).
- **Impact.** Each ticket means filtering 4–6 lists by team, or impersonating the
  customer (`team.js:40`). CB-21 rows are visible only this way.
- **Not established.** Ticket volume and handling time.

### CB-01 Receipt totals do not add up on screen
- **Observed (E2).** The panel lists Subtotal, Tax, then "Credits applied −X" and
  "GST paid with top-ups −Y", then **Total**, which is `total`, before those
  deductions (`BillingInvoicesPage.vue:243-295`). The button below says "Pay
  {expected_collection} now" (`:400`). `expected_collection = total − tds_amount`,
  with credits taken at open (`central/billing/revenue/invoicing/generate.py:205-208`).
  No TDS line is shown. The list's "Amount" column is `total` (`InvoiceListView.vue:83-88`).
- **Observed (E4).** 0 invoices with credits, top-up GST or TDS yet.
- **Impact.** When credits or TDS apply, three figures disagree on one screen.

### CB-02 The last payment method can be removed with an invoice owed
- **Observed (E2).** The confirm text: "Invoices will fall back to your other
  methods, if any" (`PaymentMethodsCard.vue:320-329`). The backend revokes and
  deletes without checking for open invoices or remaining methods
  (`central/billing/payments/payments.py:326-349`).
- **Observed (E4).** No team is on Auto Charge, so exposure today is 0.

### CB-06 Failed invoice load reads as "No invoices yet"
- **Observed (E2).** `useInvoices` returns `error` (`useInvoices.ts:24-27`).
  `BillingInvoicesPage.vue:33-37` does not take it, and the list's empty state
  says "No invoices yet. Your first invoice appears here at the end of the cycle."
  (`InvoiceListView.vue:117-120`).
- **Impact.** A customer who owes money is told they have no invoices. The
  Payments page handles the same failure with a Retry alert
  (`BillingPaymentsPage.vue:28-34`).

### CB-07 The in-flight payment state never refreshes
- **Observed (E2).** After Pay, the panel reloads once (`BillingInvoicesPage.vue:102-109`).
  If `payment_in_progress` is set it shows "Waiting for your bank to confirm the
  payment…" (`:404-410`). No billing composable polls; `setInterval` appears only in
  resize, trial and site-setup code (search of `dashboard/src/composables`).
- **Impact.** The customer must reload to see Paid. The spinner suggests the page
  is still working.

### CB-08 "Pay now" in the banner does not open the invoice
- **Observed (E2).** `OutstandingAlert.vue:85-92` pushes `{ name: 'BillingInvoices' }`
  with no query, for both "Pay now" and "View invoice". The page opens a panel
  from `?invoice=` (`BillingInvoicesPage.vue:73-80`), and the banner already knows
  the open invoices (`OutstandingAlert.vue:28-29`).

### CB-09 Pay now charges at once and does not name the method
- **Observed (E2).** The button runs `pay_invoice` on click with no confirmation
  (`BillingInvoicesPage.vue:395-403`, `usePayInvoice.ts:37-41`). Nothing names the
  method to be charged. The toast: "Payment initiated. The invoice updates once
  the gateway confirms." (`usePayInvoice.ts:53-55`).

### CB-10 Manual Checkout always opens Razorpay
- **Observed (E2).** `usePayInvoiceCheckout.ts:41` always calls `openRazorpayCheckout`.
  The backend picks the gateway by invoice currency (`central/billing/payments/charges.py:463-467`).
- **Observed (E4).** No Manual Checkout teams and no attempts yet.

### CB-11 "No charge today" vs the card check
- **Observed (E2).** Onboarding: "No charge today. We save it and check that it
  works." (`BillingStep.vue:46-47`). Add card: "Validating your card with a small
  temporary charge that's refunded right away." shown only after the click
  (`AddMethodDialog.vue:263-268`). The trial banner on the same step says adding a
  method ends the trial (`TrialBillingBanner.vue:45`).

### CB-12 Onboarding writes a billing country the user did not choose
- **Observed (E2).** On mount, if no country is set and the browser time zone is
  Asia/Kolkata, `BillingCountryField` calls `onChange('India')`, which saves through
  `save_billing_profile` (`BillingCountryField.vue:38-61`). The backend sets the
  currency from it (`central/billing/api/dashboard/account.py`, `save_billing_profile`).
- **Observed (E4).** 43 of 55 incomplete external profiles hold country = India
  and nothing else required. The pattern fits; the cause is not proven.
- **Impact.** A record and a currency are set by opening a screen. It can be
  changed until money moves; after that, "Contact support"
  (`central/billing/doctype/billing_profile/billing_profile.py:276-285`).

### CB-16 Invoice filtering and the Statement tab
- **Observed (E2).** The status filter has Outstanding, Paid, Overdue
  (`InvoiceListView.vue:92-101`). Statuses also include Waived and Cancelled
  (`doctype/invoice/invoice.json`, field `status`). The Statement tab repeats the
  rows and says "Tax invoices are issued separately" (`StatementCard.vue:49`),
  while each row's PDF is the tax invoice.
- **Observed (E4).** 4 of 6 external invoices are Cancelled. Two of them are
  ₹0.01 and ₹0.26.

### CB-17 Accessibility gaps (code)
| Gap | Where |
|---|---|
| Method tiles are grouped by a `<div aria-label>` with no role, so the label is not announced | `AddMethodDialog.vue:289` |
| Collection-mode choices have no `aria-pressed` or radio role; the selected state is colour only | `CollectionActionBanner.vue:109-129` (compare `AddMethodDialog.vue:294`) |
| Disabled controls explain themselves only in `title` (not shown on keyboard focus; disabled buttons take no focus) | `BillingInvoicesPage.vue:195-209`, `InvoiceListView.vue:154-162` |
| Disabled "Primary payment method" menu item gives no reason | `PaymentMethodRowActions.vue:41-47` |
| A persistent banner uses `role="alert"`, announced on every page load | `OutstandingAlert.vue:97-100` |
| Billing email error is a loose `<p>`, not tied to the input like the other fields | `BillingProfileForm.vue:169-179` |
| Overdue icon lacks `aria-hidden` | `BillingInvoicesPage.vue:226` |
| Side panel takes no focus on open, has no Escape handler, no dialog/region role | `components/common/SidePanel.vue:14-61` |

### CB-19 Operator invoice actions stop at cancel and refund
- **Observed (E2).** The Invoice form offers Cancel, Refund Part, Cancel and
  Refund, Retry Failed Refunds (`central/billing/doctype/invoice/invoice.js:6-42`).
  There is no charge-again, payment-link or release-hold action, and Cancel asks
  only for a reason, with no summary of effects (`:44-61`).
- **Impact.** For CB-22 and CB-21 cases, support has to hand the problem to engineering.

### CB-20 Server error text reaches customers unchanged
- **Observed (E2).** The console shows the server's message
  (`dashboard/src/lib/feedback.ts`). Examples customers can reach in D1/D2:
  "{doctype} {name}: illegal transition {a} → {b}" (`central/billing/states.py:230`)
  when Pay races a webhook; "Payment confirmation failed."
  (`central/billing/payments/charges.py:430,447`). Full list:
  [error-message-audit.md](../07-resilience/error-message-audit.md).

### CB-05 Two controls, one effect, one disabled without reason
- **Observed (E2).** With any wallet balance, the wallet row reads "Primary"
  (`PaymentMethodsCard.vue:232`), every method reads "Fallback n" (`:127-131`), and
  "Primary payment method" is disabled (`PaymentMethodRowActions.vue:41-47`). "Move
  up" still reorders (`PaymentMethodsCard.vue:179-196`).

### CB-13 Billing details form details
- **Observed (E2).** Country stays editable in the edit form after the currency
  locks (`BillingProfileForm.vue:181-188`), while onboarding disables it
  (`BillingCountryField.vue:71`). Changing it then fails with "Only a team in India
  is billed in INR. Contact support…" (`billing_profile.py:285`). Lock text: "Billed
  in INR: locked by billing activity." (`BillingProfileForm.vue:190-192`). Field order
  puts City before Address line 1 (`:195-212`). The phone placeholder is an Indian
  number for every country (`:225`).

### CB-14 Internal words in customer copy
| Text | Where | Problem |
|---|---|---|
| "Billable" / "Cost Report" in the panel subtitle | `BillingInvoicesPage.vue:186` | Internal invoice type |
| "Add a card" / "Add another card" | `PaymentMethodsCard.vue:308` | The dialog also offers UPI, RuPay |
| "Payment initiated. The invoice updates once the gateway confirms." | `usePayInvoice.ts:54` | "gateway" |
| "Payment received. The invoice updates once the gateway confirms." | `usePayInvoiceCheckout.ts:54` | "received" vs not confirmed |
| "{methodType} added" e.g. "UPI Autopay added" before confirmation | `useAddPaymentMethod.ts:85` | Fine, but differs from Stripe wording |
| "locked by billing activity" | `BillingProfileForm.vue:191` | Vague; server says what the activity is (`account.py:130`) |

### CB-15 Dead control
- **Observed (E2).** "Email invoice" is always disabled with a "coming soon" title
  (`BillingInvoicesPage.vue:195-201`).

## Hypotheses

| ID | Hypothesis | Why plausible | How to check |
|---|---|---|---|
| H-01 | After a failed `pay_invoice`, `pay.data` may still hold the previous call's result, so the toast says "Payment initiated" | `usePayInvoice.ts:38-39` reads `pay.data` after `submit` without checking `pay.error` | Read frappe-ui `useCall` on error; or pay two invoices in demo, the second failing |
| H-02 | Manual Checkout customers are not emailed each bill | Copy at `CollectionActionBanner.vue:68`; sender not traced | Trace `platform/notifications.py` for invoice issue |
| H-03 | At phone width the receipt panel covers the list and traps users without a clear way back | `SidePanel.vue:23` (`absolute inset-0` below `md`) | Browser pass (D-09) |

## Suggestions

| ID | Suggestion | Basis |
|---|---|---|
| S-01 | Warn before a saved card expires | The row shows expiry (`PaymentMethodsCard.vue:81-93`); no warning found in D1 screens; notifications not traced |
| S-02 | Let a team add invoice recipients (accounts@) | Billing email is one field (`BillingProfileForm.vue:170-175`); "Email invoice" is wanted but missing (CB-15) |
