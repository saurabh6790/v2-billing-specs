# Problem register

One register for all workstreams. One ID per root problem; symptoms of the same
root are merged ([duplicate-analysis.md](../14-github-backlog/duplicate-analysis.md)).
Scope: **D1 Billing setup and payment methods**, **D2 Invoices and collection**
(checkpoint 1), **D3 Cost visibility and limits**, **D4 Wallet and credits**
(checkpoint 2), **D5 Subscriptions and projects**, **D6 Purchase-time billing**,
**D7 Operator back office** (checkpoint 3), **D8 Metered services: Cargo storage and
Grove AI** (open-points pass).

**Product decisions recorded (9 Nov 2026):**
- **Prepaid** = credits first. A top-up is an advance that settles invoices; when
  credit is not enough and the team has a payment method, the method is charged
  for the rest. The engine already does this (`central/billing/payments/collection_mode.py:105-112`).
- **Held invoices** are expected: they wait until the accounting integration and
  accounts are finalised. CB-22 is deferred to that work.
- **Stopped servers bill disk only** (D-16); **Pause billing stays its own action** (D-17)
  and bills nothing, disk included (D-18); servers stopped by dunning bill nothing
  (D-19). Stop offers Snapshot and release, billing the snapshot (D-25, provisional).
- **AI** is rated at Grove's USD price (D-20), converted for INR at the billing day's
  rate (D-21). **Bundles** are the plan's base offering, per subscription (D-22).
  **Storage** is billed in GB (D-23), only for what is stored (D-24); a missed reading
  bills the last one, estimated (D-27). **AI in INR** uses one rate per month, set on
  the billing day (D-26). **Profile completion** is low by design: it is asked for when
  the trial ends (D-08).
- **Prepaid stays a separate mode** (D-12): the wallet pays dues; only when the
  wallet is short is the alternative method (card or UPI) charged.
- **The spending limit is checked against base cost before tax** (D-13), which is
  today's gate. Surfaces that show cost with tax must say taxes are added on top.
- **No auto-recharge** (D-14): remove the switch.
- **Budget alerts are needed** (D-15): build the sender; keep the setting.

- **Evidence:** E2 = read in code and follows from it; **Seen** = observed in the
  browser on `demo-billing.localhost` at 1440 px (checkpoint 2); E4 = measured in
  the production backup ([measurements.md](measurements.md)).
- **Domain:** D1 setup and methods, D2 invoices, D3 cost and limits, D4 wallet,
  D5 subscriptions and projects, D6 purchase, D7 operator back office.
- **Status:** *Verified* = shown by code or data. *Hypothesis* = plausible, not shown.
  *Suggestion* = an improvement with no defect behind it.
- **F-nn** = the same problem in the earlier pass
  ([findings-register.md](../10-final-assessment/findings-register.md)).
- Paths start at the central repo root, commit `a95b491e`.

## Summary

