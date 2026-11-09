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
| D-12 | ~~Keep Prepaid separate from Auto Charge?~~ **Decided 9 Nov 2026:** keep them separate. Prepaid = the wallet pays dues; only when the wallet is short is the alternative method (card or UPI) charged | — | CB-03, CB-04 | User | Conflicts with `start_auto_charge`, which moves a Prepaid team to Auto Charge when its first method becomes active (`payment_method.py:15-18`, `collection_mode.py:115-126`); see CB-04 |
| D-13 | ~~What figure is the spending limit checked against?~~ **Decided 9 Nov 2026:** the base cost before tax (today's gate: monthly run-rate of what runs). Because the Overview shows cost with tax, every limit surface must say taxes are added on top | — | CB-25, CB-26 | User | Gate sums `locked_rate`, pre-tax (`subscriptions.py:1036-1041,1072`) |
| D-14 | ~~Auto-recharge: build or remove?~~ **Decided 9 Nov 2026:** do not build it. Remove the switch | — | CB-15 | User | Inert switch (`WalletHistoryPanel.vue:25-31,51-57`) |
| D-15 | ~~Ship or hide budget alerts?~~ **Decided 9 Nov 2026:** budget alerts are needed. Build the sender; do not hide the setting | — | CB-23 | User | Never sent; 0 teams set one |
| D-16 | Is a stopped server billed? | Full rate (capacity held) / disk only / not billed | CB-35 | Product + finance | Engine bills in full (no change row on stop); docs say billing follows the hours it ran (`docs/content/billing/index.md:26`) |
| D-17 | Keep "Pause billing" as an action separate from Stop? | Keep both, each saying its bill effect / merge into Stop | CB-34, CB-35 | Product | Both stop the server; 1 pause in production |
