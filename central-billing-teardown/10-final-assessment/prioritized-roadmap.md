# Prioritized roadmap

Ordered by customer harm first, then operator time, then polish. Each step is small
enough for one branch. Sizes: S under a day, M days, L a week or more.

## Step 1: stop misleading customers about money (1 week)

| # | Change | Findings | Size |
|---|---|---|---|
| 1 | Check `.error` after every `submit()` in `usePayingFor` and `useProjects`; add a lint rule for the pattern | F-03 | S |
| 2 | Warn before removing the last chargeable method; offer "Add a new card first" | F-02 | S |
| 3 | Decide what Prepaid means (ADR), then align the Action Required copy, Payments card and backend | F-23 | S / M |
| 4 | Card check copy shown before submit; trial banner leads | F-04 | S |
| 5 | "Servers start again automatically once paid" | F-22 | S |
| 6 | Outstanding banner opens the invoice it names | F-20 | S |
| 7 | Per-currency top-up presets | F-07 | S |
| 8 | Remove the Auto-recharge switch and Email invoice button | F-13 | S |

## Step 2: one truth on the Overview (2 weeks)

| # | Change | Findings | Size |
|---|---|---|---|
| 9 | Server returns `limit_used` from the gate's function; every card and the plan menu use it; tier text says run-rate | F-01 | M |
| 10 | Overview redesign: one headline (amount, charge date, method), one attention slot, Projects and Stop all moved out, one overview endpoint | F-08, F-11, F-18 | L |
| 11 | "How you pay" control on Payments; confirm before a card change flips the mode | F-05 | M |
| 12 | Allow choosing the first card while credit exists; wallet labelled "Used first" | F-06 | S |
| 13 | Return money figures from the API (top-up total, outstanding, coverage) | F-17 | M |

## Step 3: recover without engineers (2 weeks)

| # | Change | Findings | Size |
|---|---|---|---|
| 14 | Razorpay client timeout | F-24 | S |
| 15 | Long-tail retry for Failed webhooks and Failed ERPNext syncs; Desk "Reprocess" and "Retry accounting sync" with bulk action | F-25 | M |
| 16 | Invoice buttons: Reissue, Defer dunning, Charge now; Rerating page with preview; rollup correction button | F-12 | M |
| 17 | Alert owner and runbook per alert kind; restore-failure alert | AP-04, O-07 | S |

## Step 4: errors people can act on (1 week)

| # | Change | Findings | Size |
|---|---|---|---|
| 18 | Typed domain errors mapped to customer sentences in `api/dashboard`; catch `InvalidTransition` | F-09 | M |
| 19 | Guard rule: `_()` on every throw; banned internal words in customer paths | F-09 | S |
| 20 | Error reference in the customer error banner; correlation id across a payment | F-32 | M |

## Step 5: financial and data hygiene (2–3 weeks)

| # | Change | Findings | Size |
|---|---|---|---|
| 21 | Send Central's tax amounts to ERPNext; daily Central vs ERPNext total and advance check | F-26 | M |
| 22 | Bill priced lines when one meter is unpriced; hold and alert | F-27 | M |
| 23 | Late-usage policy, documented and enforced | F-28 | M |
| 24 | Team standing on Billing Profile; one reader | F-21 | M |
| 25 | Finance role, reason required in credit API, threshold approval | F-29 | M |
| 26 | Permission hooks on team-scoped billing DocTypes (issue 140) | F-30 | M |
| 27 | Remove Entitlement Token code; fix field types; delete `MeteredServicesCard` | F-31, F-14 | M |

## Step 6: polish

F-15, F-16, F-19, F-33, F-10 (latent; do it with the Manual Checkout work in step 2).

## Top 10 if only ten things ship

1. F-03 false success (S)
2. F-02 last-method warning (S)
3. F-23 Prepaid meaning (S/M)
4. F-24 Razorpay timeout (S)
5. F-25 retry exhaustion → Desk recovery (M)
6. F-01 one limit figure (M)
7. F-05 collection mode control (M)
8. F-09 customer error sentences (M)
9. F-08 Overview simplification (L)
10. F-12 operator Desk actions (M)