| ID | Problem | Class | Domain | Status | Evidence | Priority | Earlier |
|---|---|---|---|---|---|---|---|
| CB-21 | Most payment-method setups never finish, and the failed or abandoned ones stay "Pending Validation", unseen (top-ups the same) | Reliability | D1/D4 | Verified | E2 + E4 | **P1** | — |
| CB-03 | No screen shows or changes the collection mode; making a card primary silently switches mode | Missing capability | D1 | Verified | E2 + E4 + Seen | **P1** | F-05 |
| CB-18 | Support has no single view of a team's billing | Operational | D1/D2 | Verified | E2 | **P1** | — |
| CB-25 | The spend limit is compared with three different figures on screen, and none is the one the server-create gate uses | Bug | D3 | Verified | E2 + Seen + E4 | **P1** | F-01 |
| CB-34 | "Pause billing" stops the server but not the charges; a paused server that is later terminated bills on | Bug (money) | D5 | Verified | E2 + E4 + Seen | **P1** | — |
| CB-44 | Revenue reports count waived internal invoices as revenue (80 % of the base); economics reports do not | Bug (reporting) | D7 | Verified | E2 + E4 | **P1** | — |
| CB-46 | AI usage is never billed: Central treats Grove as prepaid, Grove expects Central to bill in arrears; Grove purges after 90 days | Bug (money) | D8 | Verified | E2 + E4 | **P1** | — |
| CB-48 | Metered usage is not stored per day; one running monthly row per subscription | Design gap | D8 | Verified | E2 + E4 | **P1** | — |
| CB-47 | Object storage is metered but priced at zero; GiB labelled GB | Bug | D8 | Verified | E2 + E4 | P2 | — |
| CB-49 | 1 TB transfer per server promised, never measured | Gap | D8 | Verified | E2 | P3 | — |
| CB-23 | Budget alerts are saved but never sent | Bug | D3 | Verified | E2 + E4 | P2 | — |
| CB-04 | Console copy and code assume Prepaid is credits only; the decided rule is credits then the method | Bug | D1 | Verified; decision made | E2 | P2 | F-23 |
| CB-27 | Overview shows "Add your billing details" on every load, even for complete teams | Bug | D3 | Verified | E2 + Seen | P2 | — |
| CB-28 | Facts card labels shrink to "W.", "P.", "N." when a side panel is open | UX | D3/D4 | Verified | Seen | P2 | — |
| CB-26 | This cycle's cost appears five times from two sources; one date has two names | UX | D3 | Verified | E2 | P2 | F-08 |
| CB-29 | Wallet history shows raw timestamps and internal ledger notes (gateway ids, operator wording) | UX | D4 | Verified | E2 + Seen + E4 | P2 | F-16 |
| CB-32 | Top-up quick amounts are the same numbers in every currency | UX | D4 | Verified | E2 + E4 | P2 | F-07 |
| CB-31 | Credit expiry is shown only as one hint; entries do not say when they expire | UX | D4 | Verified | E2 + Seen + E4 | P2 | — |
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
| CB-14 | Customer copy uses internal words (incl. the unit "Nos") | UX | D1–D4 | Verified | E2 + Seen | P3 | F-15 |
| CB-15 | Controls that never work: "Email invoice" (always disabled) and "Auto-recharge" (flips back) | UX | D2/D4 | Verified | E2 + Seen | P3 | F-13 |
| CB-24 | "UPI Autopay" shown twice on a mandate row with no UPI ID | UX | D1 | Verified | E2 + Seen | P3 | — |
| CB-30 | Wallet history shows only the latest 50 entries, with no way to see more | UX | D4 | Verified | E2 | P3 | — |
| CB-33 | Top-up GST is computed in the browser; the order stores the server's split | Tech debt | D4 | Verified | E2 | P3 | F-17 |
| CB-35 | Stopping a server keeps full billing; the docs say otherwise; Stop and Pause look alike | UX | D5 | Verified | E2 + Seen | P2 | — |
| CB-39 | The New server page and the server use different rules for "credit is enough" | Bug | D6 | Verified | E2 + E4 | P2 | — |
| CB-38 | Purchase price is not marked before tax and leaves out IPv4; alert says billed to the payment method | UX | D6 | Verified | E2 | P2 | — |
| CB-40 | Limit and payment refusals at purchase leave no record | Observability | D6 | Verified | E2 + E4 | P2 | — |
| CB-41 | Desk billing home counts internal teams and has nothing for support | Operational | D7 | Verified | E2 + E4 + Seen | P2 | — |
| CB-42 | Open operator alerts have no Desk list | Operational | D7 | Verified | E2 | P2 | — |
| CB-36 | Project spending limit checked only on tagging; errors show internal ids | Bug / UX | D5 | Verified | E2 + E4 | P3 | — |
| CB-43 | At phone width the invoice list puts Status and Amount off screen; panel keeps focus behind it | UX (a11y) | D2 | Verified | Seen (390 px) + E2 | P2 | — |
| CB-45 | Promotional credit expires with no notice | Missing notice | D4 | Verified | E2 + E4 | P2 | — |
| CB-22 | Owed invoices held for accounting sync show no date | Operational | D2 | **Expected (decision)** | E4 | Deferred | F-25 related |
| H-01 | A failed Pay call may show the previous call's "Payment initiated" toast | Bug | D2 | **Refuted** | E2 (frappe-ui) | — | — |
| H-02 | Manual Checkout says "We email you each bill"; sending not traced | UX | D1 | **Refuted** | E2 | — | — |
| H-03 | Side panel at phone width covers the list with no focus move or Escape | UX (a11y) | D2 | **Partly confirmed → CB-43** | Seen | — | — |
| H-04 | Prepaid teams are not warned before promotional credit expires | UX | D4 | **Confirmed → CB-45** | E2 | — | — |
| H-06 | A Prepaid INR team whose remainder after the wallet is above ₹15,000 is never charged and never told | `charges.py:118-128` skips a charge the gateway cannot take silently and calls `trip_auto_charge`, which moves only Auto Charge teams | Probe on test-central.local: Prepaid INR team, wallet ₹0, invoice ₹16,000. Production backup: 2 INR invoices above ₹15,000, both settled |
| H-05 | Operator alerts reach no one in production (Raven and email unset) | Operational | D7 | Hypothesis | E4 (backup, settings touched by local migrate) | — | — |
| S-01 | Warn before a saved card expires | Suggestion | D1 | — | — | — | — |
| S-02 | Extra invoice recipients (accounts team) | Suggestion | D2 | — | — | — | — |

