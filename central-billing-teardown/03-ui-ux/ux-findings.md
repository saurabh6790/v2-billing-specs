# UX findings (D1, D2)

The UI/UX view of each problem in the [problem register](../04-problem-discovery/problem-register.md),
in the format Workstream B asks for. Evidence and measurements stay in the register;
this file is about the experience. Alternatives are compared in
[solution-alternatives.md](../05-brainstorming/solution-alternatives.md).

---

### CB-21 Unfinished payment-method setups vanish
- **Screen.** S-12 Add payment method → S-09 Payment methods.
- **Current.** If the bank declines or the person closes the sheet, the dialog may
  show an error once. After that the half-made method is hidden. Payments looks as
  if they never tried.
- **Confusing because.** The welcome credit says "Your first payment method unlocks
  it", and nothing says why it did not.
- **Persona.** New customer; support agent.
- **Impact.** Measured: 10 teams stuck with only unfinished methods.
- **Alternatives.** (a) Show unfinished rows with "Not finished: Try again";
  (b) a banner "Your UPI setup didn't finish"; (c) email follow-up.
- **Recommended.** (a), plus (c) only if measurement shows people leave the console.
- **Expected behaviour.** An unfinished or failed setup appears on Payments within
  a minute of the event, with the bank's reason when known and one button to retry
  the same instrument. After 7 days unfinished rows are hidden and recorded as
  expired.

### CB-22 A held invoice gives no time and no help
- **Screen.** S-04 receipt panel footer; S-07 banner.
- **Current.** "This invoice is being prepared. You can pay it once it is issued."
- **Confusing because.** No date, no reason, no contact. Is something wrong?
- **Persona.** Customer; finance (cash).
- **Impact.** Measured: both external owed invoices were in this state.
- **Alternatives.** (a) Add an expected date; (b) add "We'll email you when it's
  ready"; (c) hide held invoices until issued.
- **Recommended.** (a) + (b). (c) hides money owed and breaks the banner total.
- **Expected behaviour.** "Being prepared. We'll issue it by 5 Nov and email you.
  Nothing to do yet."

### CB-03 How I pay is invisible
- **Screen.** S-08 Payments; S-16 Action required dialog.
- **Current.** No mode shown or changeable; promoting a card on Prepaid switches mode.
- **Confusing because.** The dialog promises "Billing settings" that do not exist.
  The toast after promoting says nothing about the mode change.
- **Persona.** Customer admin; support.
- **Impact.** Every external team is Prepaid and cannot see it.
- **Alternatives.** (a) "How you pay" card at the top of Payments with Change;
  (b) mode as a radio group inside the Payment methods card header; (c) a
  separate Billing settings page.
- **Recommended.** (a). One place, beside the methods it governs, no new page.
- **Expected behaviour.** The card states the mode in one sentence and what happens
  when credit runs out. Change opens a dialog in the Action-required style (one
  card per mode, who it suits) and states the effect before Confirm. Promoting a
  card never changes the mode on its own.

### CB-01 The receipt does not add up
- **Screen.** S-04.
- **Current.** Subtotal, Tax, −Credits, −Top-up GST, **Total** (gross), then "Pay ₹Y now".
- **Confusing because.** The green minus lines sit above a Total that ignores them.
  TDS reduces Y with no line. The list's Amount is the gross figure.
- **Persona.** Customer, accounts team.
- **Impact.** No affected invoices yet (E4). It will appear with the first credit
  draw or TDS customer.
- **Alternatives.** (a) Subtotal → Tax → **Invoice total** → −Credits → −TDS →
  **Amount due**; (b) show only Amount due with an expandable breakdown;
  (c) keep the layout, rename Total to "Invoice total" and move it above the deductions.
- **Recommended.** (a). It matches the ERPNext tax invoice (gross) and the button (net).
- **Expected behaviour.** Every number on the panel is the sum of the lines above
  it. The button amount equals "Amount due". The list shows Amount due for open
  invoices and Invoice total for settled ones, with the column labelled to match.

