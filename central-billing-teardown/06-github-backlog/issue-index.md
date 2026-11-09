# Issue index

22 drafts for the verified D1/D2 problems. **None is published.** They wait
for review, then go to the repository chosen at review (not yet decided). Nobody
is assigned. Hypotheses (H-01 to H-03) and suggestions (S-01, S-02) have no
issue until they are confirmed or accepted.

## Labels

| Label | Meaning |
|---|---|
| `type:bug` | Behaviour contradicts the code's own intent or another screen |
| `type:ux` | Works, but is hard, confusing or inaccessible |
| `type:feature` | Missing capability |
| `type:operations` | Operator or support tooling |
| `type:reliability` | Failure handling, data left in a wrong state |
| `type:technical-debt` | Internal clean-up with no user effect (none yet) |
| `priority:p0`–`p3` | As in the teardown README; none P0 |
| `area:billing-setup` / `area:invoices` / `area:operator-desk` | Domain |

Complexity: XS < 0.5 day, S ≤ 2 days, M ≤ 1 week, L > 1 week. Estimates from code
size, not from the team.

## Drafts

| # | Title | Problem | Priority | Size | Labels |
|---|---|---|---|---|---|
| 01 | [Payment-method setups that fail or are abandoned stay Pending Validation and are hidden from the customer](issue-drafts/01-unfinished-payment-method-setups.md) | CB-21 | P1 | M | `type:reliability` `type:ux` `priority:p1` `area:billing-setup` |
| 02 | [Owed invoices held for accounting sync cannot be paid, and the customer is not told when they will be](issue-drafts/02-held-invoices-cannot-be-paid.md) | CB-22 | P1 | S | `type:operations` `type:ux` `priority:p1` `area:invoices` |
| 03 | [Customers cannot see or change how they pay, and making a card primary silently changes it](issue-drafts/03-show-and-change-how-you-pay.md) | CB-03 | P1 | M | `type:feature` `type:ux` `priority:p1` `area:billing-setup` |
| 04 | [The console says Prepaid charges nothing else, but the engine debits a Prepaid team's saved method](issue-drafts/04-prepaid-meaning-screen-vs-engine.md) | CB-04 | P1 | S | `type:bug` `priority:p1` `area:billing-setup` |
| 05 | [Support has no single view of a team's billing](issue-drafts/05-team-billing-view-for-support.md) | CB-18 | P1 | M | `type:operations` `priority:p1` `area:operator-desk` |
| 06 | [Invoice receipt shows deductions above a Total that ignores them, hides TDS, and the Pay amount differs from Total](issue-drafts/06-receipt-totals-add-up.md) | CB-01 | P2 | S | `type:bug` `type:ux` `priority:p2` `area:invoices` |
| 07 | [The last payment method can be removed while an invoice is owed, with a warning that does not say so](issue-drafts/07-last-payment-method-removal.md) | CB-02 | P2 | S | `type:feature` `priority:p2` `area:billing-setup` |
| 08 | [Invoice list shows "No invoices yet" when loading fails](issue-drafts/08-invoice-list-error-state.md) | CB-06 | P2 | XS | `type:bug` `priority:p2` `area:invoices` |
| 09 | [After paying, "Waiting for your bank to confirm" never updates without a reload](issue-drafts/09-live-payment-status.md) | CB-07 | P2 | S | `type:ux` `priority:p2` `area:invoices` |
| 10 | [Overview "Pay now" opens the invoice list instead of the owed invoice](issue-drafts/10-banner-pay-now-deep-link.md) | CB-08 | P2 | XS | `type:ux` `priority:p2` `area:invoices` |
| 11 | ["Pay ₹X now" charges immediately without naming the payment method](issue-drafts/11-pay-now-names-method.md) | CB-09 | P2 | S | `type:ux` `priority:p2` `area:invoices` |
| 12 | [Manual Checkout always opens the Razorpay sheet whatever gateway the order was created on](issue-drafts/12-manual-checkout-gateway.md) | CB-10 | P2 | S | `type:bug` `priority:p2` `area:invoices` |
| 13 | [Onboarding says "No charge today" but adding a card makes a small refunded charge](issue-drafts/13-card-check-charge-disclosure.md) | CB-11 | P2 | XS | `type:ux` `priority:p2` `area:billing-setup` |
| 14 | [Onboarding saves a billing country from the browser time zone without the user choosing it](issue-drafts/14-onboarding-country-autosave.md) | CB-12 | P2 | XS | `type:ux` `priority:p2` `area:billing-setup` |
| 15 | [Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices](issue-drafts/15-invoice-filter-and-statement.md) | CB-16 | P2 | S | `type:ux` `priority:p2` `area:invoices` |
| 16 | [Accessibility gaps in payment-method and invoice screens](issue-drafts/16-payment-invoice-accessibility.md) | CB-17 | P2 | S | `type:ux` `priority:p2` `area:billing-setup` `area:invoices` |
| 17 | [Operators cannot charge again, send a payment link or release a hold from an invoice; Cancel shows no effects](issue-drafts/17-operator-invoice-actions.md) | CB-19 | P2 | M | `type:operations` `priority:p2` `area:operator-desk` |
| 18 | [Server error text reaches customers word for word in payment and invoice flows](issue-drafts/18-customer-safe-error-messages.md) | CB-20 | P2 | M | `type:reliability` `type:ux` `priority:p2` `area:billing-setup` `area:invoices` |
| 19 | ["Primary payment method" is disabled without a reason while "Move up" does the same thing](issue-drafts/19-primary-method-controls.md) | CB-05 | P3 | XS | `type:ux` `priority:p3` `area:billing-setup` |
| 20 | [Billing details form: country editable after currency lock, vague lock text, address field order](issue-drafts/20-billing-details-form-polish.md) | CB-13 | P3 | XS | `type:ux` `priority:p3` `area:billing-setup` |
| 21 | [Customer copy in payment and invoice screens uses internal words](issue-drafts/21-customer-copy-glossary.md) | CB-14 | P3 | S | `type:ux` `priority:p3` `area:billing-setup` `area:invoices` |
| 22 | [Remove the permanently disabled "Email invoice" button](issue-drafts/22-remove-disabled-email-invoice.md) | CB-15 | P3 | XS | `type:ux` `priority:p3` `area:invoices` |
