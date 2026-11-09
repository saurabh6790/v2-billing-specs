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
| D-18 | Does a paused server bill disk? | Yes, disk only, same as Stop | Disk is held either way; keeps one rule. Pause then differs from Stop only in intent (billing-led vs server-led) and the dialog must say "you pay only for disk" | #175 |
| D-19 | Servers stopped by dunning: disk only? | Disk only | Same rule as D-16; the data is kept, so the disk is still used | #176 |
| D-20 | Who rates AI? | Grove's USD price | Grove already prices and audits every request against the gateway; Central rating needs a Grove API change | #186 |
| D-21 | AI in INR? | Convert at the invoice date's rate, rate shown on the line | AI revenue is small (1 external team); an INR price book can follow | #186 |
| D-22 | Bundles: per subscription or pooled? | Per subscription; transfer reworded as fair use until metered | Matches how Plan Includes works today | #187, #189 |
| D-23 | Storage unit | GB (10⁹) | The unit the customer reads; S3 tools report bytes | #188 |
| D-24 | Missed storage day | Previous day's size, marked estimated | Nearest to what was held; visible as an estimate | #187 |
| H-05 | (check, not a decision) Are operator alerts configured in production? | Check Billing Settings on production | The backup shows empty Raven fields, but the row was changed by a local migrate | #182 |
