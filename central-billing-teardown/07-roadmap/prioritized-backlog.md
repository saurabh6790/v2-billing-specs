# Prioritized backlog (D1, D2)

The 22 issue drafts ranked. Scope: D1 and D2 only; later domains will be merged
in. Nothing here is approved.

## How priority was set

Each draft is scored 0–3 on six factors. Frequency comes from the production
backup where it could be measured (E4); otherwise it is the number of teams the
code path will reach, marked *reach*.

| Factor | 0 | 3 |
|---|---|---|
| Customer impact | Cosmetic | Blocks a money task or misleads about money |
| Financial impact | None | Cash not collected, or a wrong charge |
| Operational impact | None | Needs engineering for each case |
| Risk reduction | None | Removes a wrong-charge or stuck-state risk |
| Frequency | Not seen, small reach | Measured on many teams now |
| Effort (inverted) | L | XS |

Priority: **P1** = must fix first (blocks money tasks now, or a wrong charge is
possible). **P2** = high value. **P3** = polish.

## Ranking

| Rank | Draft | Problem | Cust. | Fin. | Ops | Risk | Freq. | Effort | Score | Priority | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 02 | CB-22 held invoices | 3 | 3 | 3 | 2 | 3 (2/2 owed invoices) | 2 (S) | 16 | **P1** | No customer could pay; confirm in live production first |
| 2 | 01 | CB-21 unfinished setups | 3 | 2 | 2 | 2 | 3 (10 teams) | 1 (M) | 13 | **P1** | Largest measured drop-off; blocks credit and servers |
| 3 | 04 | CB-04 Prepaid meaning | 3 | 3 | 1 | 3 | 2 (4 teams exposed) | 2 (S) | 14 | **P1** | Wrong-charge risk; needs D-01 |
| 4 | 03 | CB-03 how you pay | 3 | 2 | 2 | 2 | 3 (64 teams, reach) | 1 (M) | 13 | **P1** | Every team affected; ships with 04 |
| 5 | 05 | CB-18 team view | 1 | 1 | 3 | 1 | 3 (every ticket, reach) | 1 (M) | 10 | **P1** | Makes 01 and 02 visible to support |
| 6 | 08 | CB-06 list error | 2 | 1 | 1 | 1 | 1 | 3 (XS) | 9 | P2 | Quick win |
| 7 | 10 | CB-08 deep link | 2 | 1 | 0 | 0 | 1 | 3 (XS) | 7 | P2 | Quick win on the pay path |
| 8 | 14 | CB-12 country auto-save | 1 | 0 | 1 | 2 | 2 (43 rows fit) | 3 (XS) | 9 | P2 | Quick win; stops silent writes |
| 9 | 13 | CB-11 card check copy | 2 | 0 | 1 | 1 | 2 (every new card, reach) | 3 (XS) | 9 | P2 | Quick win |
| 10 | 06 | CB-01 receipt | 3 | 1 | 1 | 1 | 0 (0 invoices now) | 2 (S) | 8 | P2 | Fix before credit draws and TDS start |
| 11 | 18 | CB-20 error mapping | 2 | 0 | 2 | 1 | 1 | 1 (M) | 7 | P2 | Strategic; prevents tickets |
| 12 | 15 | CB-16 filter + statement | 2 | 0 | 1 | 0 | 3 (4/6 invoices) | 2 (S) | 8 | P2 | Measured; mostly copy and config |
| 13 | 11 | CB-09 name the method | 2 | 1 | 0 | 1 | 0 | 2 (S) | 6 | P2 | Before Auto Charge teams exist |
| 14 | 09 | CB-07 live status | 2 | 0 | 1 | 0 | 0 | 2 (S) | 5 | P2 | Before first payments |
| 15 | 12 | CB-10 Manual Checkout gateway | 2 | 2 | 1 | 1 | 0 | 2 (S) | 8 | P2 | No Manual Checkout teams yet |
| 16 | 17 | CB-19 operator actions | 1 | 2 | 3 | 1 | 1 | 1 (M) | 9 | P2 | After 05 and D-03 |
| 17 | 07 | CB-02 last method | 2 | 2 | 1 | 2 | 0 (no Auto Charge) | 2 (S) | 9 | P2 | Exposure 0 today |
| 18 | 16 | CB-17 accessibility | 2 | 0 | 0 | 1 | 1 | 2 (S) | 6 | P2 | Needs D-09 to verify |
| 19 | 19 | CB-05 primary controls | 1 | 0 | 0 | 0 | 1 | 3 (XS) | 5 | P3 | With 03 |
| 20 | 20 | CB-13 form polish | 1 | 0 | 0 | 0 | 1 | 3 (XS) | 5 | P3 | — |
| 21 | 21 | CB-14 glossary | 1 | 0 | 0 | 0 | 2 | 2 (S) | 5 | P3 | — |
| 22 | 22 | CB-15 dead Email button | 1 | 0 | 0 | 0 | 2 | 3 (XS) | 6 | P3 | Quick win |

Ranks 1–5 are P1 regardless of score: each blocks a money task now or allows a
wrong charge. Order within a priority follows dependencies (01 before 05, 04 with
03) and puts quick wins first, so it is not a strict sort by score.

## Buckets

| Bucket | Drafts |
|---|---|
| **Must fix immediately** | 02 (after confirming), 04 (after D-01), 01 |
| **High-value** | 03, 05, 06, 18, 17 |
| **Quick wins** | 08, 10, 14, 13, 22, 15 — see [quick-wins.md](quick-wins.md) |
| **Strategic** | 03 + 04 collection model, 05 + 17 support console, 18 error model, 09 live status — see [strategic-improvements.md](strategic-improvements.md) |
| **Nice-to-have** | 19, 20, 21, 16 (raise to P1 if an accessibility commitment exists) |

## Measure before building

| Draft | Measure first | How (read-only) |
|---|---|---|
| 02 | Are invoices still held in live production; why is sync Pending | Invoice `hold_reason`, `erpnext_sync_status` today; ERPNext connection settings |
| 01 | Abandon vs decline vs lost confirmation, per pending row | Gateway dashboards per setup reference; webhook history |
| 04 | Credit runway of the 4 exposed teams | Wallet balance vs forecast per team |
| 05 | Billing ticket volume and handling time | Helpdesk tags |
