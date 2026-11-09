# Decision briefs

One recommendation for each open decision, with the evidence it rests on. A
recommendation is not a decision; nothing here is applied until you confirm it.

| ID | Question | Recommendation | Why | Unblocks |
|---|---|---|---|---|
| D-02 | ~~Who may change how a team pays?~~ | **Decided 9 Nov 2026:** owner or billing rights; wallet first, then the method | — | #148 |
| D-03 | ~~Support actions~~ | **Decided 9 Nov 2026:** see everything, read only | — | #149, #167 |
| D-04 | ~~Setup expiry~~ | **Decided 9 Nov 2026:** 24 hours, notify the customer | — | #146 |
| D-05 | Escalating lockout on failed setups (your direction) | Free attempts 1–5. After failure 5: wait 10 min; 6: 10 min; 7: 30 min; 8: 2 h; 9: 6 h; 10 and every one after: 24 h. Count per team (and per signed-in user), not per card. Count only bank declines and failed verification, not a customer closing the bank page (those expire under D-04). Reset the count on a successful setup, or after 7 days with no failure. Show the wait: "Too many failed attempts. Try again in 28 minutes." At the 10th failure, alert billing operators; an operator (not support, D-03) can clear the lock. Enforce on the server, and apply the same count to wallet top-ups | The bank blocks one card after a few declines, but card testers use many cards, so only a per-team count stops them. Not counting abandoned bank pages keeps a real customer struggling with 3-D Secure from being locked out. Your list skipped the 6th failure; 10 min is assumed | #146 |
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
| D-25 | Stop: bill the disk, or snapshot and bill the snapshot? | Two choices in the Stop dialog. **Stop** keeps the disk and bills disk only (D-16), for short stops. **Snapshot and release** takes a snapshot, deletes the server and its disk, and bills the snapshot. Suggest it after 7 days stopped | Not blocked by code: snapshots, their price and restore exist. It waits on your choice because restore is not a restart: it creates a **new** server (`api/servers.py:769`) with a new public IP (Central has no reserved IP) and takes longer than a start. A customer whose DNS points at the old IP must change it. Billing the snapshot while keeping the disk avoids that, but Frappe then pays for the disk with no revenue | #176 |
| D-26 | ~~Overview for INR teams using AI~~ | **Decided 9 Nov 2026:** one rate per month, set on the billing day, no margin for now | — | #186 |
| D-27 | ~~Missed storage reading~~ | **Decided 9 Nov 2026:** last reading, marked estimated | — | #187 |
| H-05 | (check, not a decision) Are operator alerts configured in production? | Check Billing Settings on production | The backup shows empty Raven fields, but the row was changed by a local migrate | #182 |
