# Product decisions required

Choices the code cannot settle. Each blocks one or more issues. Owner is a
suggestion; nobody is assigned.

| ID | Decision | Options | Blocks | Suggested owner | Evidence |
|---|---|---|---|---|---|
| D-01 | ~~What does Prepaid mean?~~ **Decided 9 Nov 2026:** credits first (a top-up is an advance that settles invoices); when credit is not enough and a method is saved, the method is charged for the rest | — | CB-04, CB-03 | User | Engine already matches (`collection_mode.py:105-126`) |
| D-02 | ~~Who may change how a team pays?~~ **Decided 9 Nov 2026:** the team owner or a member with billing rights. One rule: the wallet pays first; when it is empty or short, the payment method is charged directly | — | CB-03 | User | Engine already debits Prepaid teams with a method (`collection_mode.is_debit_allowed`) |
| D-03 | ~~Support persona?~~ **Decided 9 Nov 2026:** support sees everything, read only | — | CB-18, CB-19 | User | — |
| D-04 | ~~Unfinished setup expiry?~~ **Decided 9 Nov 2026:** 24 hours, and the customer is notified when it expires | — | CB-21 | User | Rows 6–20 days old |
| D-05 | Do repeated failed setups limit further attempts (fraud, card testing)? | No / rate limit / review | CB-21 | Security + product | — |
| D-06 | ~~Held invoices~~ **Decided 9 Nov 2026:** holds are expected until the accounting integration and accounts are finalised. Alerting is revisited then | — | CB-22 | User | — |
| D-07 | ~~Tiny invoices?~~ **Decided 9 Nov 2026:** an amount below the gateway's minimum charge is waived and booked as a loss | — | CB-16 | User | Write-off exists without a loss entry (`generate.py:322-348`); production minimum is ₹50 (not the gateway's) and has no USD row |
| D-08 | Is a 14 % profile completion rate a problem? The product asks for details when credit runs out (credit-funded provisioning). | Target a rate / accept | CB-12 | Product | 9 of 64 complete |
| D-09 | ~~Visual pass~~ **Decided 9 Nov 2026:** create test users on the demo site as needed. Done at 1440 px; phone width and assistive tech still open | — | All UI findings | User | — |
| D-10 | ~~Invoice list Amount column?~~ **Decided 9 Nov 2026:** the invoice total | — | CB-01 | User | — |
| D-11 | ~~Last payment method with money owed?~~ **Decided 9 Nov 2026:** replace-only | — | CB-02 | User | — |
| D-12 | ~~Keep Prepaid separate from Auto Charge?~~ **Decided 9 Nov 2026:** keep them separate. Prepaid = the wallet pays dues; only when the wallet is short is the alternative method (card or UPI) charged | — | CB-03, CB-04 | User | Conflicts with `start_auto_charge`, which moves a Prepaid team to Auto Charge when its first method becomes active (`payment_method.py:15-18`, `collection_mode.py:115-126`); see CB-04 |
| D-13 | ~~What figure is the spending limit checked against?~~ **Decided 9 Nov 2026:** the base cost before tax (today's gate: monthly run-rate of what runs). Because the Overview shows cost with tax, every limit surface must say taxes are added on top | — | CB-25, CB-26 | User | Gate sums `locked_rate`, pre-tax (`subscriptions.py:1036-1041,1072`) |
| D-14 | ~~Auto-recharge: build or remove?~~ **Decided 9 Nov 2026:** do not build it. Remove the switch | — | CB-15 | User | Inert switch (`WalletHistoryPanel.vue:25-31,51-57`) |
| D-15 | ~~Ship or hide budget alerts?~~ **Decided 9 Nov 2026:** budget alerts are needed. Build the sender; do not hide the setting | — | CB-23 | User | Never sent; 0 teams set one |
| D-16 | ~~Is a stopped server billed?~~ **Decided 9 Nov 2026:** a stopped server bills for its disk only. **Revisited the same day:** offer a snapshot and bill the snapshot instead of the disk (D-25, open) | — | CB-35 | User | Engine bills in full today; a per-GB Disk component rate exists (`resolve_component_rate("Disk")`, `subscriptions.py:686-700`) |
| D-17 | ~~Keep "Pause billing" separate from Stop?~~ **Decided 9 Nov 2026:** keep Pause billing as its own action | — | CB-34, CB-35 | User | — |
| D-18 | ~~Does a paused server bill its disk?~~ **Decided 9 Nov 2026:** no. Pause billing stops billing for everything on that server, disk included | — | CB-34 | User | Matches the Pause dialog's promise |
| D-19 | ~~Servers stopped by dunning: disk only?~~ **Decided 9 Nov 2026:** no. A server stopped by dunning bills nothing while it is suspended | — | CB-35 | User | Suspension uses the same stop path (`subscriptions.py:1189-1211`), so it needs its own rule |

| D-20 | ~~Who rates AI?~~ **Decided 9 Nov 2026:** Grove's USD price | — | CB-46 | User | Grove's invoice API returns cost per model and day |
| D-21 | ~~AI for INR teams?~~ **Decided 9 Nov 2026:** convert Grove's USD to INR at the exchange rate of the billing day. How the Overview shows INR during the month is D-26 | — | CB-46 | User | Central has no exchange-rate source today; only the ERPNext payment sync reads a conversion rate (`erpnext_sync.py:325`) |
| D-22 | ~~What is bundled?~~ **Decided 9 Nov 2026:** the bundle is the base offering of the plan: what each plan includes, per subscription, not pooled per team | — | CB-48, CB-49 | User | Matches Plan Includes |
| D-23 | ~~Storage unit?~~ **Decided 9 Nov 2026:** GB (10⁹ bytes) | — | CB-47 | User | Code computes GiB, labels GB |
| D-24 | ~~A day with no stored data?~~ **Decided 9 Nov 2026:** bill as S3 does: only what is stored; a day with an empty bucket bills nothing | — | CB-48 | User | S3 bills byte-hours; R2 averages each day's peak; neither has a minimum duration on its standard class |
| D-25 | When a customer stops a server, offer to snapshot it and release the disk, then bill the snapshot instead of the disk? | Disk only (D-16) / offer "snapshot and release disk" beside plain Stop / snapshot always | CB-35 | Product + infrastructure | Snapshot rate ₹6.50 / $0.08 per GB-month on used size; Disk rate ₹20 / $0.20 per GB-month on full size (production catalog). Restore creates a new server from the snapshot (`api/servers.py:769`) |
| D-26 | How does the Overview show AI usage to an INR team during the month, when the rate is set on the billing day (D-21)? | One rate per month, fixed on the billing day that opens it / today's rate, marked estimate / an INR price per model reviewed by finance | CB-46 | Product + finance | A rate that changes every day makes the Overview disagree with itself and with the invoice |
| D-27 | The storage reading job did not run for a day: bill nothing for it, or the last reading, marked estimated? | Nothing / last reading, estimated | CB-48 | Product | Separate from D-24, which covers an empty bucket |

Recommendations for each open decision: [decision-briefs.md](decision-briefs.md).