No P0: no verified case of money taken or lost wrongly in D1–D4. With the
Prepaid decision, the engine's behaviour is intended; CB-04 is now a copy and
model fix in the console.

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

> **Decision (9 Nov 2026):** holds are expected until the accounting integration
> and accounts are finalised. Deferred. Keep the customer copy item (show when the
> invoice will be ready) for when issuing starts.
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

### CB-04 The console's model of Prepaid is credits only; the decided rule is credits then the method
- **Decision (D-01, 9 Nov 2026).** Prepaid = credits first; the method pays what
  credit does not cover. The engine matches: `is_debit_allowed` holds debits only
  for Manual Checkout and Action Required (`central/billing/payments/collection_mode.py:105-112`),
  and `start_auto_charge` moves a Prepaid team to Auto Charge when its first method
  becomes active (`:115-126`).
- **Observed (E2).** The console was written for the other meaning:
  `PaymentMethodsCard.vue:19-36` says the rows "read 'not charged'" on Prepaid;
  promoting a card on Prepaid switches to Auto Charge on that premise (`:138-157`).
  The INR Action-required dialog offers "Prepaid wallet: Add credits up front; your
  usage draws them down." and does not say the method is charged when credit runs
  out (`CollectionActionBanner.vue:71-77`). The Overview wallet hint already states
  the rule: "Covers N% of this cycle, card pays the rest" (`CycleFacts.vue:81-89`).
- **Observed (E4).** 4 Prepaid teams hold an active method, although
  `start_auto_charge` should have moved them to Auto Charge. Not explained
  (methods activated by another path, or mode set back).
- **Impact.** Under the decision, these teams are charged as intended. The risk
  now is a customer choosing "Prepaid wallet" to avoid card debits and being
  debited anyway.
- **Decided (D-12).** Keep Prepaid separate from Auto Charge. This conflicts with
  the engine in one place: `PaymentMethod.on_update` calls `start_auto_charge`,
  which moves a Prepaid team to Auto Charge when its first method becomes active
  (`central/billing/doctype/payment_method/payment_method.py:15-18`). Under D-12 a
  Prepaid team that adds a card should stay Prepaid. The 4 Prepaid teams with an
  active method are what D-12 asks for; the teams that were moved are not.

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
| "90,000 Nos used", "0 Nos" (seen on the invoice and Subscriptions) | `ChargeBreakdown.vue`, `PayingForTable.vue` (unit from the plan) | "Nos" is the catalog unit, not a word customers use |
| Internal VM id beside each server on the invoice (`vm-…`) (seen) | `ChargeBreakdown.vue` | An id the customer never sees elsewhere |
| "Add a card" / "Add another card" | `PaymentMethodsCard.vue:308` | The dialog also offers UPI, RuPay |
| "Payment initiated. The invoice updates once the gateway confirms." | `usePayInvoice.ts:54` | "gateway" |
| "Payment received. The invoice updates once the gateway confirms." | `usePayInvoiceCheckout.ts:54` | "received" vs not confirmed |
| "{methodType} added" e.g. "UPI Autopay added" before confirmation | `useAddPaymentMethod.ts:85` | Fine, but differs from Stripe wording |
| "locked by billing activity" | `BillingProfileForm.vue:191` | Vague; server says what the activity is (`account.py:130`) |

