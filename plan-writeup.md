# The Billing Catalog — how plans, pricing, and the configurator work

This writeup explains the catalog model we use to describe everything Frappe Cloud sells:
what a plan is, how the new family-based taxonomy works, how the Plan Configurator builds
plans in bulk, and how a plan reaches a customer's bill. It also covers the recent change
that folded add-ons into plans.

> 📷 **Screenshots:** wherever you see a `📷 [Screenshot: …]` marker, that's a spot to
> drop a picture later. The text around it describes what the picture should show.

---

## 1. The mental model: a catalog is a shop

- A **Plan** is one thing on the shelf with a price tag — *"2 vCPU · 4 GB RAM · 40 GB
  disk, ₹4,000 / month."*
- Plans are grouped into **families** (compute, tokens, storage…) and, inside a family,
  optional **profiles** (CPU-optimised, memory-optimised…).
- A single plan can carry **different price tags in different regions and currencies**.

```
┌─────────────────────────────────────────────────────────────┐
│  PLAN CATEGORY  (the family)         e.g. "VM Plans"          │
│  - which resources a plan here may contain (CPU, RAM, disk…)  │
│  - how it's billed (flat? metered?) and how it's authored     │
│                                                               │
│   ├── PLAN SUB-CATEGORY  (the profile)   e.g. "CPU Optimised" │
│   │     - an optional label inside the family                 │
│   │     - for compute, carries the RAM-per-CPU ratio (1:2)    │
│   │                                                           │
│   └── PLAN  (one sellable thing)     e.g. "2 vCPU · 4 GB"     │
│         ├── what's inside it:  2 CPU, 4 GB RAM, 40 GB disk    │
│         └── price tags:  ₹4,000/mo in India · $49/mo global   │
└─────────────────────────────────────────────────────────────┘
```

The building blocks, in plain terms:

| Name | What it really is | Example |
|------|-------------------|---------|
| **Plan Category** | A *family* of products. Decides what resources a plan may contain, whether the family is flat-rate or metered, and how it's authored. | "VM Plans", "AI Tokens", "Remote Storage" |
| **Plan Sub-Category** | An optional *profile* inside a family. For compute families it also stores the memory ratio. | "CPU Optimised", "Memory Optimised" |
| **Plan** | One actual sellable item, with contents and prices. | "2 vCPU · 4 GB · 40 GB disk" |
| **Catalog Rate** | One price tag for one plan, in one region + currency. | ₹4,000 / month, India |

> 📷 [Screenshot: the Plan list view in the Billing module, showing a few generated plans]

---

## 2. Families are data, not code

The "what kind of thing is this" axis lives in three **master documents** you can author,
rather than in fixed dropdowns in the code. That's what lets us sell things beyond VMs —
AI tokens, SaaS storage, Frappe Box remote storage — without reopening the billing code for
each one.

- **`Plan Category`** is the product family, and it's self-describing. It carries the
  family's rules so both the authoring UI and the billing pipeline can read it directly:
  - which **resource types** a member plan may include (a Tokens plan can't accidentally
    contain Disk);
  - whether the family is **flat-rate or metered**, and how it's priced;
  - the **unit billing counts** (`vCPU bundle / mo`, `1M tokens`, `GB-day`);
  - which **builder** the configurator uses to author it (see §5).
- **`Plan Sub-Category`** is an *optional* profile, used only where a family has a real
  variant axis. VM Plans have optimisation profiles; AI Tokens have none, and the UI never
  forces a fake one.
- **`Resource Type`** is the master list of billable primitives: `Compute, Memory, Disk,
  Transfer, Tokens, Storage, Backup`.

The four families we ship today:

| Category | Profiles | Resources | Billing | Counts in | Builder |
|----------|----------|-----------|---------|-----------|---------|
| **VM Plans** | General / CPU / Memory / Storage Opt. | Compute, Memory, Disk, Transfer | Flat | vCPU bundle / mo | `vm_rungs` |
| **AI Tokens** | *(none by default)* | Tokens | Metered (allowance + overage) | 1M tokens | `simple` |
| **SaaS Storage** | *(none)* | Disk | Flat *or* metered | GB / mo *or* GB-day | `simple` |
| **Remote Storage** (Frappe Box) | Data / Backups / Snapshots | Storage, Backup | Metered, live-priced | GB-day | `simple` |

