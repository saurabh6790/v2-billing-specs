# Risk register

Risks that follow from the findings, scored for planning. Likelihood and impact are
1 (low) to 3 (high); score = likelihood × impact. Snapshot `a95b491e`.

| ID | Risk | Findings | Likelihood | Impact | Score | Owner (suggested) | Mitigation |
|---|---|---|---|---|---|---|---|
| RK-01 | Customer suspended after removing their only card or misreading Prepaid | F-02, F-23, F-05 | 2 | 3 | 6 | Billing product | Warn on removal; fix Prepaid meaning; mode control |
| RK-02 | Paid invoices without tax invoices after an ERPNext outage, cleared only by engineers | F-25, IR-02 | 2 | 3 | 6 | Billing eng | Long-tail retry, button, bulk action |
| RK-03 | INR billing run stalls during a Razorpay incident | F-24 | 1 | 3 | 3 | Billing eng | Timeout |
| RK-04 | Customers refused servers while the screen shows room; support load | F-01 | 3 | 2 | 6 | Billing product | One limit figure |
| RK-05 | Customer believes billing is paused when it is not | F-03 | 2 | 2 | 4 | Console eng | Check `.error`; lint |
| RK-06 | Paise drift between Central and ERPNext found at audit | F-26 | 2 | 2 | 4 | Finance + eng | Send tax rows; cross-check |
| RK-07 | A catalog gap delays a team's whole invoice | F-27 | 1 | 2 | 2 | Catalog ops | Bill priced lines |
| RK-08 | Late usage never billed | F-28 | 2 | 2 | 4 | Metering | Define policy |
| RK-09 | Large manual credit with no second person | F-29 | 1 | 3 | 3 | Finance | Finance role, threshold approval |
| RK-10 | A future generic read leaks another team's billing rows | F-30 | 1 | 3 | 3 | Security | Permission hooks |
| RK-11 | Trust loss from copy that contradicts what happens (charge, restart, settings page) | F-04, F-22, F-05 | 3 | 1 | 3 | Billing product | Copy fixes |
| RK-12 | Support cannot trace "charged but unpaid" quickly | F-32, F-12 | 2 | 2 | 4 | Billing eng | Correlation view, error reference, Desk actions |
| RK-13 | Team standing shown wrong to the customer | F-21 | 2 | 2 | 4 | Billing eng | Standing on profile |
| RK-14 | USD customers put off by INR-sized top-up amounts | F-07 | 3 | 1 | 3 | Console eng | Per-currency presets |

Highest scores (6): RK-01, RK-02, RK-04.
