# Terminology

Plain-English definitions for terms used across these specs that are not
obvious on first read. Formal glossary vocabulary (Bundle, Rate, Price-lock,
etc.) is in [CONTEXT.md](CONTEXT.md); this file covers the jargon that trips
up engineers and non-billing readers.

---

## Billing Model

| Term | Plain English |
|------|---------------|
| **Clawback** | If you signed up for a discount by promising to spend ₹X/month but spent less before the term ended, you pay back only the discount you enjoyed — not a penalty, just returning the price break |
| **Price-lock** | Your price is frozen at whatever it was when you signed up, even if Frappe raises prices later for new customers |
| **Grandfathering** | Existing customers keep their old price permanently, even after rates increase for new sign-ups |
| **Shown rate** | The price you saw on screen at checkout — the spec guarantees this is exactly what gets locked in, no bait-and-switch |
| **Floor** | A minimum monthly spend you've committed to. Spend above it: fine. Spend below it before the term ends: breach |
| **In-arrears / postpaid** | You pay at the end of the month for what you already used — like a phone bill, not a prepaid SIM |
| **Commitment** | A formal deal: "I'll spend at least ₹X/month for 12 months; in return I get a discount on every invoice" |
| **Alive (billing state)** | A server that is either running or stopped but still reserved. Stopping a server does not pause your bill — resources are still held |
| **Composition** | The list of what's included in a plan (2 vCPU, 4 GB RAM, 80 GB disk) — spec only, carries no price |
| **Money representation** | Money is stored as a float `Currency` in **major units** (₹, $) throughout — rates, invoice amounts, credit balances. *(The integer minor-units / "rate units (minor × 10⁶)" model of [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) was never implemented and is deprecated; the only minor-unit conversion is inside a gateway adapter that requires it.)* |
| **Allowance** | The quantity included in your plan before extra charges kick in. A plan with 1 TB transfer means 1 TB is free; above that, overage applies |
| **Locked allowance** | The included allowance frozen at the time you subscribed — same concept as price-lock but for quantities, not rates |

---

## Payments

| Term | Plain English |
|------|---------------|
| **Dunning** | The automated process of chasing a customer for an unpaid invoice: retry on Day 1, Day 3, Day 7, then escalate to suspension |
| **Settlement** | Actually collecting the money — applying credits, charging the card, and marking the invoice paid |
| **Settlement waterfall** | The order in which payment sources are tried: credits first, then card. If credits cover it fully, the card is never touched |
| **e-mandate** | A standing permission you register once with your bank or UPI, allowing Frappe to automatically debit your account each month without you logging in |
| **Off-session charge** | Charging your card automatically in the background without you being present — like a streaming service charging you on the 1st without you doing anything |
| **On-session** | Paying while you're actively logged in — you enter OTP yourself, no automatic debit |
| **AFA (Additional Factor Authentication)** | The OTP or biometric step your bank requires for large payments. RBI mandates this for any silent debit above ₹15,000 |
| **Pre-debit notification** | An SMS or email your bank sends before Frappe auto-charges your account — an RBI requirement before every e-mandate debit |
| **Micro-charge** | A ₹1 / $0.50 test charge that is immediately refunded — just to prove a card is real and working before it is saved |
| **Idempotency / idempotency key** | A unique ID attached to every payment attempt so that if the same request is sent twice (network glitch, retry), the gateway only charges once |
| **Reconciliation** | Cross-checking: "our system says this invoice was charged — does the payment gateway agree?" Resolves cases where a charge went through but the confirmation never arrived |
| **Webhook** | A push notification from the payment gateway to your server saying a payment succeeded or failed. Billing waits for this before marking anything paid |
| **HMAC / signature-first** | A secret code attached to each webhook so you can verify it is genuinely from Stripe or Razorpay and not a forged "payment succeeded" message |
| **Gateway adapter** | A translation layer so billing code speaks one internal language and the adapter converts it for each payment provider. Swap the adapter, not the billing engine |
| **Trust tier** | A spending limit based on your payment history. New customers get a small cap; after several paid invoices it automatically increases. The customer-facing console labels this **Spending Limits** (nav: **Limit Tiers**) and shows rungs as **Base / Tier 1–3**; the backend stays Trust Tier (`Trust Tier Level`, `get_trust_tier`) |
| **Chargeback** | When a customer disputes a charge with their bank and the bank forcibly reverses it — not a refund you initiate, but a reversal the bank imposes |
| **Collection mode** | Which payment method a customer uses to settle their bill: auto-charge via card (`stripe_auto`), e-mandate (`emandate`), paying each invoice manually (`manual_checkout`), or maintaining a prepaid wallet (`prepaid`) |
| **action_required** | A temporary state when an Indian customer's bill crosses ₹15,000 and silent auto-charge can no longer proceed. The account keeps running, but the customer must choose a new payment approach |
| **Fallback / settlement fallback** | If the primary payment method fails, the system automatically tries the next one in order — without re-running the whole invoice flow |

