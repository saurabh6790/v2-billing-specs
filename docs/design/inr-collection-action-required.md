# Design brief — INR collection & the "Action Required" moment

**Audience:** product design (UX/UI). **Status:** requirements for build/refactor.
**Behaviour spec:** [payments-inr.md](../../payments-inr.md) · **Decisions:** [ADR 0005](../adr/0005-inr-collection-emandate-threshold-prepaid.md) (the threshold), [ADR 0022](../adr/0022-stripe-primary-razorpay-carries-the-rest.md) (the instrument picker).

This brief describes *what the customer must be able to do and understand*. It
does not prescribe final visuals — that's your call. It does fix the states,
copy intent, and constraints the screens must cover.

---

## 1. The situation in plain language

Indian customers are billed for what they use, and the amount changes every month.
Indian banking rules let us **auto-charge a saved card/UPI only up to ₹15,000 per
month without the customer re-approving**. Below that line, billing is invisible.
The first month a customer's usage would push the bill **over ₹15,000**, we can no
longer charge silently — so we ask them, once, how they'd like to keep paying:

- **Pay each invoice themselves** (a quick checkout with OTP, any amount), or
- **Prepay a wallet** (add credits; usage spends them down — like a balance).

Until they choose, **nothing is shut off.** Their VMs keep running. We just show a
clear, calm "Action Required" prompt. This is an *invitation to decide*, not an
error or a punishment.

> Design north star: a growing customer hitting ₹15k should feel like they've
> *graduated to a bigger plan*, not like something broke.

---

## 2. The four states a customer can be in

The UI must represent each clearly (a small status indicator in the billing area):

| State | Plain meaning | Tone |
|-------|---------------|------|
| **Auto-pay** (`auto_charge`) | "We charge your card/UPI automatically." | Calm / invisible |
| **Action required** | "Your bill is growing — choose how to keep paying." | Attention, not alarm |
| **Pay per invoice** | "You pay each bill yourself." | Neutral |
| **Prepaid wallet** | "You pay from your credit balance." | Neutral, shows balance |

---

## 3. Screens & surfaces to design

### 3.0 Adding a payment method — the instrument picker

The first screen in the story, and the one that decides everything after it. An
Indian customer sees four tiles: **UPI · Card · RuPay card · Netbanking**. That is
what an Indian checkout looks like, and it is also how we learn which rail to
register the method on, since we never inspect the card number.

Requirements:
- **"RuPay card" is spelled out**, never softened to "Other cards". A customer
  holding an unusual Visa would read "Other" as *their* card and land on a rail
  that cannot take it.
- **Netbanking is one-time only** and must read that way, so nobody expects it to
  auto-pay next month.
- **UPI can be either** a one-time payment or a saved mandate; the tile should not
  force the customer to know which one they are setting up before they tap it.
- **Never name the gateway.** The customer chose an instrument, not a provider,
  and the provider may differ between two of these tiles.
- Non-INR customers see a card form, no picker.
- **If a card fails**, offer the alternative rail once, with the amount already
  filled in. Never an empty second card form, and never a retry loop that looks
  like the first attempt did not happen.

### 3.1 The "Action Required" banner (the centrepiece)

Persistent banner in the billing dashboard (and ideally a slim global hint
elsewhere in the console) whenever the customer is in **action_required**.

Requirements:
- **One clear primary action** — "Choose how to pay" — opening the choice flow (§3.2).
- States the *why* in one line, with the number: e.g. *"Your usage this month is
  on track for about ₹18,400 — above the ₹15,000 limit for automatic card
  payments."*
- Reassures continuity: *"Your services keep running."*
- Dismissible? **No** — it persists until a choice is made (but must not block the
  rest of the page; it sits above content, not as a modal).
