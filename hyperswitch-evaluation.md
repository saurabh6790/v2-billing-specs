# Should we use Juspay Hyperswitch?

An evaluation, written for someone deciding whether to route our payments through
Hyperswitch instead of talking to each payment gateway ourselves.

Everything factual below was read out of the Hyperswitch source code and their
documentation, not from marketing pages. Where I'm unsure, I say so.

---

## What Hyperswitch actually is

It is not a payment gateway. It is a piece of software that sits *between* our
billing system and the payment gateways, and speaks to all of them on our behalf.
We call Hyperswitch; Hyperswitch calls Stripe, or PayPal, or whoever.

It never touches our money. When a customer pays, the money still flows from the
card network to whichever gateway we contracted with, and that gateway still pays
it into our bank account. Hyperswitch only makes the API calls and keeps a record.

We can either pay them to run it for us, or run it ourselves. Running it ourselves
means operating: a main service, a background job service, a PostgreSQL database
(with a read replica), a Redis instance, a separate secure service that stores card
numbers, and a monitoring stack. All of it sits directly in the path of every
payment we take.

---

## The two questions you actually asked

### Can we store the customer's card and charge it at the end of the month?

**Yes. Cleanly. This is the thing it does best.**

The flow is: the customer enters their card once, and we tell Hyperswitch to
remember it for later. We can do that either while taking a real payment, or with a
zero-amount check that just validates the card without charging anything.

Hyperswitch then hands us back an identifier for that saved card. Whenever we like
— end of the month, middle of the week, whenever — we send that identifier back
with the amount we want, and it charges the card without the customer being
involved.

Their own documentation is explicit that this is not tied to any subscription
product: *"the recurring payments are not tied to a specific amount or cycle and
the merchant can charge the end-user as per their own business requirements."*

So our worry about being dragged into someone else's subscription engine is
unfounded. We would never touch their subscription features. We would use them as a
place to keep cards and a way to charge them, which is precisely how we already use
Stripe.

**Caveat worth knowing:** this works well for cards. It works for very little else.
Most payment methods in the world cannot be charged silently later, and that is a
fact about the payment method, not about Hyperswitch.

### If a card fails on one gateway, will it automatically try another?

**Sort of, and much less than the pitch implies. This is the most oversold part of
the product and the place we'd most likely get hurt.**

Here is the honest picture, from the code.

When a card is saved, Hyperswitch does not store one "saved card." It stores a
*map* — one entry per gateway. The card is registered with Stripe, and that
registration is a Stripe-specific reference that only Stripe understands. If we
later want to charge that same card through a second gateway, that gateway has
never heard of it.

There are only three ways around this, and each has a catch:

1. **Register the card with both gateways up front.** Then we have two references
   and can use either. But this doubles the setup work, and some gateways charge
   for it or require the customer to authenticate again.

2. **Let Hyperswitch replay the actual card number to the second gateway** from its
   own vault. This works, but it means the real card number is being stored and
   re-sent, which pulls us into a much heavier compliance regime. There is also an
   open feature request in their tracker (issue 12711) showing this plumbing is
   incomplete — for some gateways, Hyperswitch throws away the card number at
   exactly the moment it would need it, and the charge simply cannot be made.

3. **Use a network token**, which is a card-network-issued stand-in that any
   gateway can accept. This is the clean answer, and it depends on us and our
   gateways both supporting it.

On top of that, their automatic-retry feature has a stated limitation: it does not
work for any payment that would need the customer to authenticate again. A retry on
a second gateway can trip exactly that requirement.

**So the realistic answer is:** we would get automatic cross-gateway retry for
plain card charges where we've done the setup work to make the card usable on more
than one gateway. We would not get it for free, and we would not get it universally.

---

## What we get out of the box

**Genuinely useful, and things we don't have:**

- **One place that holds card numbers.** Today our saved cards live inside Stripe,
  which means we cannot move a customer to a different gateway without asking them
  to type their card in again. This is real lock-in, and it is the single strongest
  argument for Hyperswitch.
- **Automatic retries on a different gateway** when a charge fails — within the
  limits described above.
- **Routing rules.** Send this country's traffic here, split volume 70/30, prefer
  whichever gateway is currently approving the most payments, prefer whichever is
  cheapest, fall back down a priority list when one is down.