The billing engine itself didn't change — the rate spine, price-lock, metered formula, and
invoicing all stayed put. Only the taxonomy moved into data, so adding a new family is
authoring work rather than a code release.

---

## 3. Add-ons are now just plans

We used to have two separate doctypes for "a priced resource": a `Plan` (a flat bundle) and
an `Add-on` (a metered per-unit thing, like transfer overage at ₹0.80/GB). Once families
became data (§2), the two stopped being meaningfully different:

- Both already drew their prices from the same `Catalog Rate`.
- A plan can already contain a *single* resource — which is exactly what an add-on is: one
  resource, one unit, one rate.

So we folded `Add-on` into `Plan`. **An add-on is now a metered, single-resource Plan.**

- The `Add-on` doctype is **removed**, along with every "is it a Plan or an Add-on?" branch
  across catalog, pricing, metering, and invoicing.
- Its billing behaviour moved onto **`Plan Category`**:
  - `billing_type` — **Fixed** (flat per cycle) or **Metered** (per-unit usage);
  - `billing_interval` — the metering cadence: Hourly / Daily / Monthly;
  - `pricing_mode` — **Grandfathered** (bill the rate locked at provision) or **Live**
    (re-price at the current rate each period, for depreciating storage).
- **Metering resolves by resource type.** Instead of "find the Add-on for this resource,"
  it now finds the active metered single-resource Plan whose one include matches that
  resource — same answer, one fewer doctype.
- **One rule to keep it unambiguous:** at most one *active* metered single-resource Plan per
  resource type. If two ever existed for the same resource, the old lookup silently picked
  one; now it's rejected at save time instead.

The migration is **billing-neutral** — every add-on becomes a plan, its rates are repointed,
and a migrated overage bills the exact same amount it did before. The payoff isn't a cheaper
bill; it's one priced entity instead of two, and a single place (`Plan Category`) that says
whether a family is flat or metered.

> 📷 [Screenshot: a Plan Category form showing billing_type / billing_interval / pricing_mode]

---

## 4. Anatomy of a single Plan

Open any plan and you'll find:

- **Title** — the human name, e.g. *"CPU Optimised — 2 vCPU · 4 GB."*
- **A short ID (a hash)** — the plan's real name behind the scenes. Everything that
  references a plan (rates, subscriptions, invoice lines, price-locks) points at this hash,
  so the title is purely for display — rename it any time and nothing downstream breaks.
- **Category** and **Sub-Category** — the family and profile it belongs to. The category is
  what tells billing whether this plan is flat or metered.
- **Billing cycle** — Monthly or Annual (annual plans can carry a discount).
- **Active?** — only active plans are offered to customers.
- **What's included** — a plain list of resources and quantities: *2 Compute (vCPU), 4
  Memory (GB), 40 Disk (GB)*. A **metered** plan (a former add-on) has exactly **one** row
  here — that single resource is what gets metered.
- **Prices** — one or more **Catalog Rates** (next section).

> 📷 [Screenshot: a single Plan form — Title, Category/Sub-Category, the "Includes" table,
> billing cycle]

---

## 5. How prices work (Catalog Rate)

A plan doesn't have *a* price — it has a small stack of price tags. Each one says:

> *"In **this region**, in **this currency**, the price is **this much**."*

When billing needs a price for a customer, it resolves the tag like this:

```
Need a price for: currency = INR, region = ap-south-1 (Mumbai)

1. Is there a tag for INR + Mumbai?      → use it.        ("regional price")
2. Otherwise, a tag for INR with no       → use it.        ("global price")
   region (the default)?
3. Otherwise → this plan isn't sold in INR. Hide it.
```

A region-specific tag overrides the global one, and a plan with **no** matching tag in the
customer's currency simply isn't offered to them. One plan identity covers every currency
and region — opening a new market means adding a price document, never a new plan.

> 💡 Amounts are stored in the smallest unit of the currency (paise, cents) to avoid
> rounding errors. Screens convert back to ₹/$ for display.

---

## 6. The Plan Configurator — making plans in bulk

### The problem it solves

Cloud providers don't sell one server size — they sell a *ladder* of them (1, 2, 4, 8
vCPU…), each roughly double the last, each priced proportionally. Building eight
near-identical plans by hand is tedious and easy to get wrong.

The **Plan Configurator** is a reusable template. You describe the ladder once, press a
button, and it creates every plan and price for you.

