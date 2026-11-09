# Prioritized backlog (D1–D7)

The 37 issues in `billing-specs/issues/` (146–182, milestone TD) ranked. Decisions
of 9 Nov 2026 are applied: Prepaid = wallet first, the method for the shortfall,
kept separate from Auto Charge; limit on base cost before tax, "taxes are added on
top"; no auto-recharge; budget alerts are built; invoices held for accounting sync
are expected (CB-22, no issue). Nothing here is
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
| 2 | #147 | CB-25 one limit figure | 3 | 2 | 2 | 2 | 3 (61 of 64 on $100/₹8,300) | 1 (M) | 13 | **P1** | Refusals at purchase for nearly every team; D-13 decided (pre-tax) |
| 3 | #148 | CB-03 how you pay | 3 | 1 | 2 | 2 | 3 (64 teams, reach) | 1 (M) | 12 | **P1** | Customers cannot see their mode; D-12 decided, needs D-02 |
| 4 | #149 | CB-18 team billing view | 1 | 1 | 3 | 1 | 3 (every ticket) | 1 (M) | 10 | **P1** | Makes #146 cases visible to support |
| 5 | #151 | CB-27 setup banner flash | 2 | 0 | 1 | 0 | 3 (every Overview load) | 3 (XS) | 9 | P2 | Quick win |
| 6 | #152 | CB-06 list error state | 2 | 1 | 1 | 1 | 1 | 3 (XS) | 9 | P2 | Quick win |
| 7 | #153 | CB-08 banner deep link | 2 | 1 | 0 | 0 | 1 | 3 (XS) | 7 | P2 | Quick win |
| 8 | #154 | CB-12 country auto-save | 1 | 0 | 1 | 2 | 2 (43 rows fit) | 3 (XS) | 9 | P2 | Quick win |
| 9 | #155 | CB-11 card-check copy | 2 | 0 | 1 | 1 | 2 (every new card) | 3 (XS) | 9 | P2 | Quick win |
| 10 | #157 | CB-28 label truncation | 2 | 0 | 0 | 0 | 3 (seen at 1440 px) | 3 (XS) | 8 | P2 | Quick win |
| 11 | #150 | CB-04 Prepaid copy | 2 | 1 | 1 | 2 | 2 (INR Action Required) | 2 (S) | 10 | P2 | Ships with or before #148 |
| 12 | #156 | CB-23 budget alert never sent | 2 | 1 | 0 | 1 | 0 (0 set) | 2 (S) | 6 | P2 | Build the sender (D-15 decided) |
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

### Checkpoint 3 (D5–D7)

| Rank | Issue | Problem | Cust. | Fin. | Ops | Risk | Freq. | Effort | Score | Priority | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | #175 | CB-34 pause keeps charging | 3 | 3 | 1 | 3 | 1 (1 pause, billed after it) | 1 (M) | 12 | **P1** | Wrong charge against a written promise; shown on real data |
| 2 | #178 | CB-39 credit gate mismatch | 2 | 1 | 1 | 1 | 1 (2 teams) | 2 (S) | 8 | P2 | Refusal after the form at first purchase |
| 3 | #179 | CB-40 record refusals | 1 | 1 | 2 | 1 | 3 (every refusal) | 2 (S) | 10 | P2 | Needed to measure #147 |
| 4 | #177 | CB-38 purchase price basis | 2 | 1 | 1 | 1 | 3 (every create) | 2 (S) | 10 | P2 | First invoice above the quoted price for INR |
| 5 | #181 | CB-41 Desk home | 0 | 0 | 2 | 1 | 3 (every visit) | 2 (S) | 8 | P2 | With #149 |
| 6 | #182 | CB-42 alerts list | 0 | 1 | 2 | 2 | 1 | 2 (S) | 8 | P2 | Confirm H-05 first |
| 7 | #176 | CB-35 stopped = disk only | 2 | 2 | 1 | 1 | 0 (no external case) | 1 (M) | 7 | P2 | D-16, D-17 decided; after #175 |
| 8 | #180 | CB-36 project limit | 1 | 0 | 0 | 1 | 0 (no limits set) | 2 (S) | 4 | P3 | — |

### Open-points pass

| Rank | Issue | Problem | Cust. | Fin. | Ops | Risk | Freq. | Effort | Score | Priority | Why |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | #183 | CB-44 revenue counts waived | 0 | 3 | 2 | 3 | 3 (80 % of the base) | 2 (S) | 13 | **P1** | MRR overstated about 5× |
| 2 | #185 | CB-45 credit expiry notice | 2 | 1 | 1 | 1 | 2 (32 grants) | 2 (S) | 9 | P2 | Wallet-first rule makes expiry a card charge |
| 3 | #184 | CB-43 phone invoice list | 2 | 0 | 0 | 0 | 2 | 2 (S) | 6 | P2 | — |

## Buckets

| Bucket | Issues |
|---|---|
| **Must fix first** | #183, #175, #146, #147, #148 (with #150), #149 |
| **High-value** | #156, #158, #160, #159, #163, #167, #177, #178, #179, #181, #182 |
| **Quick wins** | #151, #152, #153, #154, #155, #157, #170, #172 — see [quick-wins.md](quick-wins.md) |
| **Strategic** | collection model (#148, #150, #171), limit model (#147, #162), support console (#149, #167, with #125), error model (#163), payment outcome loop (#146, #165, #164) — see [strategic-improvements.md](strategic-improvements.md) |
| **Before charging starts** | #159, #164, #165, #166, #168: no measured frequency yet, but every team reaches them once invoices are issued |
| **Nice-to-have** | #173, #174, #169 (raise #169 if an accessibility commitment exists) |

## Measure before building

| Issue | Measure first | How (read-only) |
|---|---|---|
| #146 | Abandon vs decline vs lost confirmation, per pending row | Gateway dashboards per setup reference; webhook history |
| #147 | How often server creation is refused for the limit | Not recorded anywhere (CB-40); ship #179 first, then count for two weeks |
| #149 | Billing ticket volume and handling time | Helpdesk tags |
| #148 | Why 4 Prepaid teams still hold active methods | Payment Method activation path vs `start_auto_charge` |
| #182 | Whether production alerts reach anyone (H-05) | Billing Settings on production; Raven channel history |
| #176 | Whether customers stop servers expecting the bill to stop | Support tickets mentioning stopped servers and invoices |