---

## Tax

| Term | Plain English |
|------|---------------|
| **Output tax** | Tax added on top of the customer's bill that you collect and pay to the government — GST, VAT |
| **Zero-rating** | A tax rate of 0%, but you must still declare why (e.g. customer is in a Special Economic Zone). Not "no tax" — "tax at zero with a documented reason" |
| **SEZ-LUT** | Special Economic Zone — Letter of Undertaking. A government document that SEZ customers submit so you do not charge them GST on exports |
| **TDS (Tax Deducted at Source)** | The customer legally withholds a percentage of your invoice and pays it directly to the government on your behalf. You receive the reduced amount and reclaim the withheld tax later with a certificate |
| **Withholding** | The TDS mechanic: the customer short-pays the invoice by the withheld tax amount. The invoice is still considered paid — the system knows not to chase them for the withheld portion |
| **Statutory SOR** | The legally-required official accounting record. For Frappe Cloud that is ERPNext — the record an auditor or tax authority would refer to |

---

## Metering

| Term | Plain English |
|------|---------------|
| **Counter meter** | Tracks cumulative usage that only goes up — like total GB transferred this month. You are billed on the total |
| **Gauge meter** | Tracks something that can go up and down — like snapshot storage size — and bills you on how much you had multiplied by how long you had it |
| **GB-days** | The unit for snapshot billing: 10 GB stored for 3 days = 30 GB-days. Captures both size and duration in one number |
| **Edge aggregation** | The data center itself calculates totals before sending to billing — instead of sending millions of raw data points, it sends one number per month per resource |
| **Rollup** | A pre-calculated summary. Instead of one row per resource per day, you store one total per resource per month |

---

## Architecture

| Term | Plain English |
|------|---------------|
| **Append-only ledger** | A record you can only add to, never edit or delete — like a paper ledger. Every transaction is a new line; the balance is the sum of all lines |
| **Two-axis state** | Two independent things tracked separately: (1) is the server running? (2) has the team paid? A running server can have an overdue bill at the same time |
| **Source of truth** | The one authoritative record everyone else defers to. If it says the invoice is paid, it is paid |
| **Idempotent** | Safe to run multiple times with the same result. If you retry a charge twice, only one charge goes through |
| **FOR UPDATE lock** | A database technique to prevent two processes from simultaneously spending the same credits — one waits while the other finishes |
| **AFK / HITL** | AFK (Away From Keyboard) = an agent can complete the task end-to-end with no human. HITL (Human In The Loop) = a human must review or decide before it proceeds |
| **Seam** | The boundary between two systems where one hands off to another — e.g. between billing and the payment gateway |

---

## Subscriptions & Account States

| Term | Plain English |
|------|---------------|
| **Account standing** | Your payment status: current (all paid up), past_due (missed a payment, in grace period), or suspended (server stopped due to non-payment) |
| **Past due** | You have missed a payment but your server is still running — you are in a grace period while the system retries the charge |
| **Suspended** | Server powered off because of unpaid invoices. Data is preserved; reactivate by paying |
| **Terminated** | Server permanently deleted. Billing stops. Cannot be reversed |
| **cost_report** | A shadow invoice generated for free and trial teams showing what they would have been charged — used to calculate the real cost of running non-paying customers |
| **Pro-rata / proration** | Charging for only part of a month. Join on the 15th, pay for 15 days not 30. The spec bans automatic proration to avoid credit-note complexity |