> 📷 [Screenshot: the Plan Configurator form — Template Name, Category, Builder, Sub-Category]

### One configurator, two builders

The configurator adapts to the **family** you pick. Each family declares which **builder**
it uses, and the form reshapes itself:

| Builder | Used for | How you author |
|---------|----------|----------------|
| **VM Rungs** | Compute families (VM Plans) | Describe a doubling ladder of sizes; it generates one plan per rung. |
| **Simple** | Token / storage families (AI Tokens, SaaS & Remote Storage) | List the plans row by row — a name, a quantity, a price multiplier. |

You don't pick the builder directly — the **Category** decides it, and it's shown to you
read-only.

### 6a. VM Rungs — the size ladder

You fill in a few inputs — the profile (which auto-fills the memory ratio), the smallest and
largest size, optional disk/transfer, and the **base price of the smallest rung**. Then you
press **Populate Rungs**, and it builds the ladder by doubling:

```
START 1 vCPU ──×2──▶ 2 vCPU ──×2──▶ 4 vCPU ──×2──▶ 8 vCPU  CEILING
  2 GB RAM           4 GB             8 GB            16 GB     (ratio 1:2)
  ₹1,000             ₹2,000           ₹4,000          ₹8,000    (base × size)
```

The rules: **RAM** = vCPU × ratio; **disk** grows with size; **transfer** steps up by a
fixed amount each rung (real transfer tiers aren't a clean double, so it's additive);
**price** = base × how many times bigger the rung is than the start.

Everything it generates is **editable** before you commit — tweak a rung, add an odd
1 vCPU / 3 GB size by hand, adjust one rung's transfer. And **Preview Pricing** shows the
whole ladder in every currency *without saving anything*, as a sanity check.

> 📷 [Screenshot: the Sizing inputs + the Rungs table after "Populate Rungs"]
> 📷 [Screenshot: the "Pricing Preview" dialog]

### 6b. Simple — row by row

Some families aren't a ladder, they're a short list of named products (*"10M tokens,"
"100M tokens"*). For those you fill a table: a **title**, the family's **resource type**,
the **quantity** included, and a **price multiplier**. No ladder maths — what you type is
what you get. This is also the builder that authors a **metered single-resource plan** (a
former add-on): one resource, one rate.