### CB-15 Controls that never work
- **Observed (E2, Seen).** "Email invoice" is always disabled with a "coming soon"
  title (`BillingInvoicesPage.vue:195-201`). The Wallet history header has an
  "Auto-recharge" switch that flips back with "Auto-recharge isn't available yet"
  (`WalletHistoryPanel.vue:25-31,51-57`); no auto-recharge endpoint exists.
- **Decided (D-14).** Auto-recharge will not be built; remove the switch.

## Checkpoint 2: D3 cost visibility and limits

### CB-25 The spend limit is compared with three figures, none of them the gate's
- **Observed (E2).** This cycle card: bar and "over limit" use the subtotal before
  tax (`EstimatedCard.vue:50-62`). Limits card: "Spend per cycle X of Y" uses
  `projected_total`, with tax (`useSpendingLimits.ts:38,56-60`, `LimitsCard.vue:78-85`).
  Spend chart: this cycle's bar is `measured` (`SpendCard.vue:60-65`). The
  server-create gate checks the sum of monthly rates of running subscriptions
  (`central/billing/catalog/subscriptions.py:1066-1072`) and refuses with "exceeds
  your remaining headroom" (`:1060`). Tiers panel defines the limit as "The most your
  team can spend in one billing cycle" (`TiersPanel.vue:111-112`).
- **Seen.** "Spend limit ₹1,000,000.00 before tax on t3 tier" on the This cycle card.
- **Observed (E4).** 61 of 64 external teams are on Beginner: ₹8,300 / $100 per
  cycle. A $100 limit is reached by one mid-size server.
- **Impact.** A customer can see room left on screen and still be refused, with a
  word ("headroom") they have not seen.
- **Not established.** How often server creation is refused for the limit.
- **Decided (D-13).** The limit is checked against base cost before tax, as the
  gate does now (it sums `locked_rate`, `subscriptions.py:1036-1041`). The cards must
  compare the limit with that figure and say taxes are added on top, because the
  Overview's cost figures include tax.

### CB-23 Budget alerts are saved but never sent
- **Observed (E2).** The dialog says "We'll notify the team once projected spend
  before tax crosses this." (`EstimatedCard.vue:296-299`). `spend_alert_threshold`
  is read only by `get_billing_settings` and written by `save_billing_settings`
  (`central/billing/api/dashboard/account.py:203-235`). A search of the whole
  repository finds no other reader: no job, no notification.
- **Observed (E4).** 0 of 64 external teams have set one, so no one has been misled yet.
- **Decided (D-15).** Budget alerts are needed. Build the sender; keep the setting.
- **Also.** Placeholder "20000" in every currency (`EstimatedCard.vue:294`); the toast
  says "Billing alert saved" while the button says "Budget alerts" (`:145,175`).

### CB-27 "Add your billing details" shows on every Overview load
- **Seen.** On two loads of the Overview for a team with a complete profile, the
  banner appeared first, then was replaced.
- **Mechanism (E2).** `BillingOverviewPage.vue:97` shows it when `!complete`, and
  `complete` is false until the profile loads. The Payments page fixed the same
  case: "Decided from the loaded profile, not the loading flag"
  (`BillingPaymentsPage.vue:17-18`).
- **Impact.** Every paying customer is told, briefly, that billing is not set up.

### CB-28 Facts card labels collapse when a side panel is open
- **Seen.** With Wallet history open at 1440 px, the facts card labels read "W.",
  "P.", "N.", "N."; without the panel, "Payment met…" and "Next paymen…".
- **Mechanism (E2).** Labels use `truncate` in a narrow grid column
  (`CycleFacts.vue:136-137`); the docked panel takes 24 rem (`SidePanel.vue:23`).

