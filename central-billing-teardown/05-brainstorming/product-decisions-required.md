# Product decisions required

Choices the code cannot settle. Each blocks one or more issues. Owner is a
suggestion; nobody is assigned.

| ID | Decision | Options | Blocks | Suggested owner | Evidence |
|---|---|---|---|---|---|
| D-01 | **What does Prepaid mean?** Credits only, or credits then the saved method? | Credits only / credits then method / offer both | CB-04, CB-03 | Product + finance | Screen vs engine (`PaymentMethodsCard.vue:19-36` vs `collection_mode.py:105-112`); 4 teams exposed |
| D-02 | Who may change collection mode: every team, or only INR teams over the mandate limit? | All / INR only / support only | CB-03 | Product | Only chooser today is INR Action required |
| D-03 | Support persona and allowed actions: read only, or charge again, payment link, release hold? | Read / read + safe actions / full | CB-18, CB-19 | Support lead + finance | `invoice.js` actions today |
| D-04 | How long an unfinished payment-method setup stays before it expires | 24 h / 7 days / never | CB-21 | Product | Rows 6–20 days old |
| D-05 | Do repeated failed setups limit further attempts (fraud, card testing)? | No / rate limit / review | CB-21 | Security + product | — |
| D-06 | Who is alerted when an invoice stays held, and after how long? | Billing on-call, N hours | CB-22 | Finance + platform | 2 held invoices at backup time |
| D-07 | Should sub-rupee / below-minimum invoices be created and shown at all? | Show / hide / never create | CB-16 | Finance | Cancelled ₹0.01 and ₹0.26 invoices; below-minimum write-off exists (`generate.py:333-350`) |
| D-08 | Is a 14 % profile completion rate a problem? The product asks for details when credit runs out (credit-funded provisioning). | Target a rate / accept | CB-12 | Product | 9 of 64 complete |
| D-09 | Visual pass: who signs in to `demo-billing.localhost` for the browser run (screenshots, phone width, keyboard)? | User signs in / provide a test user | All UI findings (move E2 → seen) | User | Browser login stopped at session hand-off |
| D-10 | Invoice list Amount column: invoice total or amount due? | Total / due / both | CB-01 | Product + finance | `InvoiceListView.vue:83-88` |
| D-11 | Last payment method with money owed: block, warn, or replace-only? | Block / warn / replace | CB-02 | Product | `payments.py:326-349` |
