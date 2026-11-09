# Decision briefs

One recommendation for each open decision, with the evidence it rests on. A
recommendation is not a decision; nothing here is applied until you confirm it.

| ID | Question | Recommendation | Why | Unblocks |
|---|---|---|---|---|
| D-02 | ~~Who may change how a team pays?~~ | **Decided 9 Nov 2026:** owner or billing rights; wallet first, then the method | — | #148 |
| D-03 | ~~Support actions~~ | **Decided 9 Nov 2026:** see everything, read only | — | #149, #167 |
| D-04 | ~~Setup expiry~~ | **Decided 9 Nov 2026:** 24 hours, notify the customer; closing the bank's window never blocks a retry | — | #146 |
| D-05 | ~~Failed setups~~ | **Decided 9 Nov 2026:** escalating lockout (schedule in product-decisions-required.md) | — | #146 |
| D-07 | ~~Tiny invoices~~ | **Decided 9 Nov 2026:** below the gateway minimum, waive and book as loss | — | #158 |
| D-08 | ~~Profile completion~~ | **Decided 9 Nov 2026:** by design; measure conversion at the end of the trial | — | — |
| D-10 | ~~Amount column~~ | **Decided 9 Nov 2026:** invoice total | — | #159 |
| D-11 | ~~Last method removal~~ | **Decided 9 Nov 2026:** replace-only | — | #168 |
| D-18 | ~~Does a paused server bill disk?~~ | **Decided 9 Nov 2026:** no, Pause stops billing for everything | — | #175 |
| D-19 | ~~Servers stopped by dunning?~~ | **Decided 9 Nov 2026:** no, they bill nothing while suspended | — | #176 |
| D-20 | ~~Who rates AI?~~ | **Decided 9 Nov 2026:** Grove's USD price | — | #186 |
| D-21 | ~~AI in INR?~~ | **Decided 9 Nov 2026:** convert at the billing day's rate; display is D-26 | — | #186 |
| D-22 | ~~Bundles?~~ | **Decided 9 Nov 2026:** the plan's base offering, per subscription | — | #187, #189 |
| D-23 | ~~Storage unit~~ | **Decided 9 Nov 2026:** GB | — | #188 |
| D-24 | ~~Storage day with nothing stored~~ | **Decided 9 Nov 2026:** bill as S3: an empty bucket bills nothing | — | #187 |
| D-25 | ~~Stop: disk or snapshot~~ | **Decided 9 Nov 2026, provisional:** two choices in the Stop dialog, Stop (disk) and Snapshot and release (snapshot) | — | #176 |
| D-26 | ~~Overview for INR teams using AI~~ | **Decided 9 Nov 2026:** one rate per month, set on the billing day, no margin for now | — | #186 |
| D-27 | ~~Missed storage reading~~ | **Decided 9 Nov 2026:** last reading, marked estimated | — | #187 |
| H-05 | (check, not a decision) Are operator alerts configured in production? | Check Billing Settings on production | The backup shows empty Raven fields, but the row was changed by a local migrate | #182 |