- **Roughly a hundred gateways already integrated**, so adding the hundred-and-first
  is configuration rather than code.
- **A ready-made checkout screen** for web and mobile, if we want it.
- **Selective 3D Secure**, so we can skip the extra authentication step on
  low-risk payments.

**Things it offers that we would ignore**, because we already have them and ours
are tied into our own invoices, credits and dunning: their subscription billing,
their reconciliation, their retry-the-failed-invoice logic, their customer records,
their cost reporting.

That overlap is the crux of the whole decision, and I'll come back to it.

---

## What is easy to configure

- Adding a gateway, once a connector exists: keys in a dashboard, no deploy.
- Routing rules: which gateway handles which country, currency, card type, amount
  band. Editable without a deploy.
- Volume splits between gateways, and the fallback order.
- How many times to retry a failed payment, and on which failures.
- Which payment methods to show in which country — this is something *we* declare,
  not something the system knows.

## What is not easy

- Anything a connector doesn't already do. Then we are writing Rust inside their
  codebase and maintaining a fork, or waiting for them.
- Anything that requires a connector to be better than it is. Connector quality
  varies enormously and there is no way to fix that from the outside.
- Moving saved cards between gateways, as described above.

---

## Countries: which are supported, which are not

**The honest answer is that Hyperswitch does not support countries. Gateways do.**

This is not a dodge. I went looking for a country list in the code. There is a
field called `supported_countries` in their public feature-matrix API — and it is
never filled in, anywhere in the entire codebase. The only country configuration
that exists is a list *we* provide, saying which countries we want to accept a
given payment method in.

So the question "which countries does Hyperswitch support" has no answer. The real
question is "which gateways does it have connectors for, and do those gateways
cover the countries we sell in." And there, the shape of the coverage is very clear.

**Well covered:** the United States, Canada, the UK, western Europe, Australia.
Card processing everywhere, plus dozens of local bank-transfer and buy-now-pay-later
schemes.

**Well covered, surprisingly:** Latin America and southeast Asia. There are six
separate variants of Brazil's Pix, five Indonesian virtual-account types, five
Japanese convenience-store chains, and dedicated bank-redirect support for Thailand,
Poland, Finland, Slovakia and the Czech Republic.

**Partially covered:** India. There is a Razorpay connector, but it handles exactly
one payment method, cannot save a card or set up a recurring arrangement, has its
incoming-webhook handling stubbed out, and is still marked as sandbox-only.

**Effectively not covered: Africa.** This matters most, so in detail:

- There is no M-Pesa. The string does not appear anywhere in the codebase.
- There is no mobile money of any kind. Their list of 122 payment methods contains
  no M-Pesa, no MTN Mobile Money, no Airtel Money, no Orange Money, no Wave.
- There *is* an entry called "Momo," which is a trap. It is the Vietnamese MoMo
  wallet, not MTN Mobile Money.
- The African gateways that exist are thin: card processing in South Africa
  (Peach Payments), a South African debit-order connector, and a Nigerian connector
  that only does bank transfers and is still sandbox-only.
- **Not one African connector can save a card for later charging.**

If our growth plan runs through Kenya, Nigeria, Ghana or francophone West Africa,
Hyperswitch offers us nothing there. Its coverage is dense exactly where payments
are already easy and empty exactly where they are hard. That is not an accident;
it reflects who their large customers are.

---

## Maturity: read the labels

Every connector carries a status. Across the whole tree: 37 are marked live, 44 are
sandbox-only, 11 are beta, 21 are alpha, and 36 carry no label at all.

That last bucket is a warning about the labels themselves, not about the code.
Stripe is unlabelled, and Stripe is obviously their most complete connector. The
metadata is just not consistently filled in — which is itself a small signal about
how carefully the edges of this project are maintained.

Of the ~100 payment gateways, only about a third are marked production-ready.

---

## How we would use several gateways together

This is the part that genuinely works, and it is worth being fair about.

We could put Stripe and one other card gateway behind Hyperswitch, and then:

- Send a customer's charge to whichever gateway is currently approving more
  payments, learned automatically over time.
- Route by cost, so a debit card goes down whichever network is cheapest.
- Split traffic deliberately, so we keep a second gateway warm and never find
  ourselves with a dead integration in an emergency.
- Fall back automatically when one gateway has an outage.