- Must not look like a generic error toast. It's a standing state, not a transient alert.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚠  Action required — choose how to keep paying                         │
│    Your usage is trending to ~₹18,400 this month, above the ₹15,000    │
│    limit for automatic payments. Your services keep running.           │
│                                              [ Choose how to pay → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 The choice flow — manual checkout vs prepaid wallet

A focused decision screen (modal or dedicated page). The two options must be
**tangibly different**, side by side, each with a one-line tradeoff and a clear
selector. Avoid a wall of text.

```
   How would you like to pay going forward?

   ┌───────────────────────────┐   ┌───────────────────────────┐
   │  Pay each invoice         │   │  Prepaid wallet           │
   │                           │   │                           │
   │  We email you each bill;  │   │  Add credits up front;    │
   │  you pay in a few taps    │   │  usage draws them down.   │
   │  (any amount).            │   │  Auto-reminders when low. │
   │                           │   │                           │
   │  Best if bills vary a lot │   │  Best for hands-off,      │
   │  month to month.          │   │  predictable spending.    │
   │            ( Select )     │   │            ( Select )     │
   └───────────────────────────┘   └───────────────────────────┘

   You can switch anytime in Billing → Settings.
```

Requirements:
- Selecting **Pay each invoice** → confirm → returns to dashboard; any open
  invoice now shows a **Pay now** action (§3.3). Banner clears.
- Selecting **Prepaid wallet** → confirm → go to **Add credits** (§3.4),
  pre-suggesting an amount that covers the current open balance. Banner clears.
- Reversible: make "you can switch anytime" explicit and true.
- Loading state on confirm; error state if the mode change fails (rare).

### 3.3 Pay an invoice (manual checkout)

For `manual_checkout` customers and any open balance.
- Invoice list shows status + a **Pay now** button on open invoices.
- "Pay now" opens the Razorpay checkout (hosted); on return, reflect
  **pending → paid** (settlement is webhook-confirmed; show an interim "confirming
  payment…" state, never a premature "Paid").
- Handle: success, cancelled, failed, and "still confirming" (webhook lag).

### 3.4 Add credits (prepaid wallet)

For `prepaid` customers.
- Wallet balance shown prominently; **Add credits** primary action.
- Amount entry with sensible suggestions (e.g. cover open balance; 1×/2×/3×
  recent monthly spend).
- Razorpay checkout; same pending → confirmed handling as §3.3.
- **Low-balance state**: when the wallet won't cover the forecast, show a calm
  "Top up to avoid interruption" prompt with the shortfall amount — not alarm,
  until it's actually overdue.

### 3.5 Billing settings — collection mode

A settings surface where the customer sees and changes their current mode:
- Current mode, clearly labelled (§2).
- Switch between **Pay per invoice** and **Prepaid wallet** anytime.
- If eligible (small/again-small usage), an option to **re-enable automatic
  payments** — but don't over-promise; show eligibility honestly.

### 3.6 Notifications

The same moments arrive as in-app + email notifications ([#20](../../issues/20-notification-suite.md)):
- Threshold tripped → "Action required: choose how to pay" (links to §3.2).
- Invoice ready (manual_checkout) → "Your invoice is ready to pay."
- Wallet low (prepaid) → "Your balance is running low."
- Overdue / pre-suspension → existing dunning sequence, mode-aware copy.

---

## 4. Copy principles

- **Numbers, not jargon.** Say "₹15,000 limit for automatic payments," never
  "RBI AFA e-mandate cap."
- **No gateway names anywhere in customer copy.** "Stripe" and "Razorpay" are our
  plumbing; the customer has a card, a UPI ID or a bank account.
- **Reassure before instruct.** Lead with "services keep running," then the ask.
- **Name the benefit of each option**, not just the mechanic.
- **Never imply blame** ("you exceeded…"). Frame as growth ("your usage is
  growing…").
- Indian number formatting (₹18,400 / ₹1,50,000), currency from the team profile.

---

## 5. States to cover for every surface

For each screen above, design: **default, loading, empty, error, success/confirmed,
and the webhook-lag "confirming…" interim.** The payment surfaces especially must
never show "Paid" before the gateway confirms.

---

## 6. Data the UI receives (so you know what's available)

The backend exposes (final field names in [#60](../../issues/60-inr-collection-mode-threshold-action-required.md)):
- `collection_mode` — one of the four states (§2).
- `action_required` — boolean + a reason (`forecast_over_threshold` / `invoice_over_threshold` / `mandate_failed` / `tier_cap`).
- `threshold` and `projected_total` / `current_invoice_total` — to render the
  "trending to ~₹X above ₹15,000" line with real numbers.
- `wallet_balance`, `open_balance`, `shortfall` — for prepaid prompts.
- Open invoices with amounts + pay state.

---

## 7. Constraints & non-goals

- **Not a blocker.** The Action Required state must never gate access to the rest
  of the console; services run until normal dunning/suspension (a *separate*,
  later, non-payment path).
- **No OTP UI to build** for the >₹15k case — that path is deliberately replaced
  by on-session checkout / prepaid. You won't design an authorization-link flow.
- **Mobile + desktop**; the banner and choice flow must work on small screens.
- **Accessibility:** the banner is an attention state — use role/aria-live
  appropriately, sufficient contrast, not colour-only signalling.

---

## 8. Open questions for design

1. Banner placement when the customer is deep in a non-billing area of the console
   — slim global hint, or billing-only?
2. Should "Action required" offer a **third** quick path — "pay this invoice now
   and decide later" — or force the durable choice? (Behaviour supports either.)
3. Prepaid suggested top-up amounts — fixed tiers vs usage-derived?
4. How prominent should "re-enable automatic payments" be once a customer has left
   e-mandate — discoverable but not nagging?
