# Open questions

What this pass could not settle from code alone. Each says who can answer it and
what evidence would settle it.

| # | Question | Why it matters | Who | Evidence that settles it |
|---|---|---|---|---|
| Q-01 | What should Prepaid mean: "credit first, card as fallback" (backend today) or "never charge my card" (console copy)? | F-23 | Product | ADR |
| Q-02 | How large is the Central vs ERPNext tax drift in practice? | F-26, R-01 | Finance | Sample of invoices next to their Sales Invoices |
| Q-03 | Has any team hit "unpriced metered usage" in a run? | F-27 | Billing eng | Error Log search for `Billing Run Failure` with that text |
| Q-04 | What happens to usage reported for a period after its invoice is drafted? | F-28 | Metering / product | Policy decision; Grove and Cargo reporting cadence |
| Q-05 | Should a customer be able to remove their last payment method while an invoice is owed? | F-02 | Product | Decision |
| Q-06 | Is the "limit" meant to cap run-rate, monthly spend, or both? | F-01 | Product | Decision; then one figure |
| Q-07 | Are below-minimum months meant to be forgiven rather than carried forward? | R-04 | Finance | Decision |
| Q-08 | How often do ERPNext syncs end Failed today, and how are they cleared? | F-25 | Ops | Count of `erpnext_sync_status = Failed` over 90 days |
| Q-09 | How often does a webhook exhaust its 5 tries? | F-25 | Ops | Count of Failed Webhook Events with `retry_count >= 5` |
| Q-10 | Do any customers hold Desk access? | F-30 | Security | User list with Desk access and a team |
| Q-11 | Is a second approval wanted for credits or refunds above a threshold? | F-29 | Finance | Policy |
| Q-12 | Should Manual Checkout be offered to USD teams and teams under the INR threshold? | F-05, F-10 | Product | Decision |
| Q-13 | Is the monthly draft started automatically if the 1st tick is missed? | AP-06 | Billing eng | A test that skips the tick, or production Billing Run history |
| Q-14 | Is credit expiry duplicate-safe if the daily job runs twice? | job inventory | Billing eng | Trace `run_credit_expiry` booking keys |
| Q-15 | How do customers actually move around the Overview? | F-08 | Product | Session recordings or click analytics; a browser review of this teardown's UX findings |

## Coverage limits

- No browser session: layout, phone width, focus order and screen-reader output were
  not checked.
- No production or staging data: frequencies are estimates from code paths.
- The 41 reports and the Billing Simulator page were listed, not reviewed.
- Security was reviewed for structure only; the 23 Oct 2026 audit and issues
  128–145 cover payment security in depth.
