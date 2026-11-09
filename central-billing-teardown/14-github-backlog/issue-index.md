# Issue index

The teardown issues live in the repo's issue folder, where the fixing agent reads
them: **`issues/146` to `issues/189`**, milestone **TD**
([issues/README.md](../../issues/README.md#teardown-td)). They are not opened on
GitHub. Nobody is assigned.

- Decisions of 9 Nov 2026 are applied: Prepaid = wallet first, method for the
  shortfall, kept separate from Auto Charge (#150); limit on base cost before tax
  with "taxes are added on top" (#147); no auto-recharge (#170); budget alerts are
  built (#156); held invoices are expected (CB-22, no issue).
- HITL issues need a decision from
  [product-decisions-required.md](../13-brainstorming/product-decisions-required.md).
- Hypotheses (H-01 to H-05) and suggestions (S-01, S-02) have no issue until
  confirmed or accepted.

## Labels

Each issue states its labels on the header line.

| Label | Meaning |
|---|---|
| `type:bug` | Behaviour contradicts the code's own intent, a decision, or another screen |
| `type:ux` | Works, but is hard, confusing or inaccessible |
| `type:feature` | Missing capability |
| `type:operations` | Operator or support tooling |
| `type:reliability` | Failure handling, data left in a wrong state |
| `type:technical-debt` | Internal clean-up |
| `priority:p0`–`p3` | As in the teardown README; none P0 |
| `area:billing-setup` / `area:invoices` / `area:limits` / `area:wallet` / `area:operator-desk` | Domain |

Size: XS < 0.5 day, S ≤ 2 days, M ≤ 1 week, L > 1 week. Estimated from code size.

## Issues

| # | Slice | Type | Priority | Size | Problem |
|---|-------|------|----------|------|---------|
| [146](../../issues/146-unfinished-payment-method-setups.md) | Payment-method setups and top-ups that fail or are abandoned leave no end state and nothing the customer can see | HITL | P1 | M | CB-21 |
| [147](../../issues/147-spending-limit-one-figure.md) | The spending limit is compared with three figures on screen, and none is the one the server-create gate uses | HITL | P1 | M | CB-25 |
| [148](../../issues/148-show-and-change-how-you-pay.md) | Customers cannot see or change how they pay, and making a card primary silently changes it | AFK | P1 | M | CB-03 |
| [149](../../issues/149-team-billing-view-for-support.md) | Support has no single view of a team's billing | AFK | P1 | M | CB-18 |
| [150](../../issues/150-prepaid-meaning-screen-vs-engine.md) | Prepaid copy and console logic assume credits only; the decided rule is credits first, then the saved method | AFK | P2 | S | CB-04 |
| [151](../../issues/151-overview-setup-banner-flash.md) | Overview shows "Add your billing details" on every load, even for teams with complete details | AFK | P2 | XS | CB-27 |
| [152](../../issues/152-invoice-list-error-state.md) | Invoice list shows "No invoices yet" when loading fails | AFK | P2 | XS | CB-06 |
| [153](../../issues/153-banner-pay-now-deep-link.md) | Overview "Pay now" opens the invoice list instead of the owed invoice | AFK | P2 | XS | CB-08 |
| [154](../../issues/154-onboarding-country-autosave.md) | Onboarding saves a billing country from the browser time zone without the user choosing it | AFK | P2 | XS | CB-12 |
| [155](../../issues/155-card-check-charge-disclosure.md) | Onboarding says "No charge today" but adding a card makes a small refunded charge | AFK | P2 | XS | CB-11 |
| [156](../../issues/156-budget-alerts-never-sent.md) | Budget alerts are saved but never sent | HITL | P2 | S | CB-23 |
| [157](../../issues/157-facts-card-label-truncation.md) | Overview facts card labels shrink to single letters when a side panel is open | AFK | P2 | XS | CB-28 |
| [158](../../issues/158-invoice-filter-and-statement.md) | Invoice filter cannot show Cancelled or Waived invoices; Statement tab repeats the list and misstates tax invoices | AFK | P2 | S | CB-16 |
| [159](../../issues/159-receipt-totals-add-up.md) | Invoice receipt shows deductions above a Total that ignores them, hides TDS, and the Pay amount differs from Total | AFK | P2 | S | CB-01 |
| [160](../../issues/160-wallet-history-readable.md) | Wallet history shows raw timestamps, internal notes, no expiry per grant, and only the latest 50 entries | AFK | P2 | S | CB-29 |
| [161](../../issues/161-topup-presets-and-gst.md) | Top-up quick amounts ignore currency and the forecast, and GST is computed in the browser | AFK | P2 | S | CB-32 |
| [162](../../issues/162-one-cost-figure-on-overview.md) | This cycle's cost appears five times on the Overview, from two sources and two tax bases | AFK | P2 | M | CB-26 |
| [163](../../issues/163-customer-safe-error-messages.md) | Server error text reaches customers word for word in payment and invoice flows | AFK | P2 | M | CB-20 |
| [164](../../issues/164-pay-now-names-method.md) | "Pay ₹X now" charges immediately without naming the payment method | AFK | P2 | S | CB-09 |
| [165](../../issues/165-live-payment-status.md) | After paying, "Waiting for your bank to confirm" never updates without a reload | AFK | P2 | S | CB-07 |
| [166](../../issues/166-manual-checkout-gateway.md) | Manual Checkout always opens the Razorpay sheet whatever gateway the order was created on | AFK | P2 | S | CB-10 |
| [167](../../issues/167-operator-invoice-actions.md) | Operators cannot charge again, send a payment link or release a hold from an invoice; Cancel shows no effects | AFK | P2 | M | CB-19 |
| [168](../../issues/168-last-payment-method-removal.md) | The last payment method can be removed while an invoice is owed, with a warning that does not say so | AFK | P2 | S | CB-02 |
| [169](../../issues/169-payment-invoice-accessibility.md) | Accessibility gaps in payment-method and invoice screens | AFK | P2 | S | CB-17 |
| [170](../../issues/170-remove-disabled-email-invoice.md) | Remove controls that never work: "Email invoice" and the "Auto-recharge" switch | AFK | P3 | XS | CB-15 |
| [171](../../issues/171-primary-method-controls.md) | "Primary payment method" is disabled without a reason while "Move up" does the same thing | AFK | P3 | XS | CB-05 |
| [172](../../issues/172-mandate-label-duplicate.md) | "UPI Autopay" is shown twice on a mandate row with no UPI ID | AFK | P3 | XS | CB-24 |
| [173](../../issues/173-billing-details-form-polish.md) | Billing details form: country editable after currency lock, vague lock text, address field order | AFK | P3 | XS | CB-13 |
| [174](../../issues/174-customer-copy-glossary.md) | Customer copy in payment and invoice screens uses internal words | AFK | P3 | S | CB-14 |
| [175](../../issues/175-pause-billing-keeps-charging.md) | "Pause billing" stops the server but not the charges, and a paused server that is later terminated bills on | AFK | P1 | M | CB-34 |
| [176](../../issues/176-stop-versus-pause-billing.md) | A stopped server should bill for its disk only; today it bills in full and nothing tells the customer | AFK | P2 | M | CB-35 |
| [178](../../issues/178-purchase-payment-gate-mismatch.md) | The New server page says no payment method is needed when the team has any credit, then the server refuses the create | AFK | P2 | S | CB-39 |
| [177](../../issues/177-purchase-price-basis.md) | The server price at purchase does not say it is before tax, leaves out the IPv4 charge, and says servers are billed to the payment method | AFK | P2 | S | CB-38 |
| [179](../../issues/179-record-purchase-refusals.md) | Refused server creates and resizes leave no record, so nobody can see how often customers hit the spending limit | AFK | P2 | S | CB-40 |
| [181](../../issues/181-desk-billing-home-for-support.md) | The Desk billing home counts internal teams as customers and has nothing for support work | AFK | P2 | S | CB-41 |
| [182](../../issues/182-operator-alerts-desk-queue.md) | Open operator alerts are visible only in Raven or email, with no list in Desk | AFK | P2 | S | CB-42 |
| [180](../../issues/180-project-limit-gaps.md) | A project's spending limit is checked only when a server is tagged, and its errors show internal ids | AFK | P3 | S | CB-36 |
| [183](../../issues/183-revenue-reports-count-waived.md) | Revenue reports count waived internal invoices as revenue; the economics reports do not | AFK | P1 | S | CB-44 |
| [184](../../issues/184-invoice-list-phone-width.md) | At phone width the invoice list hides Status and Amount off to the right, and the invoice panel keeps focus behind it | AFK | P2 | S | CB-43 |
| [185](../../issues/185-credit-expiry-notice.md) | Promotional credit expires with no notice to the team | AFK | P2 | S | CB-45 |
| [187](../../issues/187-usage-day-ledger.md) | Store metered usage per day (Usage Day), and build the monthly figure from the days | AFK | P1 | M | CB-48 |
| [186](../../issues/186-bill-ai-usage-from-grove.md) | AI usage is never billed: Central thinks Grove is prepaid, Grove expects Central to bill in arrears | AFK | P1 | M | CB-46 |
| [188](../../issues/188-storage-price-and-unit.md) | Object storage is metered but priced at zero, and its GiB figure is labelled GB | HITL | P2 | S | CB-47 |
| [189](../../issues/189-bundled-transfer-unmetered.md) | Every server promises 1 TB of transfer a month, and nothing measures transfer | HITL | P3 | S | CB-49 |