> 📷 [Screenshot: the Simple builder's "Plans" table]

### 6c. Generating

When you're happy, press **Generate Plans**. A dialog asks *which region* (blank = global),
*which currencies*, and *which of the listed plans* to actually create. Then it runs in the
background:

```
   Plan Configurator  (your template)
            │  press "Generate Plans"
            ▼
   ┌──────────────────────────────┐
   │  background job:             │
   │   • make a Plan per rung     │──▶  Plans appear in the catalogue
   │   • attach prices per region │──▶  Catalog Rates attached
   └──────────────────────────────┘
```

Two things that make it easy to live with:

- **It's safe to re-run.** A plan that already exists is *skipped*, not duplicated — the
  configurator tracks plans by the hash it minted, not by name. Only the new region's
  prices get added.
- **Re-price as you grow.** When a new region comes online, open the same template, run
  **Generate Plans** again with that region selected, and it reuses the existing plans and
  just adds the new prices.

> 📷 [Screenshot: the "Generate Plans" dialog — cluster, currency checkboxes, plan checkboxes]

---

## 7. How a plan reaches a customer's bill

The path from "a plan exists" to "the customer is charged":

```
  ┌─ Customer opens "New Server" in the dashboard
  │
  ▼
  Dashboard asks billing: "what can THIS team buy in THIS region?"
  │        (the get_eligible_plans API — see §8)
  │
  │   The list is already filtered to:
  │     • active plans only
  │     • priced in the team's currency for that region
  │     • allowed by the team's trust level
  │     • affordable within the team's remaining spending headroom
  ▼
  Customer picks a plan
  │
  ▼
  A PRICE LOCK is created  ── today's price is frozen for this customer
  │                            (later catalogue changes won't touch them)
  ▼
  The server runs
  │
  ▼
  Each month, the invoice charges the LOCKED price
```

A few of these in plain terms:

- **Spending headroom.** Every team has a cap set by its trust level. The menu only shows
  plans whose price still fits within *cap minus what they already spend*. A team on a
  ₹4,000 cap already running ₹1,000 of servers sees only plans priced ₹3,000 or less.

- **Grouped by profile.** On "New Server," plans are tabbed by sub-category (CPU Optimised,
  Memory Optimised…), cheapest first. Plans with no profile fall under a "General" tab.
  Metered plans (former add-ons) aren't "Server" products, so they never appear here.

- **Price lock = price protection.** The price a customer sees at provision is frozen for
  them. Raise the catalogue price later and existing customers keep their old rate; only new
  provisions get the new one. This is also why a rate change edits a *document* instead of
  forking a plan — change a Catalog Rate and nobody already running is disturbed.

> 📷 [Screenshot: the "New Server" page — plan tabs and plan cards with prices]

---

## 8. Reference — the Plans API

The data endpoints screens call. Two audiences: **customers** (their own team) and
**operators** (the whole catalogue).

### Customer — what can this team buy?

**`central.billing.api.dashboard.catalog.get_eligible_plans`** — the menu of plans a team
can provision in a region, already filtered by currency, region, trust-level allow-lists,
and remaining headroom.

| Input | Meaning |
|-------|---------|
| `cluster` | The region being provisioned in (e.g. `ap-south-1`). |
| `team` | The team being priced (defaults to the signed-in team). |

```jsonc
{
  // header — explains the menu the customer is seeing
  "team": "team-acme",
  "cluster": "ap-south-1",
  "currency": "INR",
  "tier": "t1",              // trust level
  "max_spend": 6000,         // spending cap
  "current_spend": 1000,     // what they already run
  "available": 5000,         // remaining headroom — plans must fit under this

  // the menu, grouped into tabs by profile, cheapest first within each
  "plans": {
    "General": [
      {
        "plan": "a1b2c3d4",          // the plan's short ID (hash)
        "title": "General — 1 vCPU · 4 GB",
        "sub_category": "General",
        "billing_cycle": "Monthly",
        "currency": "INR",
        "cluster": "ap-south-1",
        "rate": 1000,                // resolved price for this region+currency
        "includes": [
          { "resource_type": "Compute", "quantity": 1, "unit": "vCPU" },
          { "resource_type": "Memory",  "quantity": 4, "unit": "GB" }
        ]
      }
    ],
    "CPU Optimised": [ /* … */ ]
  }
}
```

- If the region isn't allowed for the team, `plans` comes back empty.
- A plan is included only if **all** hold: active, admitted by trust level, priced in the
  team's currency for that region, and affordable within remaining headroom.

### Operator — the whole catalogue

**`central.billing.api.admin.catalog.get_catalog`** — lists every plan (with its India base
price and how many servers are running it) and the regions teams are running in.
Operator-only. There's no separate add-on list anymore — metered plans are just plans.

**`central.billing.api.admin.catalog.update_plan_rate`** — change a plan's price.

| Input | Meaning |
|-------|---------|
| `plan` | The plan's ID. |
| `currency` | Currency to price in. |
| `rate` | The new price. |
| `cluster` | Region (blank = global default). |

> Changing a price here does not create plans and does not touch anyone already running —
> existing customers keep their locked price; only new provisions pick up the new one.

---

## 9. Glossary

| Term | Plain meaning |
|------|---------------|
| **Plan** | One sellable item with contents and a price. A *metered* plan with a single resource is what used to be an "add-on." |
| **Category / family** | A group of plans of the same kind (compute, tokens, storage); also says whether the family is flat or metered, and how it's priced. |
| **Sub-Category / profile** | An optional label inside a family; for compute it sets the RAM-to-CPU ratio. |
| **Catalog Rate** | One price tag (region + currency + amount) for one plan. |
| **Configurator** | A reusable template that generates many plans at once. |
| **Builder** | How a family is authored — a size *ladder* (VM Rungs) or a *list* (Simple). |
| **Rung** | One step on the size ladder (one generated plan). |
| **Metered plan** | A single-resource plan billed per unit of usage (transfer, tokens, storage) — the former Add-on. |
| **Grandfathered / Live** | A metered plan bills either the rate locked at provision (Grandfathered) or the current rate each period (Live). |
| **Cluster / region** | A data-centre location (e.g. Mumbai). Plans can be priced per region. |
| **Price lock** | The frozen price a customer keeps after they provision. |
| **Headroom** | How much a team can still spend under its cap. |
| **Trust level / tier** | A team's standing, which sets its spending cap and which plans it may buy. |
