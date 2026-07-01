# INR Payments — how collection works for Indian customers

> Decision record: [ADR 0005](docs/adr/0005-inr-collection-emandate-threshold-prepaid.md).
> Build: [#60](issues/60-inr-collection-mode-threshold-action-required.md).
> Cross-refs: [payments.md](payments.md) (gateway seam, charge flow), [credits.md](credits.md) (wallet waterfall), [dashboard.md](dashboard.md) (surfaces), [issues/14](issues/14-retry-dunning-suspension.md) (dunning).

## Why INR is special

Billing is **usage-based and variable** — the monthly bill is whatever the team
ran. In India, an **off-session (silent) recurring debit above ₹15,000 needs the
customer to re-authenticate (AFA/OTP) every cycle** — an RBI rule that holds on
every gateway. So there is no way to silently auto-charge a large, variable INR
bill. International customers don't have this problem (Stripe off-session charges
any amount), so this document is INR-only.

The design choice (ADR 0005, "Approach B"): **auto-charge silently while the bill
is small; the moment it would cross ₹15,000, hand the customer a choice instead of
silently failing.** On-session payments have no ₹15k limit, so the choice is
between *paying each invoice yourself* and *prepaying a wallet* — both of which we
already support.

## The four collection modes

Every team carries a `collection_mode`. For INR teams it is one of:

| Mode | What happens each cycle | Customer effort |
|------|--------------------------|-----------------|
| `emandate` | Razorpay card/UPI e-mandate auto-charges the invoice **off-session**, after a pre-debit notification. **Only valid while the debit ≤ ₹15,000.** | None (a pre-debit SMS) |
| `manual_checkout` | Invoice opens; customer pays it **on-session** via Razorpay checkout (OTP). Any amount. | Pay each invoice |
| `prepaid` | Customer funds a **wallet** via Razorpay top-ups; usage draws down credits (credits-then-… waterfall). | Keep wallet funded |
| `action_required` | **Transient.** An `emandate` customer's bill crossed ₹15,000. Auto-charge is paused; the account keeps running; the customer must pick `manual_checkout` or `prepaid`. | Choose once |

(International teams use `stripe_auto` — out of scope here; see [payments.md](payments.md).)

```
                 bill ≤ ₹15k every cycle
          ┌────────────────────────────────┐
          ▼                                 │
   ┌────────────┐   forecast/invoice ≥ ₹15k │
   │  emandate  │ ───────────────────────────► action_required
   └────────────┘                                   │
          ▲                                customer chooses
          │ (re-register, optional)         ┌────────┴────────┐
          │                                 ▼                 ▼
          │                          manual_checkout       prepaid
          └─────────────────────────────────────────────────┘
                 (customer may switch modes anytime in settings)
```

## The ₹15,000 threshold

- **Threshold = ₹15,000 per debit** (`INR_EMANDATE_SILENT_MAX = 15000`, a float in major
  units, like all money; the Razorpay call converts to paise at the boundary). It is the RBI
  silent-debit ceiling for our merchant category.
- **Tripped by the larger of**: (a) the invoice about to be charged, or (b) the
  **month-to-date forecast** (so we warn *before* the bill lands, not after a
  failed charge). Forecasting reuses the dashboard engine ([#18](issues/18-customer-dashboard-forecast.md)).
- **Hysteresis:** once a team is in `action_required` or has chosen a mode, a
  later small month does **not** silently drag them back to `emandate` — switching
  back is an explicit customer action. Avoids flapping for spiky usage.

## Case matrix — what the system handles

| # | Situation | System behaviour |
|---|-----------|------------------|
| 1 | `emandate`, invoice ≤ ₹15k | Pre-debit notify → off-session charge → webhook settles `Paid`. No customer action. |
| 2 | `emandate`, **forecast** crosses ₹15k mid-month (bill not yet due) | Flip to `action_required`; raise the **Action Required** banner + notification; **keep running**. Do not attempt a silent charge that would fail. |
| 3 | `emandate`, invoice at close ≥ ₹15k (no prior forecast warning) | Same as #2 at invoice time: invoice opens unpaid, `action_required`, banner; no silent charge attempted. |
| 4 | `action_required`, customer picks **manual checkout** | `collection_mode = manual_checkout`; open invoice(s) become payable via on-session Razorpay checkout; banner clears. |
| 5 | `action_required`, customer picks **prepaid wallet** | `collection_mode = prepaid`; future usage draws the wallet; prompt to top up to cover the open balance; banner clears. |
| 6 | `action_required`, customer ignores it | Account **keeps running** through the normal dunning window; open invoices escalate `Open → Overdue → suspend` per [#14](issues/14-retry-dunning-suspension.md). The banner persists. Suspension is the existing non-payment path, **not** a separate punishment for not choosing. |
| 7 | `manual_checkout`, invoice opens | Notify "invoice ready to pay"; invoice settles only when the on-session checkout succeeds (webhook-confirmed). Unpaid → dunning. |
| 8 | `prepaid`, wallet covers the bill | Credits waterfall settles it; no gateway round-trip. |
| 9 | `prepaid`, wallet under-funded | Partial credit applied; remainder `Open`; "top up ₹X" prompt; dunning on the shortfall (the press model: ask for the remaining amount). |
| 10 | New INR team, no method yet | Default `prepaid` (or chosen at onboarding). Money movement gated on a complete Billing Profile (existing setup gate). |
| 11 | `emandate` registration fails / card expires | Fall back to `action_required` (same banner) so the customer re-registers or switches mode. |
| 12 | Trust-tier cap below ₹15k | Effective silent ceiling = `min(₹15,000, tier cap)`; crossing the **tier** cap also trips `action_required` (cap is the real spend ceiling). |
| 13 | Customer switches mode in settings | Allowed any time (`prepaid` ⇄ `manual_checkout`; re-register `emandate` if eligible). Idempotent; clears `action_required`. |

## What we deliberately do NOT build

- **No off-session >₹15k AFA-link auto-charge.** No pending-authorization attempts,
  72h windows, or AFA webhook handling. Above ₹15k the customer is on-session
  (manual checkout) or prepaid — both already supported.
- **No Razorpay Subscriptions / Plans.** The usage→invoice engine stays the single
  source of truth (ADR 0005).
- **No standalone PayPal gateway.** PayPal is a one-time Razorpay checkout method.

## Where the customer sees it

The `action_required` state and open-balance prompts surface as:
- A persistent **"Action Required"** banner in the billing dashboard.
- An in-app **notification** ([#20](issues/20-notification-suite.md)) + email.
- A **choice flow** (manual checkout vs prepaid) — see the designer brief:
  [docs/design/inr-collection-action-required.md](docs/design/inr-collection-action-required.md).

Full UI/UX requirements live in that brief; this document is the behaviour spec.