### CB-06 Load failure looks like "no invoices"
- **Screen.** S-02/S-03.
- **Current.** "No invoices yet. Your first invoice appears here at the end of the cycle."
- **Persona.** Customer.
- **Impact.** Contradicts the banner. Can cause a support ticket or a missed payment.
- **Recommended.** Red Alert with Retry, as on Payments (`BillingPaymentsPage.vue:28-34`).
- **Expected behaviour.** On error: "Couldn't load your invoices. Retry, or contact
  support if this keeps happening." Empty state only when the call succeeded with
  0 rows.

### CB-07 Waiting forever
- **Screen.** S-04 footer.
- **Current.** Spinner + "Waiting for your bank to confirm the payment…" until reload.
- **Persona.** Customer.
- **Alternatives.** (a) Poll every 5 s for 2 min, then slow down and say "This is
  taking longer than usual. You can leave this page; we'll email you."; (b) push
  over socket.io; (c) drop the spinner and say "We'll update this when your bank
  confirms. Refresh to check."
- **Recommended.** (a) now. (b) when Central gets a push channel.
- **Expected behaviour.** The panel flips to Paid, or to Failed with the reason,
  without a reload. The spinner never runs past the polling window.

### CB-08 Banner "Pay now" does not open the invoice
- **Screen.** S-07 → S-02.
- **Recommended.** Push `?invoice=<oldest open issued invoice>`. With more than one,
  open the list filtered to Outstanding + Overdue.
- **Expected behaviour.** One click from the banner shows the amount and the Pay button.

### CB-09 Pay without knowing what is charged
- **Screen.** S-04 footer.
- **Current.** One click charges the first method off-session.
- **Alternatives.** (a) Button names the method: "Pay ₹Y with Visa ••4242", plus
  "Use another method"; (b) a confirm dialog; (c) both.
- **Recommended.** (a). It adds information without adding a step. A confirm adds
  a click to the most important action.
- **Expected behaviour.** The button names the method that will be tried first.
  If none can be used, it says so and offers Add method or a one-time payment.

### CB-11 "No charge today"
- **Screen.** S-18 step list; S-12.
- **Recommended.** "We check your card with a small charge and refund it at once."
  Shown on the onboarding step and above the card field before the click.

### CB-12 Country saved without asking
- **Screen.** S-18.
- **Recommended.** Pre-select India from the time zone; save on Continue.
- **Expected behaviour.** Opening onboarding writes nothing.

### CB-13 Billing details form
- **Recommended.** Disable Country after the lock, with the server's sentence ("This
  team already has a wallet, payment method or invoice"). Order: Legal name,
  Billing email, Address 1, Address 2, City, State, Postal code, Country, Phone,
  GSTIN. Neutral phone placeholder ("+1 555 010 0000" or none), with country code help.

### CB-14 Internal words
- **Recommended.** Apply the glossary in
  [visual-consistency-review.md](visual-consistency-review.md#terminology). Examples:
  "Add payment method" for the add row; drop the invoice type from the subtitle
  (show "Free trial, not charged" only for cost reports); "Payment sent. We'll
  mark the invoice paid when your bank confirms."

### CB-15 Dead "Email invoice"
- **Recommended.** Remove it until it works. Track MC-06 separately.

### CB-16 Filter and Statement
- **Recommended.** Status filter lists every status the list can contain. Statement
  becomes an "Export statement (CSV)" action on the list. The "issued separately"
  line goes.

### CB-05 Primary label and promote
- **Recommended.** One control: Move up / Move down, plus "Charge this first" that
  moves the row to the top. Wallet row says "Used first while you have credit",
  not "Primary".

### CB-17 Accessibility
- See [accessibility-review.md](accessibility-review.md), A-01 to A-09.

### CB-18 Support has no team view (operator)
- **Screen.** O-01, O-03.
- **Current.** List-by-list lookups, or impersonation.
- **Persona.** Support agent, finance.
- **Alternatives.** (a) Desk page "Team billing" fed by `get_team_billing`;
  (b) a Billing tab on the Team form using Frappe connections; (c) a report
  filtered by team.
- **Recommended.** (a) for the summary and actions, (b) for links to the records.
- **Expected behaviour.** One page answers: can this team pay, how, what is owed,
  what failed and why, and what changed recently.
