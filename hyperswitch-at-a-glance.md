# Hyperswitch at a glance

The short, visual companion. Same evidence as the long write-up, arranged so you
can point at it in a meeting.

---

## The verdict in one picture

```mermaid
flowchart TD
    Q{"What are we trying to fix?"}

    Q -->|"Accept payments in Africa"| A["Hyperswitch cannot help.<br/>No M-Pesa. No mobile money.<br/>Zero African connectors save a card."]
    Q -->|"Our cards are trapped inside one gateway"| B["Hyperswitch helps.<br/>This is the real argument.<br/>But it is not this quarter's problem."]
    Q -->|"We want a second card gateway<br/>for redundancy or leverage"| C["Hyperswitch helps.<br/>Revisit when this is true."]
    Q -->|"We want smarter routing<br/>to lift approval rates"| D["Hyperswitch helps —<br/>at volumes we do not have yet."]

    A --> V["Verdict: not now"]
    B --> V
    C --> V
    D --> V

    style A fill:#ffe5e5,stroke:#c00,color:#000
    style B fill:#fff6d5,stroke:#b8860b,color:#000
    style C fill:#fff6d5,stroke:#b8860b,color:#000
    style D fill:#fff6d5,stroke:#b8860b,color:#000
    style V fill:#e5efff,stroke:#036,color:#000
```

---

## Where it sits

### Today

```mermaid
flowchart LR
    B["Our billing system"] --> S["Stripe"]
    B --> P["PayPal"]
    B --> R["Razorpay"]
    S --> M["Our bank account"]
    P --> M
    R --> M
```

### With Hyperswitch

```mermaid
flowchart LR
    B["Our billing system"] --> H["Hyperswitch"]
    H --> S["Stripe"]
    H --> P["PayPal"]
    H --> R["Razorpay"]
    S --> M["Our bank account"]
    P --> M
    R --> M

    style H fill:#fff6d5,stroke:#b8860b,color:#000
```

The money path is unchanged. Hyperswitch never holds our funds — the gateway still
settles into our account. Only the API calls move.

---

## What we would have to run

If we self-host, every one of these sits in the path of every payment.

```mermaid
flowchart TD
    subgraph HS["Hyperswitch, self-hosted"]
        RT["Router<br/><i>all payment flows</i>"]
        SC["Scheduler<br/><i>producer + consumer</i>"]
        PG[("PostgreSQL<br/>primary + replica")]
        RD[("Redis<br/>cache + queue")]
        LK["Card vault<br/><i>separate service</i>"]
        MON["Monitoring stack"]
    end

    B["Our billing system"] --> RT
    RT --> PG
    RT --> RD
    RT --> LK
    SC --> RD
    SC --> PG
    RT --> MON
    RT --> GW["Payment gateways"]

    style LK fill:#ffe5e5,stroke:#c00,color:#000
```

The card vault is shaded because it is the piece with legal consequences: the moment
real card numbers live in something we operate, we own that obligation.

---

## The connector inventory

149 modules ship in the tree. They are not all payment gateways.

| What it is | Count | Examples |
|---|---:|---|
| Payment gateway | 98 | Stripe, Adyen, Checkout, Razorpay |
| Bank acquirer | 9 | JP Morgan, Wells Fargo, Santander |
| Alternative payment method | 6 | Amazon Pay, BitPay, Boku |
| Billing platform | 2 | Chargebee, Recurly |
| Payout processor | 1 | Hyperwallet |
| Authentication provider | 1 | Plaid |
| Not a gateway at all | 32 | fraud, tax, 3DS servers, vaults, test stubs |

So the number that will actually take a card payment is nearer **100 than 149**.

### How production-ready are they?

| Status | Count | Share |
|---|---:|---|
| Live | 37 | ████████░░░░░░░░░░ 25% |
| Sandbox | 44 | █████████░░░░░░░░░ 30% |
| Beta | 11 | ██░░░░░░░░░░░░░░░░ 7% |
| Alpha | 21 | ████░░░░░░░░░░░░░░ 14% |
| No label | 36 | ███████░░░░░░░░░░░ 24% |

Read the "no label" row carefully. Stripe is in it, and Stripe is their most complete
connector. The labels are inconsistently filled in — which tells you something about
how the edges of this project are maintained.

**Only about a third of payment gateways are marked production-ready.**

### Can they save a card for later?

This is the capability we actually need, and it is the exception, not the rule.

| | Count |
|---|---:|
| Connectors that can save a card on *at least one* payment method | 47 of 149 |
| Individual "yes, can save" declarations across all methods | 168 |
| Individual "no, cannot save" declarations | 298 |

---

## Country coverage

**Hyperswitch does not support countries. Gateways do.**

Their public API declares a `supported_countries` field. It is never filled in,
anywhere in the codebase. The only country list that exists is one *we* supply,
saying where we want to accept a given method.

