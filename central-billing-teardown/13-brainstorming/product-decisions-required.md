# Product decisions required

Choices the code cannot settle. Each blocks one or more issues. Owner is a
suggestion; nobody is assigned.

| ID | Decision | Options | Blocks | Suggested owner | Evidence |
|---|---|---|---|---|---|
| D-01 | ~~What does Prepaid mean?~~ **Decided 9 Nov 2026:** credits first (a top-up is an advance that settles invoices); when credit is not enough and a method is saved, the method is charged for the rest | — | CB-04, CB-03 | User | Engine already matches (`collection_mode.py:105-126`) |
| D-02 | Who may change collection mode: every team, or only INR teams over the mandate limit? | All / INR only / support only | CB-03 | Product | Only chooser today is INR Action required |
| D-03 | Support persona and allowed actions: read only, or charge again, payment link, release hold? | Read / read + safe actions / full | CB-18, CB-19 | Support lead + finance | `invoice.js` actions today |
| D-04 | How long an unfinished payment-method setup stays before it expires | 24 h / 7 days / never | CB-21 | Product | Rows 6–20 days old |
| D-05 | Do repeated failed setups limit further attempts (fraud, card testing)? | No / rate limit / review | CB-21 | Security + product | — |
| D-06 | ~~Held invoices~~ **Decided 9 Nov 2026:** holds are expected until the accounting integration and accounts are finalised. Alerting is revisited then | — | CB-22 | User | — |
| D-07 | Should sub-rupee / below-minimum invoices be created and shown at all? | Show / hide / never create | CB-16 | Finance | Cancelled ₹0.01 and ₹0.26 invoices; below-minimum write-off exists (`generate.py:333-350`) |
| D-08 | Is a 14 % profile completion rate a problem? The product asks for details when credit runs out (credit-funded provisioning). | Target a rate / accept | CB-12 | Product | 9 of 64 complete |
| D-09 | ~~Visual pass~~ **Decided 9 Nov 2026:** create test users on the demo site as needed. Done at 1440 px; phone width and assistive tech still open | — | All UI findings | User | — |
| D-10 | Invoice list Amount column: invoice total or amount due? | Total / due / both | CB-01 | Product + finance | `InvoiceListView.vue:83-88` |
| D-11 | Last payment method with money owed: block, warn, or replace-only? | Block / warn / replace | CB-02 | Product | `payments.py:326-349` |
| D-12 | With Prepaid = credits then method, a Prepaid team with a saved method behaves like Auto Charge. Keep Prepaid as a separate mode, or make it "Auto Charge with no method yet"? | Keep both / merge / rename | CB-03, CB-04 | Product | `start_auto_charge` already converts on first method (`collection_mode.py:115-126`); 4 Prepaid teams with methods (E4) |
| D-13 | What figure is the spending limit checked against? | Monthly run-rate (today's gate) / projected cycle before tax / both | CB-25 | Product + finance | Six bases on screen (visual-consistency-review §Tax basis) |
| D-14 | Auto-recharge: build it, or remove the switch? | Build / remove / one-click top-up instead | CB-15 | Product | Inert switch; rule already charges the method for the rest |
| D-15 | Should budget alerts ship now (job + email) or be hidden until they do? | Ship / hide | CB-23 | Product | Never sent; 0 teams set one |
