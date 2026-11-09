# Strategic improvements (D1, D2)

Changes that alter a model or add a surface, not a single screen. Each needs a
decision before work starts.

## 1. One collection model, visible to the customer

**Drafts.** 04, 03, 19. **Decisions.** D-01, D-02.

Today the collection mode lives only in the backend. The console infers it from
labels, and one meaning (Prepaid) differs between screen and engine. Target:

- one written definition per mode, used by the engine, the console and support;
- a "How you pay" card on Payments as the only place it changes;
- method rows that state their role under the current mode ("Charged first",
  "Used if the one above fails", "Not charged: Prepaid").

Why strategic: every later domain (wallet, limits, dunning) reads this mode. Fix it
before D3 and D4 work starts.

## 2. Support console for billing

**Drafts.** 05, 17; existing issue 125. **Decision.** D-03.

Today support works list by list, or impersonates the customer. Target: a team
billing page in Desk built on `get_team_billing`, showing setup attempts (issue
125), held invoices, and the actions support may take (charge again, payment link,
retry sync), each writing a Billing Event.

Why strategic: CB-21 and CB-22, the two largest measured problems, cannot be
handled without it.

## 3. Customer-safe error model

**Draft.** 18.

Today the server's sentence is the customer's sentence. Target: typed domain
errors mapped once in `api/dashboard`, a reference id on unknown errors, and a
Guard rule banning internal words. This stops each new feature from adding
developer messages to customer screens.

## 4. Payment outcome loop

**Drafts.** 09, 01, 02.

Today the console fires a request and waits for a reload. Target: every
money action (add method, pay, top-up) ends in a state the customer sees without
reloading: done, failed with a reason, or "we'll email you". Start with polling;
move to push when Central has a channel.

## 5. Visual and accessibility verification

**Draft.** 16. **Decision.** D-09.

Everything in this checkpoint is from source. A short signed-in pass on
`demo-billing.localhost` (desktop, 375 px, keyboard, VoiceOver) would confirm or
drop the H-items and raise the UI findings from code to observed.