For a business processing enough volume that half a percent of approval rate pays
for a payments team, this is transformative. It is exactly why large merchants buy
this category of product.

The question is whether we are that business yet.

---

## What could go wrong

**We put a new single point of failure in the payment path.** Today, if Stripe is
up, we can charge. With Hyperswitch, we can charge only if Stripe *and* Hyperswitch
are both up. If we self-host, that means our own service, our own database, our own
Redis, and our own card vault all have to be up too, at 3am, when a month-end
billing run is charging thousands of customers at once.

**We end up with two of everything.** Two things that decide which gateway to use.
Two things that retry a failed payment. Two things that reconcile against the
gateway. Two places a customer record lives. Each of those pairs can disagree, and
when they disagree the symptom is a customer charged twice, or not charged at all,
or marked overdue while their money is sitting in our account.

The retry duplication is the one that scares me most. Our own system retries failed
payments on a schedule. Hyperswitch also retries failed payments. Neither knows
about the other. It is entirely possible to charge a customer twice for one invoice
and have both systems believe they behaved correctly.

**We add a hop to every webhook.** Right now the gateway tells us directly that a
payment succeeded. With Hyperswitch, the gateway tells Hyperswitch and Hyperswitch
tells us. That is one more place a message can be delayed, duplicated or lost, and
one more signature scheme to verify.

**Our records stop matching the money.** When we check that every payment we think
we took actually landed, we compare our records against the gateway's. With
Hyperswitch in the middle, our records carry *its* identifiers, and the money
settled against the *gateway's* identifiers. We would have to store both and join
them. This is solvable but it is real work, and getting it wrong means we cannot
answer "did this customer actually pay."

**If we hold card numbers, we inherit the compliance burden.** The strongest reason
to adopt Hyperswitch is to stop being locked into Stripe's card storage. But the
moment card numbers live in a vault we operate, we are responsible for that vault
to the card industry's standards. That is a serious, ongoing, audited obligation,
and it should be a decision made with a lawyer and an auditor, not an architect.
(India in particular has strict rules about who may store a card number. I have not
verified how Hyperswitch handles those rules. This needs checking before anyone
commits.)

**Connector quality is not our problem until it is.** If the Razorpay connector is
broken, we cannot fix it in our codebase. We fix it in theirs, in Rust, and then we
either maintain a fork or wait for a release.

**Migrating saved cards is not a solved problem.** Every customer who has a card on
file with us today has it stored in Stripe. Moving those into Hyperswitch's vault
is a negotiation with Stripe, not an API call.

---

## Pros and cons, plainly

### Pros

- Removes our dependence on one gateway holding all our customers' cards.
- Lets us add gateways by configuration instead of by writing and testing code.
- Automatic failover and retry across gateways, for card payments.
- Smarter routing: by cost, by success rate, by country, by anything.
- Around a hundred gateways already integrated, which is a lot of code we don't write.
- Open source, self-hostable, so no vendor can hold our payments hostage.
- Ready-made checkout screens if we ever want them.
- Saving a card and charging any amount later is a first-class, well-documented flow.

### Cons

- It is a whole distributed system we have to run, in the path of all our revenue.
- It duplicates several things we have already built, tested and shipped.
- The duplicated retry logic can double-charge customers if we are not extremely careful.
- Cross-gateway retry of a saved card is far harder than advertised, and partly unbuilt.
- Zero support for African mobile money, which is where we say we are going.
- The India connector is sandbox-quality and cannot save cards.
- Only about a third of gateways are marked production-ready.
- Holding card numbers ourselves is a large compliance commitment.
- One more hop in every payment and every webhook.
- Our payment records and the actual money would no longer share identifiers.
- We cannot fix a broken connector without working in someone else's Rust codebase.

---

## What billing looks like, each way

### Today, talking to gateways ourselves

A customer adds a card. We ask the gateway to remember it and store the reference
the gateway gives us. At the end of the month we work out what they owe, and we
tell that same gateway to charge that card. The gateway tells us it worked. If it
did not work, our own retry schedule tries again over the following days, and if it
keeps failing we start chasing the customer.

Adding a new gateway means writing an adapter — a few hundred lines that translate
our concepts into theirs — and running it against the shared test suite we already
have. The gateway's own identifiers appear in our records, so when we reconcile
against the gateway's ledger, everything matches by construction.

