# Prioritized backlog (D1–D4)

The 29 issues in `billing-specs/issues/` (146–174, milestone TD) ranked. Decisions
of 9 Nov 2026 are applied: Prepaid = credits first, then the saved method; invoices
held for accounting sync are expected (CB-22, no issue). Nothing here is
scheduled or assigned.

## How priority was set

Each issue is scored 0–3 on six factors. Frequency comes from the production
backup where it could be measured (E4); otherwise it is the reach of the code path.

| Factor | 0 | 3 |
|---|---|---|
| Customer impact | Cosmetic | Blocks a money task or misleads about money |
| Financial impact | None | Cash not collected, or a wrong charge |
| Operational impact | None | Needs engineering for each case |
| Risk reduction | None | Removes a wrong-charge or stuck-state risk |
| Frequency | Not seen, small reach | Measured on many teams now |
| Effort (inverted) | L | XS |

**P1** = must fix first (blocks money tasks now or will for most teams). **P2** =
high value. **P3** = polish. Order within a priority follows dependencies and puts
quick wins first, so it is not a strict sort by score.

## Ranking

| Rank | Issue | Problem | Cust. | Fin. | Ops | Risk | Freq. | Effort | Score | Priority | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | #146 | CB-21 unfinished setups and top-ups | 3 | 2 | 2 | 2 | 3 (10 teams stuck) | 1 (M) | 13 | **P1** | Largest measured drop-off; blocks credit and servers; builds on #125 |
| 2 | #147 | CB-25 one limit figure | 3 | 2 | 2 | 2 | 3 (61 of 64 on $100/₹8,300) | 1 (M) | 13 | **P1** | Refusals at purchase for nearly every team; needs D-13 |
| 3 | #148 | CB-03 how you pay | 3 | 1 | 2 | 2 | 3 (64 teams, reach) | 1 (M) | 12 | **P1** | Customers cannot see their mode; needs D-02, D-12 |
| 4 | #149 | CB-18 team billing view | 1 | 1 | 3 | 1 | 3 (every ticket) | 1 (M) | 10 | **P1** | Makes #146 cases visible to support |
| 5 | #151 | CB-27 setup banner flash | 2 | 0 | 1 | 0 | 3 (every Overview load) | 3 (XS) | 9 | P2 | Quick win |
| 6 | #152 | CB-06 list error state | 2 | 1 | 1 | 1 | 1 | 3 (XS) | 9 | P2 | Quick win |
| 7 | #153 | CB-08 banner deep link | 2 | 1 | 0 | 0 | 1 | 3 (XS) | 7 | P2 | Quick win |
| 8 | #154 | CB-12 country auto-save | 1 | 0 | 1 | 2 | 2 (43 rows fit) | 3 (XS) | 9 | P2 | Quick win |
| 9 | #155 | CB-11 card-check copy | 2 | 0 | 1 | 1 | 2 (every new card) | 3 (XS) | 9 | P2 | Quick win |
| 10 | #157 | CB-28 label truncation | 2 | 0 | 0 | 0 | 3 (seen at 1440 px) | 3 (XS) | 8 | P2 | Quick win |
| 11 | #150 | CB-04 Prepaid copy | 2 | 1 | 1 | 2 | 2 (INR Action Required) | 2 (S) | 10 | P2 | Ships with or before #148 |
| 12 | #156 | CB-23 budget alert never sent | 2 | 1 | 0 | 1 | 0 (0 set) | 2 (S) | 6 | P2 | Hide or send (D-15) |
| 13 | #158 | CB-16 filter + statement | 2 | 0 | 1 | 0 | 3 (4 of 6 invoices) | 2 (S) | 8 | P2 | Measured |
| 14 | #160 | CB-29 wallet history | 2 | 0 | 1 | 1 | 2 (32 grants) | 2 (S) | 8 | P2 | Operator notes reach customers |
| 15 | #159 | CB-01 receipt | 3 | 1 | 1 | 1 | 0 (0 invoices now) | 2 (S) | 8 | P2 | Before credit draws and TDS start |
| 16 | #161 | CB-32 top-up presets and GST | 2 | 1 | 0 | 1 | 1 (12 USD teams) | 2 (S) | 7 | P2 | — |
| 17 | #162 | CB-26 one cost figure | 2 | 0 | 1 | 0 | 3 (every visit) | 1 (M) | 7 | P2 | After #147 |
| 18 | #163 | CB-20 error mapping | 2 | 0 | 2 | 1 | 1 | 1 (M) | 7 | P2 | Strategic |
| 19 | #164 | CB-09 name the method | 2 | 1 | 0 | 1 | 0 | 2 (S) | 6 | P2 | Before charging starts |
| 20 | #165 | CB-07 live status | 2 | 0 | 1 | 0 | 0 | 2 (S) | 5 | P2 | Before charging starts |
| 21 | #166 | CB-10 Manual Checkout gateway | 2 | 2 | 1 | 1 | 0 | 2 (S) | 8 | P2 | No Manual Checkout teams yet |
| 22 | #167 | CB-19 operator actions | 1 | 2 | 3 | 1 | 1 | 1 (M) | 9 | P2 | After #149, D-03 |
| 23 | #168 | CB-02 last method | 2 | 2 | 1 | 2 | 0 | 2 (S) | 9 | P2 | Exposure 0 today; D-11 |
| 24 | #169 | CB-17 accessibility | 2 | 0 | 0 | 1 | 1 | 2 (S) | 6 | P2 | Needs a screen-reader pass to verify |
| 25 | #170 | CB-15 dead controls | 1 | 0 | 0 | 0 | 3 (seen) | 3 (XS) | 7 | P3 | Quick win |
| 26 | #171 | CB-05 primary controls | 1 | 0 | 0 | 0 | 1 | 3 (XS) | 5 | P3 | With #148 |
| 27 | #172 | CB-24 duplicate label | 1 | 0 | 0 | 0 | 2 (seen) | 3 (XS) | 6 | P3 | Quick win |
| 28 | #173 | CB-13 form polish | 1 | 0 | 0 | 0 | 1 | 3 (XS) | 5 | P3 | — |
| 29 | #174 | CB-14 glossary | 1 | 0 | 0 | 0 | 3 (seen) | 2 (S) | 6 | P3 | — |

## Buckets

| Bucket | Issues |
|---|---|
| **Must fix first** | #146, #147, #148 (with #150), #149 |
| **High-value** | #156, #158, #160, #159, #163, #167 |
| **Quick wins** | #151, #152, #153, #154, #155, #157, #170, #172 — see [quick-wins.md](quick-wins.md) |
| **Strategic** | collection model (#148, #150, #171), limit model (#147, #162), support console (#149, #167, with #125), error model (#163), payment outcome loop (#146, #165, #164) — see [strategic-improvements.md](strategic-improvements.md) |
| **Before charging starts** | #159, #164, #165, #166, #168: no measured frequency yet, but every team reaches them once invoices are issued |
| **Nice-to-have** | #173, #174, #169 (raise #169 if an accessibility commitment exists) |

## Measure before building

| Issue | Measure first | How (read-only) |
|---|---|---|
| #146 | Abandon vs decline vs lost confirmation, per pending row | Gateway dashboards per setup reference; webhook history |
| #147 | How often server creation is refused for the limit | Error Log / request logs for the refusal message, per team |
| #149 | Billing ticket volume and handling time | Helpdesk tags |
| #148 | Why 4 Prepaid teams still hold active methods | Payment Method activation path vs `start_auto_charge` |
