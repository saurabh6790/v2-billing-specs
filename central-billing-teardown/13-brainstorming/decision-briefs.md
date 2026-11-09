# Decision briefs

One recommendation for each open decision, with the evidence it rests on. A
recommendation is not a decision; nothing here is applied until you confirm it.

| ID | Question | Recommendation | Why | Unblocks |
|---|---|---|---|---|
| D-02 | ~~Who may change how a team pays?~~ | **Decided 9 Nov 2026:** owner or billing rights; wallet first, then the method | — | #148 |
| D-03 | ~~Support actions~~ | **Decided 9 Nov 2026:** see everything, read only | — | #149, #167 |
| D-04 | ~~Setup expiry~~ | **Decided 9 Nov 2026:** 24 hours, notify the customer | — | #146 |
| D-05 | Limit repeated failed setups? | Rate limit: 5 setups per team per hour, no review queue | Card testing: a fraudster uses an add-card form to check stolen cards, because each setup asks the bank to approve the card. It brings Stripe dispute and fraud warnings and can get an account restricted. Production shows no sign of it today (19 setups in all), so this is a cheap guard, not a fix for a seen problem. A real customer retrying 3-D Secure needs 2 or 3 tries, well under 5 | #146 |
| D-07 | ~~Tiny invoices~~ | **Decided 9 Nov 2026:** below the gateway minimum, waive and book as loss | — | #158 |
| D-08 | Is 14 % profile completion a problem? | Accept it; measure completion among teams that run out of credit instead | The billing profile (name, address, tax ID, currency) is asked for only when a team's free credit runs out, not at sign-up. So most of the 55 incomplete teams are on credit and have no reason to fill it in yet. The number that matters is: of teams whose credit ran out, how many completed the profile and kept their servers. A low number there means lost customers | — |
| D-10 | ~~Amount column~~ | **Decided 9 Nov 2026:** invoice total | — | #159 |
| D-11 | ~~Last method removal~~ | **Decided 9 Nov 2026:** replace-only | — | #168 |
| D-18 | ~~Does a paused server bill disk?~~ | **Decided 9 Nov 2026:** no, Pause stops billing for everything | — | #175 |
| D-19 | ~~Servers stopped by dunning?~~ | **Decided 9 Nov 2026:** no, they bill nothing while suspended | — | #176 |
| D-20 | ~~Who rates AI?~~ | **Decided 9 Nov 2026:** Grove's USD price | — | #186 |
| D-21 | ~~AI in INR?~~ | **Decided 9 Nov 2026:** convert at the billing day's rate; display is D-26 | — | #186 |
| D-22 | ~~Bundles?~~ | **Decided 9 Nov 2026:** the plan's base offering, per subscription | — | #187, #189 |
| D-23 | ~~Storage unit~~ | **Decided 9 Nov 2026:** GB | — | #188 |
| D-24 | ~~Storage day with nothing stored~~ | **Decided 9 Nov 2026:** bill as S3: an empty bucket bills nothing | — | #187 |
| D-25 | Stop: bill the disk, or snapshot and bill the snapshot? | Two choices in the Stop dialog. **Stop** keeps the disk and bills disk only (D-16), for short stops. **Snapshot and release** takes a snapshot, releases the server and its disk, and bills the snapshot; Start restores a new server from it. Suggest it when a server has been stopped for 7 days | Billing the snapshot while the disk is kept means Frappe pays for the disk with no revenue. Releasing the disk is what makes the lower price honest: snapshot ₹6.50/GB-month on used size against disk ₹20/GB-month on full size. Restore already exists. Open for infrastructure: does the IP and server name survive a restore | #176 |
| D-26 | Overview for INR teams using AI | One rate per month. If the rate is 94 on the 1st and 96 on the 30th, the customer sees and pays at 94 all month and Frappe absorbs about 2.1 %; if it falls from 96 to 94, Frappe gains the same. The 30th's rate becomes next month's rate. A fixed margin (for example 2 %) on the month's rate covers normal moves: the rate on the billing day (1st) is fixed for the month that starts, and the Overview, AI price list and that month's invoice all use it. Source: ERPNext Currency Exchange on that date | The customer sees in INR what they will be billed, and the figure moves only with usage. Frappe's exposure is one month of rate change on a small revenue line. Note: this takes D-21's "billing day" as the day that opens the month; if it must be the day that closes it, the Overview can only show an estimate | #186 |
| D-27 | Missed storage reading (the job did not run) | The last reading, marked estimated | Nearest to what was stored; visible as an estimate; rare once the job reads hourly | #187 |
| H-05 | (check, not a decision) Are operator alerts configured in production? | Check Billing Settings on production | The backup shows empty Raven fields, but the row was changed by a local migrate | #182 |
