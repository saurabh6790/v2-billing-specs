# Bundles and the Resource Picker — how it fits together

> A plain-language tour of the architecture behind "pick a ready-made size, **or** build your
> own." This is the *shape* of the system, not a field-by-field spec — for the decisions and the
> data model, see [ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md)
> and [final-plan-pricing.md §5.2](final-plan-pricing.md); for the customer-facing catalog story,
> see [plan-writeup.md](plan-writeup.md).

---

## 1. Two ways to buy the same thing

A customer who needs a server can get one in two ways:

```
   ┌─────────────────────────┐         ┌──────────────────────────────┐
   │  PICK A BUNDLE           │         │  BUILD YOUR OWN               │
   │  (a curated preset)      │   OR    │  (the resource picker/slider) │
   │                          │         │                               │
   │  "2 vCPU · 4 GB · 40 GB" │         │  drag vCPU / RAM / disk        │
   │  one flat price          │         │  to the exact size you need   │
   └─────────────────────────┘         └──────────────────────────────┘
                  │                                    │
                  └──────────────┬─────────────────────┘
                                 ▼
                    the same server, the same bill pipeline
```

Both end at the same place — a running server and a monthly invoice. The only thing that differs
is **how the price is worked out**, and that difference is the whole architecture.

- A **bundle** has a single price someone set by hand (and it can be a *discount* — cheaper than
  building the same thing yourself). That's the reward for taking a ready-made size.
- A **built-your-own config** has no hand-set price. Its price is **added up from its parts**.

---

## 2. The one new idea: a price per part

Today the catalog only knew how to price *whole servers*. To price an arbitrary custom shape, we
add one thing: a **rate card** — a price for each raw ingredient.

```
        THE RATE CARD
   ┌───────────────────────────┐
   │  1 vCPU     →  $1 / month  │
   │  1 GB RAM   →  $1 / month  │
   │  1 GB disk  →  $0.50 / mo  │
   └───────────────────────────┘
```

Architecturally, the important move is that **the rate card is not a new system** — it lives in
the exact same place as every other price tag (the `Catalog Rate` store). Before, a price tag was
always attached to a *plan*; now a price tag can also be attached to a *resource type* (vCPU, RAM,
disk). Same store, same "different price per region and currency" rules, same code that looks a
price up. We just taught it to price ingredients, not only finished dishes.

A custom config's price is then simply:

```
   2 vCPU  × $1.00   =  $2.00
   4 GB    × $1.00   =  $4.00
  40 GB    × $0.50   = $20.00
  ──────────────────────────────
                       $26.00 / month
```

A bundle could sell the *same* shape for $22 — that gap is the bundle discount, and you only keep
it while you stay exactly on the bundle.

---

## 3. The picker can't build a nonsense machine

If the picker let you drag every slider freely, you could ask for *3 vCPU and 1 GB of RAM* — not a
real machine. So the picker is **constrained by a profile**.

A **profile** (General, CPU-optimised, memory-optimised…) carries two things:

- a **ratio** — how much RAM goes with each vCPU (1:2, 1:4…), and
- **bounds** — the smallest/largest sizes allowed.

```
   Profile: General  (RAM = vCPU × 2)

   vCPU   ●───────────────   2        ← you drag this
   RAM    (locked to ratio)  4 GB     ← follows automatically
   Disk   ●──────────        40 GB    ← its own slider, within limits

   Estimate:  $26.00 / mo             ← recomputed on every drag
```

So you drag **vCPU**, and **RAM moves with it** — an off-ratio shape is simply not expressible.
Disk is independent but bounded. This is why the design "can't be 3 vCPU and 1 GB RAM": the UI
won't let you, and the server double-checks the same rules when you actually buy.

There's one more invisible wall: the slider **stops at your spending limit**. You can't drag into a
config you're not allowed to afford.

---

## 4. Where does a custom config *live*?

This is the key architectural decision. A custom config is **not** turned into a new catalog item.