| Region | Coverage | Notes |
|---|---|---|
| 🇺🇸 🇨🇦 🇬🇧 🇪🇺 🇦🇺 | ●●●●● | Cards plus dozens of local schemes |
| Latin America | ●●●●○ | Six separate Pix variants for Brazil alone |
| Southeast Asia | ●●●●○ | Five Indonesian virtual-account types |
| Japan | ●●●○○ | Five convenience-store chains |
| India | ●●○○○ | One connector, sandbox-only, cannot save cards |
| **Africa** | **●○○○○** | **Cards in South Africa. Nothing else.** |

### Africa in detail

| Connector | Country | Status | Methods | Can save a card? |
|---|---|---|---|---|
| Peach Payments | 🇿🇦 | Live | Cards | ❌ No |
| Absa / Sanlam | 🇿🇦 | Live | Debit order | ❌ No |
| Paystack | 🇳🇬 | Sandbox | Bank transfer | ❌ No |
| dLocal | multi | Sandbox | Cards, vouchers | — |
| Rapyd | multi | Sandbox | Cards, wallet | — |

**Not one African connector can save a card.**

And the payment methods that matter in Africa simply do not exist. Their list of
122 payment methods contains:

| Method | Present? |
|---|---|
| M-Pesa | ❌ |
| MTN Mobile Money | ❌ |
| Airtel Money | ❌ |
| Orange Money | ❌ |
| Wave | ❌ |
| "Momo" | ⚠️ **Yes — but it's the Vietnamese wallet, not MTN** |

---

## Can we store a card and charge it at month end?

**Yes. This is the thing it does best.** Their docs are explicit that the later
charge is *"not tied to a specific amount or cycle."* We would never touch their
subscription product.

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant B as Our billing
    participant H as Hyperswitch
    participant G as Gateway

    rect rgb(232, 245, 233)
    Note over C,G: Once, at signup
    C->>B: Enters card
    B->>H: Save this for later
    H->>G: Register card
    G-->>H: Gateway's own reference
    H-->>B: One identifier for the saved card
    end

    rect rgb(232, 240, 254)
    Note over B,G: Every month, customer absent
    B->>B: Work out what they owe
    B->>H: Charge that identifier, this amount
    H->>G: Charge
    G-->>H: Approved
    H-->>B: Approved
    end
```

Clean. No caveats worth the ink — **for cards**. Almost nothing else in the world
can be charged silently later, and that is a fact about payment methods, not about
Hyperswitch.

---

## If a card fails on one gateway, does it try another?

**This is the most oversold part of the product.**

A saved card is not one thing. Internally it is a *map*, one entry per gateway:

```mermaid
flowchart LR
    PM["Saved card<br/>pm_abc123"]
    PM -->|"has a reference for"| S["Stripe<br/>✅ cus_xxx / pm_yyy"]
    PM -.->|"has no reference for"| A["Second gateway<br/>❓ never heard of this card"]

    style S fill:#e8f5e9,stroke:#2e7d32,color:#000
    style A fill:#ffe5e5,stroke:#c00,color:#000
```

The reference Stripe gave us means nothing to any other gateway. So when the retry
fires, here is what actually has to be true:

```mermaid
flowchart TD
    F["Charge fails on Gateway A"] --> R{"Is the failure retriable?"}
    R -->|"Hard decline"| STOP1["Stop. No retry."]
    R -->|"Retriable"| U{"Does the retry need the customer to authenticate again?"}
    U -->|"Yes"| STOP2["Stop. Their own docs say<br/>retries are not possible here."]
    U -->|"No"| K{"Is this card usable<br/>on Gateway B?"}

    K -->|"Registered with B up front"| OK["✅ Retry works"]
    K -->|"Replay the real card number"| PAN["⚠️ Heavy compliance burden.<br/>And their issue 12711 — for some<br/>gateways Hyperswitch discards the<br/>card number at exactly this moment."]
    K -->|"Network token"| NT["✅ Clean — if we and both<br/>gateways support it"]
    K -->|"None of the above"| STOP3["❌ Cannot retry.<br/>Gateway B has never<br/>seen this card."]

    style STOP1 fill:#ffe5e5,stroke:#c00,color:#000
    style STOP2 fill:#ffe5e5,stroke:#c00,color:#000
    style STOP3 fill:#ffe5e5,stroke:#c00,color:#000
    style PAN fill:#fff6d5,stroke:#b8860b,color:#000
    style OK fill:#e8f5e9,stroke:#2e7d32,color:#000
    style NT fill:#e8f5e9,stroke:#2e7d32,color:#000
