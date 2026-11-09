# Decision briefs

One recommendation for each open decision, with the evidence it rests on. A
recommendation is not a decision; nothing here is applied until you confirm it.

| ID | Question | Recommendation | Why | Unblocks |
|---|---|---|---|---|
| D-02 | Who may change how a team pays? | Every team admin with `billing:manage`, between Prepaid and Auto Charge; Manual Checkout only for INR teams above the mandate ceiling | Today only the INR Action-required dialog sets it. All 64 external teams are Prepaid; D-12 keeps Prepaid separate, so the choice matters | #148 |
| D-03 | What may support do on a team's billing? | Read everything, plus three safe actions: resend a payment link, retry an accounting sync, and charge again on request. Cancel and refund stay with finance | Each action writes a Billing Event; none moves money without the customer's method on file | #149, #167 |
| D-04 | How long does an unfinished payment-method setup stay? | 24 hours, then Expired | Production rows are 6–20 days old; most stopped at bank authentication (CB-21 measurement), which completes in minutes or not at all | #146 |
| D-05 | Limit repeated failed setups? | Rate limit: 5 setups per team per hour, no review queue | Stops card testing without blocking a customer retrying 3-D Secure | #146 |
| D-07 | Show sub-rupee and below-minimum invoices? | Never create them; roll the amount into the next invoice | Production has cancelled ₹0.01 and ₹0.26 invoices, and they make up most of the external invoice list | #158 |
| D-08 | Is 14 % profile completion a problem? | Accept it; measure completion among teams that run out of credit instead | Credit-funded provisioning asks for details only when credit runs out | — |
| D-10 | Invoice list Amount column | Amount due, labelled "Due" for open invoices and "Total" for paid ones | Matches the Pay button and CB-01 | #159 |
| D-11 | Remove the last payment method while money is owed? | Replace-only: allow removal once another method is active or nothing is owed | Blocks the one case that strands collection; no measured exposure today | #168 |
| D-18 | ~~Does a paused server bill disk?~~ | **Decided 9 Nov 2026:** no, Pause stops billing for everything | — | #175 |
| D-19 | ~~Servers stopped by dunning?~~ | **Decided 9 Nov 2026:** no, they bill nothing while suspended | — | #176 |
| D-20 | ~~Who rates AI?~~ | **Decided 9 Nov 2026:** Grove's USD price | — | #186 |
| D-21 | ~~AI in INR?~~ | **Decided 9 Nov 2026:** convert at the billing day's rate; display is D-26 | — | #186 |
| D-22 | ~~Bundles?~~ | **Decided 9 Nov 2026:** the plan's base offering, per subscription | — | #187, #189 |
| D-23 | ~~Storage unit~~ | **Decided 9 Nov 2026:** GB | — | #188 |
| D-24 | Missed storage day | Previous day's size, marked estimated | Nearest to what was held; visible as an estimate | #187 |
| D-25 | Stop: bill the disk, or snapshot and bill the snapshot? | Two choices in the Stop dialog. **Stop** keeps the disk and bills disk only (D-16), for short stops. **Snapshot and release** takes a snapshot, releases the server and its disk, and bills the snapshot; Start restores a new server from it. Suggest it when a server has been stopped for 7 days | Billing the snapshot while the disk is kept means Frappe pays for the disk with no revenue. Releasing the disk is what makes the lower price honest: snapshot ₹6.50/GB-month on used size against disk ₹20/GB-month on full size. Restore already exists. Open for infrastructure: does the IP and server name survive a restore | #176 |
| D-26 | Overview for INR teams using AI | One rate per month: the rate on the billing day (1st) is fixed for the month that starts, and the Overview, AI price list and that month's invoice all use it. Source: ERPNext Currency Exchange on that date | The customer sees in INR what they will be billed, and the figure moves only with usage. Frappe's exposure is one month of rate change on a small revenue line. Note: this takes D-21's "billing day" as the day that opens the month; if it must be the day that closes it, the Overview can only show an estimate | #186 |
| H-05 | (check, not a decision) Are operator alerts configured in production? | Check Billing Settings on production | The backup shows empty Raven fields, but the row was changed by a local migrate | #182 |