```
   BUNDLES                              A CUSTOMER'S SERVER
   (a few, on the shelf)               (their subscription)
   ┌──────────────────┐                ┌───────────────────────────────┐
   │ Small  2·4·40    │   pick ───────▶│ this server is:               │
   │ Medium 4·8·80    │                │   2 vCPU, 4 GB, 40 GB          │
   │ Large  8·16·160  │                │   + the prices locked in       │
   └──────────────────┘                │     when it was created        │
                                       └───────────────────────────────┘
        build-your-own ────────────────────────▲
        (never added to the shelf)
```

If every custom config became a catalog item, the shelf would fill with millions of one-off
entries — the exact mess we spent the original design avoiding. Instead:

- **Bundles stay on the shelf** as a small, curated set.
- **A custom config is written onto the customer's own subscription** — "*this* server is 2 vCPU, 4
  GB, 40 GB, at *these* locked prices." Nothing new is added to the catalog.

The subscription becomes the record of *what this customer actually runs*, whether they picked a
bundle or built their own.

---

## 5. How it reaches the bill

Once a server exists, billing doesn't care how it was chosen — it reads the subscription.

```
   buy (bundle or custom)
          │
          ▼
   LOCK the price  ──────────  freeze today's price for this server
   │                            • bundle → the one flat price
   │                            • custom → the ingredients are summed into ONE
   │                                       whole-config price, and that is locked
   ▼
   server runs…
          │
          ▼
   each month, the invoice charges the locked price — ONE line either way
          • bundle → one line at the bundle's flat rate
          • custom → one line at the locked config rate
                     (the size is shown as the line's label, so the bill still
                      says exactly what the server is)
```

"Lock the price" is the existing **price-lock** mechanism — it already froze a bundle's price so a
later catalog change wouldn't disturb a running customer. A custom config is summed into a single
whole-config price at purchase, and *that* one number is locked (not each ingredient separately).
Everything downstream (the monthly invoice run, proration for partial months, taxes, credits) is
unchanged — a custom config bills exactly like a bundle: one locked line. (The lock itself is no
longer a separate record — it is the subscription's change row; see
[ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md).)

---

## 6. Resizing is the same picker, run again

Upgrading or downgrading isn't a separate feature. The customer opens the **same picker** on a
running server and drags.

```
   running:  2 vCPU · 4 GB · 40 GB        ($26/mo)
       │  drag to…
       ▼
   new:      4 vCPU · 8 GB · 80 GB        (re-priced at today's rate card)
```

Under the hood this reuses the existing "**the plan changed**" event: the old size stops, the new
size starts, and the month's bill is split between them. Two things worth knowing:

- A resize is **re-priced at today's rate card**, not the price you first locked in. The part you
  *don't* change keeps its price; the change gets current rates.
- **Sliding off a bundle turns it into a custom config** — and you lose the bundle discount at that
  moment. Picking a bundle again does the reverse. Both are just "the plan changed" with the bill
  split cleanly across the switch.

---

## 7. The whole picture on one page

```
        ┌──────────────────────────────────────────────────────────────┐
        │                         THE CATALOG                            │
        │                                                                │
        │   a few BUNDLES (flat price, maybe discounted)                 │
        │   a RATE CARD  (price per vCPU / GB RAM / GB disk)             │
        │   PROFILES     (ratio + size limits that keep shapes sane)     │
        └──────────────────────────────────────────────────────────────┘
                  │                                  │
        pick a bundle                       build your own (picker)
                  │                                  │
                  ▼                                  ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                   THE CUSTOMER'S SUBSCRIPTION                  │
        │   records what this server actually is + the locked prices     │
        └──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                   THE BILLING PIPELINE (unchanged)            │
        │   lock → run → monthly invoice → tax → credits → pay           │
        │   bundle = one line · custom = one line at the locked config rate│
        └──────────────────────────────────────────────────────────────┘
```

The design in one sentence: **we added a price-per-ingredient rate card and a picker that builds
sane shapes from it, recorded the result on the customer's subscription instead of the catalog, and
let the existing billing pipeline charge it — with bundles still on the shelf for anyone who just
wants a sensible default.**
