# Missing capabilities (D1, D2)

Things a customer or operator needs for a D1/D2 task that the product does not
offer. "Not found" means searched in the console and Desk source at `a95b491e`
and absent. Each links to the problem it would solve.

| ID | Capability | Who needs it | Evidence it is missing | Related |
|---|---|---|---|---|
| MC-01 | **See and choose how I pay** (Auto Charge / Manual Checkout / Prepaid), with what each means | Customer | Only the INR Action-required dialog sets it; its "Billing settings" pointer leads nowhere (`CollectionActionBanner.vue:134-136`) | CB-03, CB-04 |
| MC-02 | **See a payment method that failed to set up, and retry it** | Customer | Pending Validation rows are filtered out (`api/dashboard/methods.py:34`); 10 teams have only such rows (E4) | CB-21 |
| MC-03 | **Team billing view for support**: profile, mode, methods (including pending/failed), invoices, attempts, wallet, recent events on one page | Support, finance | `get_team_billing` has no caller; no Team → billing connections | CB-18 |
| MC-04 | **Operator: charge again, send a payment link, or release an accounting hold** from the Invoice | Support, finance | `invoice.js` offers cancel and refund only | CB-19, CB-22 |
| MC-05 | **Live payment status** after Pay (update without reload) | Customer | No polling or push in billing composables | CB-07 |
| MC-06 | **Email or forward an invoice; extra invoice recipients** | Customer (accounts team) | Disabled button; one billing email | CB-15, S-02 |
| MC-07 | **Expected issue date for a held invoice** | Customer | Panel says only "being prepared" | CB-22 |
| MC-08 | **Expiring-card warning** | Customer | Not found in D1 screens; notifications not traced | S-01 |
| MC-09 | **Clean-up of abandoned method setups** (expire Pending Validation after N days, tell the customer) | Platform admin | No job found; rows 6–20 days old (E4) | CB-21 |

## Capabilities present but unused

| Capability | Where | Note |
|---|---|---|
| Team billing lookup API | `central/billing/api/admin/teams.py:33` | Ready for MC-03; needs a Desk page or Team form section |
| Deep link to one invoice | `BillingInvoicesPage.vue:73-80` (`?invoice=`) | Ready for CB-08 |
| List load error | `useInvoices.ts:24-27` | Ready for CB-06 |