If we want to support M-Pesa, we write an M-Pesa adapter. Nobody has to build it for
us first.

### With Hyperswitch in the middle

A customer adds a card. We ask Hyperswitch to remember it, and it registers the
card with whichever gateway its routing rules select, storing a per-gateway
reference internally and giving us one identifier that stands for all of them.

At the end of the month we tell Hyperswitch to charge that identifier. It picks a
gateway — possibly a different one than we expect, because the routing rules are
now data, not code — and charges. If the charge fails, Hyperswitch may retry on
another gateway, if it can, if the card is usable there, and if the failure was the
kind it retries. Meanwhile our own retry schedule is also running.

The gateway confirms to Hyperswitch. Hyperswitch confirms to us. Our records now
hold a Hyperswitch identifier and, if we thought to store it, the underlying
gateway's identifier too. To prove a customer paid, we join across both.

Adding a new gateway is a form in a dashboard — *if* a connector exists. If it does
not, it is a Rust contribution to an external project, on their timeline.

If we want to support M-Pesa, we wait, or we write it in Rust for them, or we build
a direct integration anyway and now we have both systems.

### The honest comparison

Hyperswitch replaces a few hundred lines of adapter code per gateway with a
distributed system we operate and a routing layer we no longer control from our own
codebase. In exchange it gives us card portability, smart routing, and a hundred
integrations we haven't written.

Whether that is a good trade depends entirely on how many gateways we actually
intend to run, and where.

---

## Other questions we should be asking

Ones I could not answer from the code and docs, which someone should chase before
this goes further:

- What does their hosted version cost, and is there a per-transaction fee? If we
  self-host, what is the real operational cost in people?
- Can we legally store card numbers in a vault we run, in each country we sell in?
  India specifically restricts this. Who signs off on that?
- How do we move the cards we already have out of Stripe and into Hyperswitch, and
  will Stripe cooperate?
- When Hyperswitch is down, what is our fallback? Can we bypass it and call Stripe
  directly in an emergency, and does that leave our records consistent?
- How often do they publish breaking changes, and what does upgrading cost us?
- If we find a bug in a connector we depend on, what is the realistic time to a fix?
- Do refunds and chargebacks map cleanly onto our existing records, or do we need
  new bookkeeping?
- Their smart-retry feature has to be switched on by their support team. What are
  the terms, and what happens to that if we self-host?
- Does anything about routing decisions get logged well enough that we can explain
  to a customer why a specific charge went the way it did?

---

## My recommendation

**Not now — but for a different reason than you might expect.**

The strongest argument for Hyperswitch is real: our customers' cards live inside
Stripe, and that is lock-in we should not be comfortable with. That problem does not
go away, and one day we will want to solve it.

But it is not the problem we have this quarter. The problem we have is that we want
to accept payments in Africa, and Hyperswitch cannot do that at all. It has no
M-Pesa, no mobile money of any kind, and not one African gateway that can save a
card. Adopting it would mean standing up a payments platform, absorbing its
operational cost, accepting duplicate retry logic — and then still writing a direct
M-Pesa integration ourselves.

There is also a deeper thing worth saying plainly. Mobile money does not work like
a card. A customer approves each payment on their phone by entering a PIN. We
cannot silently charge them at the end of the month, no matter what software sits in
the middle. Whatever we build for Africa, customers will be topping up a balance
with us in advance, and their bill will draw down from that balance. That is a
different shape of billing from card-on-file, and no orchestration layer changes it.

So the sequence I would suggest:

1. **Solve Africa directly**, with a single integration to a gateway that actually
   covers it. Flutterwave reaches the most countries; Paystack has the better API
   but a narrower footprint. Both do mobile money. That is one integration, and it
   fits how our system already works.
2. **Revisit Hyperswitch when card portability becomes the binding constraint** —
   when we want a second card gateway for redundancy or pricing leverage, or when
   we are large enough that approval-rate routing pays for itself.
3. **If we do adopt it, adopt it narrowly.** Use it for cards only. Pin each
   configuration to a single gateway so its routing never surprises us. Turn its
   retries off and keep ours. Store the underlying gateway's identifiers alongside
   its own. Treat it as a card vault that happens to be able to route, rather than
   as a router that happens to hold cards.

The trap to avoid is adopting it *because* it has a hundred connectors, and then
discovering that the two we need are the two that don't work.