```

**Cross-gateway retry is real, but it is not free and it is not universal.**

---

## The two-of-everything problem

Adopting Hyperswitch means running a second copy of things we have already built.

| Capability | Hyperswitch has it | We have it | Result |
|---|:---:|:---:|---|
| Deciding which gateway to use | ✅ | ✅ | Duplicate |
| Retrying a failed payment | ✅ | ✅ | **Duplicate — dangerous** |
| Checking payments actually landed | ✅ | ✅ | Duplicate |
| Customer records | ✅ | ✅ | Duplicate |
| Subscriptions and invoices | ✅ | ✅ | Duplicate |
| Cost and approval reporting | ✅ | ~ | Overlap |
| **Holding card numbers portably** | ✅ | ❌ | **Genuinely new** |
| **Routing by cost or approval rate** | ✅ | ❌ | **Genuinely new** |
| **Selective 3D Secure** | ✅ | ❌ | **Genuinely new** |
| **~100 gateways pre-integrated** | ✅ | ❌ | **New, if we need breadth** |

### Why the duplicate retry is the scary one

Neither system knows the other exists.

```mermaid
sequenceDiagram
    autonumber
    participant B as Our retry schedule
    participant H as Hyperswitch retry
    participant G1 as Gateway A
    participant G2 as Gateway B
    participant C as Customer

    B->>H: Charge invoice 42
    H->>G1: Charge
    G1-->>H: Temporary failure
    Note over H: Cascading retry fires
    H->>G2: Charge
    G2-->>C: 💳 Charged
    Note over H,G1: ...but G1's approval<br/>arrives late
    G1-->>C: 💳 Charged again
    G1-->>H: Approved
    H-->>B: Which one won?
    Note over B: Our schedule already<br/>gave up and retried too
```

Both systems behaved exactly as designed. The customer was charged twice.

---

## One more hop, everywhere

```mermaid
flowchart LR
    subgraph now["Today"]
        G1["Gateway"] -->|"webhook"| B1["Us"]
    end
    subgraph after["With Hyperswitch"]
        G2["Gateway"] -->|"webhook"| H["Hyperswitch"] -->|"webhook"| B2["Us"]
    end

    style H fill:#fff6d5,stroke:#b8860b,color:#000
```

One more place a message can be delayed, duplicated or lost. One more signature to
verify. And our records now carry Hyperswitch's identifiers while the *money*
settled against the gateway's — so proving a customer paid means joining across both.

---

## Scorecard

| | Direct gateways | Hyperswitch |
|---|---|---|
| Cost to add gateway #4 | A few hundred lines of code | A form — *if* a connector exists |
| Cost to add M-Pesa | Write it ourselves | Write it in someone else's Rust, or wait |
| Things we operate | Nothing extra | Service, DB, Redis, vault, monitoring |
| Single point of failure | The gateway | The gateway **and** Hyperswitch |
| Card portability | ❌ Locked to Stripe | ✅ The main prize |
| Smart routing | ❌ | ✅ |
| Failover between gateways | ❌ | ⚠️ Conditional |
| Records match the money | ✅ By construction | ⚠️ Needs a join |
| Duplicate retry risk | ✅ None | ❌ Real |
| Africa | ✅ We build it | ❌ Nothing there |
| Fix a broken gateway integration | Our codebase | Their codebase, their timeline |

---

## If we ever do adopt it

Adopt it *narrowly*. This is the shape that keeps the prize and drops most of the risk.

```mermaid
flowchart TD
    A["Use it for cards only"] --> B["Pin each config to ONE gateway<br/>so routing never surprises us"]
    B --> C["Turn their retries OFF.<br/>Keep ours."]
    C --> D["Store the underlying gateway's<br/>identifier alongside theirs"]
    D --> E["Treat it as a card vault that can route —<br/>not a router that holds cards"]

    style E fill:#e8f5e9,stroke:#2e7d32,color:#000
```

---

## The sequence I'd suggest

```mermaid
flowchart LR
    N["NOW<br/>Integrate one gateway<br/>that actually covers Africa.<br/>Flutterwave for reach,<br/>Paystack for API quality."]
    L["LATER<br/>Revisit Hyperswitch when<br/>card portability is the<br/>binding constraint"]
    M["MAYBE<br/>Adopt narrowly,<br/>cards only"]

    N --> L --> M
```

> **The trap to avoid:** adopting it *because* it has a hundred connectors, and then
> discovering that the two we need are the two that don't work.

---

## A footnote on Africa that no orchestrator changes

Mobile money is not a card. The customer approves each payment on their phone by
entering a PIN. There is no silent month-end pull — not through Hyperswitch, not
through anyone.

```mermaid
flowchart LR
    subgraph card["Card markets"]
        direction TB
        C1["Customer saves card once"] --> C2["We pull whatever they owe,<br/>whenever we like"]
    end
    subgraph mm["Mobile money markets"]
        direction TB
        M1["Customer tops up a balance<br/>— approving each time"] --> M2["Their bill draws down<br/>from that balance"]
    end

    style mm fill:#fff6d5,stroke:#b8860b,color:#000
```

Whatever we build for Africa, it will be top-up-in-advance. That is a different
shape of billing, and choosing Hyperswitch or not does not affect it at all.
