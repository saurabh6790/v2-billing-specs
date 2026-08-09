# INR Payments — how collection works for Indian customers

> Decision record: [ADR 0005](docs/adr/0005-inr-collection-emandate-threshold-prepaid.md) (the threshold
> behaviour), revised by [ADR 0022](docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) (which
> gateway runs the mandate, and the mode names).
> Build: [#60](issues/60-inr-collection-mode-threshold-action-required.md).
> Cross-refs: [payments.md](payments.md) (gateway seam, charge flow), [credits.md](credits.md) (wallet waterfall), [dashboard.md](dashboard.md) (surfaces), [issues/14](issues/14-retry-dunning-suspension.md) (dunning).

## Why INR is special

Billing is **usage-based and variable** — the monthly bill is whatever the team
ran. In India, an **off-session (silent) recurring debit above ₹15,000 needs the
customer to re-authenticate (AFA/OTP) every cycle** — an RBI rule that holds on
every gateway, **Stripe India included**. So there is no way to silently
auto-charge a large, variable INR bill. International customers don't have this
problem (Stripe off-session charges any amount there), so this document is
INR-only.

The design choice (ADR 0005, "Approach B"): **auto-charge silently while the bill
is small; the moment it would cross ₹15,000, hand the customer a choice instead of
silently failing.** On-session payments have no ₹15k limit, so the choice is
between *paying each invoice yourself* and *prepaying a wallet* — both of which we
already support.

## Which gateway runs the rail

Under [ADR 0022](docs/adr/0022-stripe-primary-razorpay-carries-the-rest.md) the
customer picks the instrument up front (**UPI · Card · RuPay card · Netbanking**)
and the instrument picks the gateway: **Stripe** registers and debits the card
mandate, **Razorpay** carries UPI Autopay, RuPay and netbanking. None of that
changes what follows. The ceiling is regulatory, so it lands on whichever rail the
customer chose, and everything in this document is written against the mode rather
than the provider.

## The four collection modes

Every team carries a `collection_mode`. For INR teams it is one of:

| Mode | What happens each cycle | Customer effort |
|------|--------------------------|-----------------|
| `auto_charge` | The saved mandate (Stripe card, or Razorpay UPI Autopay / RuPay) debits the invoice **off-session**, after a pre-debit notification. **Only valid while the debit ≤ ₹15,000.** | None (a pre-debit SMS) |
| `manual_checkout` | Invoice opens; customer pays it **on-session** at a hosted checkout (OTP). Any amount. | Pay each invoice |
| `prepaid` | Customer funds a **wallet** via top-ups; usage draws down credits (credits-then-… waterfall). | Keep wallet funded |
| `action_required` | **Transient.** An `auto_charge` customer's bill crossed ₹15,000. Auto-charge is paused; the account keeps running; the customer must pick `manual_checkout` or `prepaid`. | Choose once |

International teams also sit in `auto_charge`; there the ceiling is the trust-tier
cap alone. The old `stripe_auto` / `emandate` pair named providers rather than
behaviours and has collapsed into `auto_charge` — see [payments.md](payments.md).

```
                 bill ≤ ₹15k every cycle
          ┌────────────────────────────────┐
          ▼                                 │
   ┌─────────────┐  forecast/invoice ≥ ₹15k │
   │ auto_charge │ ───────────────────────────► action_required
   └─────────────┘                                  │
          ▲                                customer chooses
          │ (re-register, optional)         ┌────────┴────────┐
          │                                 ▼                 ▼
          │                          manual_checkout       prepaid
          └─────────────────────────────────────────────────┘
                 (customer may switch modes anytime in settings)
```

## The ₹15,000 threshold

- **Threshold = ₹15,000 per debit**, read from `max_silent_charge` on the gateway's
  **`Payment Gateway Currency`** row (a float in major units, like all money; the adapter
  converts to paise or cents at the boundary). It is the RBI silent-debit ceiling for our
  merchant category, so every INR row carries it — Stripe India's as well as Razorpay's.
- **Tripped by the larger of**: (a) the invoice about to be charged, or (b) the
  **month-to-date forecast** (so we warn *before* the bill lands, not after a
  failed charge). Forecasting reuses the dashboard engine ([#18](issues/18-customer-dashboard-forecast.md)).
- **Hysteresis:** once a team is in `action_required` or has chosen a mode, a
  later small month does **not** silently drag them back to `auto_charge` —
  switching back is an explicit customer action. Avoids flapping for spiky usage.

## Case matrix — what the system handles

| # | Situation | System behaviour |
|---|-----------|------------------|
| 1 | `auto_charge`, invoice ≤ ₹15k | Pre-debit notify → off-session charge on the method's own gateway → webhook settles `Paid`. No customer action. |
| 2 | `auto_charge`, **forecast** crosses ₹15k mid-month (bill not yet due) | Flip to `action_required`; raise the **Action Required** banner + notification; **keep running**. Do not attempt a silent charge that would fail. |
| 3 | `auto_charge`, invoice at close ≥ ₹15k (no prior forecast warning) | Same as #2 at invoice time: invoice opens unpaid, `action_required`, banner; no silent charge attempted. |
| 4 | `action_required`, customer picks **manual checkout** | `collection_mode = manual_checkout`; open invoice(s) become payable at the on-session checkout of the method's gateway; banner clears. |
| 5 | `action_required`, customer picks **prepaid wallet** | `collection_mode = prepaid`; future usage draws the wallet; prompt to top up to cover the open balance; banner clears. |
| 5a | Card fails Stripe with a **terminal** decline while adding or charging it | Offer the Razorpay rail once, amount prefilled (`fallback_reason = stripe_decline`). Timeouts and abandoned 3DS are ambiguous and do **not** fall back; reconciliation resolves them. Off-session, there is no interactive fallback — dunning plus an "add another way to pay" notification. |
| 6 | `action_required`, customer ignores it | Account **keeps running** through the normal dunning window; open invoices escalate `Open → Overdue → suspend` per [#14](issues/14-retry-dunning-suspension.md). The banner persists. Suspension is the existing non-payment path, **not** a separate punishment for not choosing. |
| 7 | `manual_checkout`, invoice opens | Notify "invoice ready to pay"; invoice settles only when the on-session checkout succeeds (webhook-confirmed). Unpaid → dunning. |
| 8 | `prepaid`, wallet covers the bill | Credits waterfall settles it; no gateway round-trip. |
| 9 | `prepaid`, wallet under-funded | Partial credit applied; remainder `Open`; "top up ₹X" prompt; dunning on the shortfall (the press model: ask for the remaining amount). |
| 10 | New INR team, no method yet | Default `prepaid` (or chosen at onboarding). Money movement gated on a complete Billing Profile (existing setup gate). |
| 11 | Mandate registration fails / card expires | Fall back to `action_required` (same banner) so the customer re-registers or switches mode. |
| 12 | Trust-tier cap below ₹15k | Effective silent ceiling = `min(₹15,000, tier cap)`; crossing the **tier** cap also trips `action_required` (cap is the real spend ceiling). |
| 13 | Customer switches mode in settings | Allowed any time (`prepaid` ⇄ `manual_checkout`; re-register `auto_charge` if eligible). Idempotent; clears `action_required`. |
| 14 | Team holds a Stripe card **and** a Razorpay UPI mandate | Legal, and already modelled: methods are ordered by `priority` and each settles on its own `gateway`. Two rails settle one team; nothing routes per charge. |

## What we deliberately do NOT build

- **No off-session >₹15k AFA-link auto-charge.** No pending-authorization attempts,
  72h windows, or AFA webhook handling. Above ₹15k the customer is on-session
  (manual checkout) or prepaid — both already supported.
- **No Razorpay Subscriptions / Plans.** The usage→invoice engine stays the single
  source of truth (ADR 0005).
- **No standalone PayPal gateway.** PayPal is a one-time Razorpay checkout method.
- **No card-network detection.** We never read a BIN table or sniff a brand signal
  to decide that a card is RuPay. The customer's own choice of tile is the signal,
  and it is free and exact (ADR 0022).
- **No migration of live Razorpay card mandates to Stripe.** Re-registering means a
  fresh AFA, which is a churn event with nothing in it for the customer. Existing
  mandates run until they lapse; only new registrations follow the new routing.

## Where the customer sees it

The `action_required` state and open-balance prompts surface as:
- A persistent **"Action Required"** banner in the billing dashboard.
- An in-app **notification** ([#20](issues/20-notification-suite.md)) + email.
- A **choice flow** (manual checkout vs prepaid) — see the designer brief:
  [docs/design/inr-collection-action-required.md](docs/design/inr-collection-action-required.md).

Full UI/UX requirements live in that brief; this document is the behaviour spec.