### CB-26 This cycle's cost appears five times, from two sources
- **Observed (E2).** Headline with tax (`EstimatedCard.vue:196`), Subscriptions
  header before tax (`PayingForCard.vue:67-70`), Limits "Spend per cycle"
  (`LimitsCard.vue:78-85`), the chart's last bar (`SpendCard.vue:60-65`), the
  breakdown total (`CycleBreakdownPanel.vue:80-83`). "Bills in N days" and "Next
  invoice" are the same date (`EstimatedCard.vue:201-204`, `CycleFacts.vue:106`).
- **Seen.** "₹0.00 nothing billed yet this cycle" above three servers listed at
  ₹1,500–₹6,000 a month with "—" for this cycle (demo data).

## Checkpoint 2: D4 wallet and credits

### CB-29 Wallet history shows raw timestamps and internal notes
- **Seen.** "Welcome credits · 2026-01-01 00:00:00".
- **Mechanism (E2).** The entry shows `note || entry_type` and `created_at` as sent
  (`WalletHistoryPanel.vue:94-98`).
- **Observed (E4).** Notes in production include a gateway payment id ("Wallet
  top-up (pi_…)") and operator wording ("Wallet balance with no ledger entry,
  booked by the…", "Test credit for benchmark").
- **Impact.** Customers read ids and internal remarks; operators write notes not
  knowing the customer sees them.

### CB-31 Credit expiry is not shown per entry
- **Observed (E2).** Only the soonest-expiring grant appears, as a hint in the facts
  card: "₹X expires {date}" (`CycleFacts.vue:91-99`). Wallet history entries carry
  no expiry (`WalletHistoryPanel.vue:93-103`).
- **Observed (E4).** 32 promotional credits, all with an expiry (27 "Welcome
  credits"); 1 top-up credit, no expiry.
- **Not established.** Whether customers are warned before expiry (notifications
  not traced).

### CB-32 Top-up quick amounts ignore currency
- **Observed (E2).** Presets 1,000 / 5,000 / 10,000 / 25,000 for every currency
  (`TopupDialog.vue:42`).
- **Observed (E4).** 12 USD teams; the Beginner USD limit is $100 per cycle, so the
  smallest preset is ten cycles at the limit.

### CB-30 Wallet history is capped at 50 entries
- **Observed (E2).** `credit_ledger(limit=50)` (`central/billing/api/dashboard/invoices.py:572-591`);
  the panel has no "more" (`WalletHistoryPanel.vue:73-119`).

### CB-33 Top-up GST computed in the browser
- **Observed (E2).** The dialog computes GST as `round(amount × rate) / 100`
  (`TopupDialog.vue:55-60`); the server stores its own split on the order
  (`credits.top_up_gst`, `create_topup_order`). A rounding difference would show
  one total and charge another. No case measured.

### CB-24 "UPI Autopay" twice on one row
- **Seen.** "UPI Autopay" / "UPI Autopay · up to ₹200,000.00 per debit".
- **Mechanism (E2).** With no UPI ID or card, `_mandate_label` returns the method
  type as the label (`central/billing/payments/mandates.py:400-407`); `detail()` then
  prefixes the type because a label exists (`PaymentMethodsCard.vue:81-84`).

### CB-21 (scope added) Top-ups with no end state
- **Observed (E4).** The only Top-up Order in production is `Created` for
  ₹25,000 and never completed. Like unfinished method setups, nothing shows it to
  the customer. Existing issue 125 covers recording top-up failures.

### Demo environment notes (not product findings)
- `get_next_payment` returns 500 on `demo-billing.local`; the site also lacks the
  `WireGuard Device` DocType and has invoices in the retired status "Open", so it is
  behind the current code. The console's "Couldn't load · Retry" handled it well.
- Phone width could not be set (the browser kept a desktop frame), so H-03 stays open.

## Checkpoint 3: D5 subscriptions and projects

### CB-34 "Pause billing" stops the server but not the charges
- **Observed (E2).** `pause_billing` sets `enabled = 0`, writes a `Paused` change and
  stops the server; its docstring says this is so it is "not left running and
  accruing" (`central/billing/catalog/subscriptions.py:1134-1146`). Invoice lines are
  built from `Created`, `Plan Changed` and `Cancelled` only
  (`central/billing/revenue/invoicing/lines.py:317`, `subscriptions.py:894`), and
  `team_line_items` does not filter on `enabled` (`lines.py:85-89`). The pause does
  not close the segment.
- **Observed (E4).** The one paused subscription in production (24 Oct 2026, ₹710 a
  month, internal team) was invoiced for 13 whole days, 19 Oct to 1 Nov (₹297.74 =
  13 × 710 / 31): about 7 days after the pause. The invoice was waived.
- **Observed (E2).** Pause then terminate: `disable_active_subscription` looks only
  for `enabled = 1` (`central/infrastructure/doctype/virtual_machine/virtual_machine.py:293-303`),
  so no `Cancelled` row is written and billing continues. Readiness S3 filters
  `enabled = 1` too (`central/billing/platform/readiness.py:313-334`). No case in the backup.
- **Observed (E2).** Headroom counts a paused server (`active_segments`, no `enabled`
  filter); project run-rate does not (`subscriptions.py:1075-1085`).
- **Seen.** "Pause billing for acme-corp-3? This stops the server/VM and the
  site(s)/services running on it, and stops charges until you resume."
- **Impact.** A wrong charge on every pause, against a written promise.

### CB-35 Stop keeps billing; the docs and the two verbs disagree
- **Observed (E2).** A server Stop writes no Subscription Change, so a stopped server
  bills in full. Customer docs: "On the day a server is created, resized, or
  stopped, each plan is billed for the hours it ran on that day."
  (`docs/content/billing/index.md:26`).
- **Seen.** "Stop 3 servers at once. Data is retained, and you can restart them." No
  word on charges (`StopAllServersRow.vue:69-97`).
- **Observed (E4).** No external team has a stopped server with an open subscription
  today; the 10 external stopped servers are free trials.
- **Decided (D-16, D-17, 9 Nov 2026).** A stopped server bills for its disk only.
  Pause billing stays its own action and bills nothing (D-18); dunning stops bill
  nothing (D-19). D-25 (provisional): Stop also offers Snapshot and release.

### CB-36 Project limit checked only on tagging
- **Observed (E2).** `validate_project` runs the limit only when the subscription is
  new or its project changes (`central/billing/doctype/subscription/subscription.py:76-82`);
  `_plan_resize` does not call it (`subscriptions.py:601-631`). Errors use internal
  names and are not translated (`subscription.py:66-73`); the limit refusal calls
  the new server's rate "committed" (`subscriptions.py:1100-1106`). No server can be
  put in a project at create.
- **Observed (E4).** 2 projects, 1 enabled, 0 with a limit, 1 tagged subscription.

## Checkpoint 3: D6 purchase-time billing

### CB-39 Console and server disagree on "credit is enough"
- **Observed (E2).** The console hides "Add a payment method" when the wallet balance
  is above zero (`central/signups/credit.py:47-61`). The server accepts credit only
  when it covers the server's monthly rate (`central/resource_actions.py:525-546`,
  `central/billing/payments/settlement.py:179-187`). A team with some credit picks a
  bigger plan and is refused after Create.
- **Observed (E4).** 2 external teams hold credit with no active method. Welcome
  credit is off (`grant_welcome_credits = 0`).

### CB-38 Purchase price basis
- **Observed (E2).** Summary shows the plan's monthly rate only
  (`dashboard/src/composables/useServerCreation.ts:313-323`); IPv4 is a tag
  (`:366`); nothing says before tax. The plan menu's "Over your spending limit"
  (`PlanGroup.vue:149-152`) uses the gate's pre-tax figure, which is right under D-13.
  The alert says "Servers are billed monthly to your payment method."
  (`NewServerPage.vue:158-159`), though every external team is Prepaid.
- **Not seen.** The demo site cannot load images or plans (schema behind the code).

### CB-40 Purchase refusals leave no record
- **Observed (E2).** `enforce_headroom` and `require_payment_method_or_credit` raise
  before a Resource Action exists.
- **Observed (E4).** 239 paid create actions, 81 failed, all for infrastructure
  reasons (80 of them internal `ATLAS_REJECTED`); 0 billing refusals recorded; Error
  Log has none. How often the limit refuses a customer cannot be measured (blocks
  the #147 measurement).

## Checkpoint 3: D7 operator back office

### CB-41 Desk billing home
- **Observed (E2, E4).** Number cards filter only on status or `enabled`: Active
  Subscriptions shows 81, of which 14 are external. Sidebar has about 90 links by
  DocType; Team (Grant Credit, Adjust Credit, Suspend) is missing; Entitlement Token
  (0 rows, retired by ADR 0006) is present.
- **Seen.** Home order: At a glance, Manage catalog, Dashboards, Reports. Nothing
  for a support task.

### CB-42 Operator alerts have no Desk list
- **Observed (E2).** `collect()` gathers nine alert kinds; `run_operator_alerts` posts
  to Raven or email and writes an Error Log row
  (`central/billing/platform/alerts.py:36-462`). No Desk list of what is open.

### CB-29 (scope added) Operator notes reach customers by design
- **Observed (E2).** Grant Credit's Note defaults to "Beta credit"; Adjust Credit
  asks for a Reason (`central/identity/doctype/team/team.js:166-220`). Both become the
  ledger note the customer sees in Wallet history. Neither dialog says so. The
  Suspend dialog does say its reason stays internal. Added to #160.

### Not reviewed in depth
Plan Configurator, Billing Simulator, the 41 reports' numbers, the resize and
trial-upgrade dialogs (read for billing calls only).

## Open-points pass (9 Nov 2026)

### Hypothesis results
- **H-01 refuted (E2).** frappe-ui 1.0.1 `useCall.submit()` throws when the call
  fails (`useCall.ts:276-289`), so `usePayInvoice.run` never reaches the success
  toast; `onError` shows the error once.
- **H-02 refuted (E2).** Every opened invoice with an amount due sends
  `payment_scheduled` (`payments/payment_notices.py:15-29`, called from
  `lifecycle.open_and_collect`), and `payment_reminder` goes the day before the
  payment date (`payment_notices.py:171-215`). Both are email-capable event types
  (`central/fixtures/notification_event_type.json`). Manual Checkout teams get them.
- **H-03 partly confirmed → CB-43.** Seen at 390 px: the panel covers the list but has
  a visible Close button. Focus stays behind it and Escape does not close it.
- **H-04 confirmed → CB-45.** No credit-expiry event type exists; `run_credit_expiry`
  sends nothing.
- **H-05 open.** Needs a look at production Billing Settings.

### CB-21 measured and reproduced
- **E4.** Production Stripe webhook events: 7 `setup_intent.created`, 8
  `setup_intent.requires_action`, 3 `setup_intent.succeeded`, 1
  `setup_intent.setup_failed`. Most card setups stop at the bank authentication
  step. Razorpay: 4 `payment.failed` for UPI setups (already known). Webhooks do
  arrive, although Central's Payment Gateway rows show no registered endpoint
  (`is_webhook_active = 0` for both): the endpoints were set up in the gateway
  dashboards, so the Payment Gateway form misreports their state.
- **Reproduced (central.local, Stripe test mode).** Card 4000 0025 0000 3155,
  authentication cancelled: the dialog shows Stripe's "We are unable to authenticate
  your payment method. Please choose a different payment method and try again." A
  `Pending Validation` row is left, hidden from the Payments page. Retrying the same
  card is possible, but the text tells the customer to choose another.
- **Happy path works.** Card 4242: saved and shown as "Visa ···· 4242 · expires
  12/2034 · Fallback 1" in about 15 seconds, no reload.

### Other items seen on central.local
- **CB-01 seen.** Receipt: Subtotal $25.00, Credits applied −$5.00, **Total $25.00**.
- **CB-11 seen.** The refunded check charge is disclosed only after "Add card".
- **Copy.** The picker says "Authorised on your bank's page. We never see your card
  details." and the next step is a Stripe field inside the dialog (added to #174).
- **Environment.** `central.local` has no trust tiers configured, so the plan menu
  returns no plans for any team, and images fail on a tenant-ID data error. The New
  server page could not be exercised on either test site.

### CB-43 Invoice list at phone width
See #184. The list is 720 px wide in a 362 px scroller at 390 px; Status and
Amount are off screen.

### CB-44 Revenue reports count waived invoices
- **E2.** `billable_line_items` keeps every non-cancelled Billable invoice
  (`central/billing/report/_revenue.py:20-40`), so MRR and YTD Revenue, Cluster-wise,
  Services and Atlas-based Revenue include Waived. `_economics.py:73-83` sets Waived
  revenue to 0.
- **E4.** Revenue base ₹69,719.75; ₹56,151.78 (80 %) is waived internal usage.

### CB-45 Credit expiry has no notice
See H-04 above and #185.

## D8 Metered services: Cargo and Grove

Full detail and the proposed design: [daily-usage-store.md](../13-brainstorming/daily-usage-store.md).

### CB-46 AI usage is never billed
- **Observed (E2).** Central: "AI is prepaid at Grove, so it has no subscription
  here." (`central/services/doctype/team_service/team_service.py:123`). Grove
  (`grove/billing/README.md`, `e028f25`): AI is postpaid, billed in arrears by Central
  from `api.usage.usage(pulled_after, pulled_until)`; Grove holds no money.
  `GroveClient.get_usage` supports that window (`central/integrations/grove.py:150-170`);
  no billing code calls it. Grove purges Usage Records after 90 days.
- **Observed (E4).** 8 active AI services (1 external since 30 Oct, 7 internal since 8
  Oct), 0 AI subscriptions, 0 AI usage rows, no AI plan in the catalog, 51 trial keys.
- **Correction to earlier notes.** Central's Grove client now matches Grove HEAD
  (keys, usage, figures); the 19 Oct finding that it called missing endpoints is out
  of date.

### CB-48 No per-day usage store
- **Observed (E2).** Cargo keeps only the current reading
  (`cargo/object_storage/doctype/bucket/bucket.py:226-240`). Central's storage job
  adds each day's share to one monthly Usage Rollup and keeps no day rows
  (`central/billing/revenue/storage_usage.py:18-63`); a missed day is billed at the
  next reading's size.
- **Observed (E4).** 4 storage rollups, all internal, 2.05 GB-months in October.
  Remote Storage is Incremental, so the increments add up correctly.

### CB-47 Storage priced at zero; GiB labelled GB
- **Observed (E4).** Object Storage Plan includes Storage 0 GB; no Storage Catalog
  Rate; every rollup has locked rate 0.
- **Observed (E2).** `BYTES_PER_GIB = 1024**3`, "billing names the unit GB"
  (`storage_usage.py:13-14`).

### CB-49 Transfer is promised but not measured
- **Observed (E2).** "Every server includes 1 TB of transfer a month."
  (`PlanGroup.vue:222-226`, Central Settings `included_transfer_gb`); no transfer
  reading reaches Central.

## Hypotheses

| ID | Hypothesis | Why plausible | How to check |
|---|---|---|---|
| H-04 | Prepaid teams are not warned before promotional credit expires | Only a facts-card hint (`CycleFacts.vue:91-99`) | Trace notifications for credit expiry |
| H-05 | Operator alerts reach no one in production | Backup: Raven fields and `operator_alert_emails` empty; 0 "Billing operator alert" rows in Error Log (1–15 Oct). The settings row was changed by the local migrate on 6 Nov | Check Billing Settings and the alert channel on production |
| H-01 | After a failed `pay_invoice`, `pay.data` may still hold the previous call's result, so the toast says "Payment initiated" | `usePayInvoice.ts:38-39` reads `pay.data` after `submit` without checking `pay.error` | Read frappe-ui `useCall` on error; or pay two invoices in demo, the second failing |
| H-02 | Manual Checkout customers are not emailed each bill | Copy at `CollectionActionBanner.vue:68`; sender not traced | Trace `platform/notifications.py` for invoice issue |
| H-03 | At phone width the receipt panel covers the list and traps users without a clear way back | `SidePanel.vue:23` (`absolute inset-0` below `md`) | Browser pass (D-09) |

## Suggestions

| ID | Suggestion | Basis |
|---|---|---|
| S-01 | Warn before a saved card expires | The row shows expiry (`PaymentMethodsCard.vue:81-93`); no warning found in D1 screens; notifications not traced |
| S-02 | Let a team add invoice recipients (accounts@) | Billing email is one field (`BillingProfileForm.vue:170-175`); "Email invoice" is wanted but missing (CB-15) |
