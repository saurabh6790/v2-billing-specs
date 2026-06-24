# Billing Plans & the Plan Configurator — a plain-English guide

This document explains, without technical jargon, three things:

1. **What a "plan" is** and the pieces it's built from.
2. **The Plan Configurator** — the tool that creates plans for you in bulk.
3. **How plans are used in billing** — how a customer sees them, picks one, and gets charged.

It ends with a reference for the **Plans API** (the data endpoints other screens use).

> 📷 **Screenshots:** wherever you see a `📷 [Screenshot: …]` marker, that's a spot to
> drop a screenshot later. The surrounding text describes what the picture should show.

---

## 1. The big picture

Think of the catalogue like a shop.

- A **Plan** is one thing on the shelf with a price tag — for example *"2 vCPU · 4 GB RAM · 40 GB disk, ₹4,000 / month"*.
- Plans are organised into **families** and, inside a family, optional **profiles**.
- Each plan can have **different prices in different regions and currencies**.

Here's how the pieces fit together:

```
┌─────────────────────────────────────────────────────────────┐
│  PLAN CATEGORY  (the family)         e.g. "VM Plans"          │
│  - which resources a plan here may contain (CPU, RAM, disk…)  │
│  - which builder is used to author it (see section 2)         │
│                                                               │
│   ├── PLAN SUB-CATEGORY  (the profile)   e.g. "CPU Optimised" │
│   │     - an optional label inside the family                 │
│   │     - for compute, carries the RAM-per-CPU ratio (1:2)    │
│   │                                                           │
│   └── PLAN  (one sellable bundle)    e.g. "2 vCPU · 4 GB"     │
│         ├── what's inside it:  2 CPU, 4 GB RAM, 40 GB disk    │
│         └── price tags:  ₹4,000/mo in India · $49/mo global   │
└─────────────────────────────────────────────────────────────┘
```

The four building blocks, in plain terms:

| Name | What it really is | Example |
|------|-------------------|---------|
| **Plan Category** | A *family* of products. Decides what kinds of resources a plan may contain and how it's authored. | "VM Plans", "AI Tokens", "Remote Storage" |
| **Plan Sub-Category** | An optional *profile* inside a family. For compute families it also stores the memory ratio. | "CPU Optimised", "Memory Optimised" |
| **Plan** | One actual sellable item, with contents and prices. | "2 vCPU · 4 GB · 40 GB disk" |
| **Catalog Rate** | One price tag for one plan, in one region + currency. | ₹4,000 / month, India |

> 📷 [Screenshot: the Plan list view in the Billing module, showing a few generated plans]

---

## 2. What's inside a single Plan

Open any plan and you'll see:

- **Title** — the human name you read, e.g. *"CPU Optimised — 2 vCPU · 4 GB"*.
- **A short ID** — a computer-generated code (a hash). This is the plan's *real* name behind the scenes, so you can rename the title any time and nothing breaks.
- **Category** and **Sub-Category** — the family and profile it belongs to.
- **Billing cycle** — *Monthly* or *Annual* (annual plans can carry a discount percentage).
- **Active?** — only active plans are offered to customers.
- **What's included** — a simple list of resources and amounts: *2 Compute (vCPU), 4 Memory (GB), 40 Disk (GB)*. No hidden maths; just quantities.
- **Prices** — one or more **Catalog Rates** (see below).

> 📷 [Screenshot: a single Plan form, showing Title, Category/Sub-Category, the
> "Includes" table, and the billing cycle]

### How prices work (Catalog Rate)

A plan doesn't have a single price — it has a small list of price tags. Each tag says:

> *"In **this region**, in **this currency**, the price is **this much**."*

When billing needs the price for a customer, it picks the tag like this:

```
Need a price for: currency = INR, region = ap-south-1 (Mumbai)

1. Is there a tag for INR + Mumbai?      → use it.        ("regional price")
2. Otherwise, is there a tag for INR     → use it.        ("global price")
   with no region (the default)?
3. Otherwise → this plan isn't sold in INR. Hide it.
```

So a region-specific tag overrides the global one, and a plan with **no** matching tag in the customer's currency simply isn't offered to them.

> 💡 Amounts are stored in the smallest unit of the currency (paise for INR, cents
> for USD) to avoid rounding errors. Screens convert back to ₹/$ for display.

---

## 3. The Plan Configurator — making plans in bulk

### The problem it solves

Cloud providers don't sell one server size — they sell a *ladder* of them (1 vCPU, 2 vCPU, 4 vCPU, …), each roughly double the last, each priced proportionally. Creating eight near-identical plans by hand is tedious and error-prone.

The **Plan Configurator** is a reusable template. You describe the ladder once, press a button, and it generates all the plans and their prices for you.

> 📷 [Screenshot: the Plan Configurator form, top section — Template Name, Category,
> Builder, Sub-Category]

### Two ways to author: the "Builder"

The configurator works differently depending on the **family** you pick. Each family declares which **builder** it uses, and the configurator adapts automatically:

| Builder | Used for | How you author plans |
|---------|----------|----------------------|
| **VM Rungs** | Compute families (VM Plans) | Describe a doubling ladder of sizes; it generates one plan per rung. |
| **Simple** | Token / storage families (AI Tokens, SaaS Storage, Remote Storage) | List the plans row by row — a name, a quantity, a price multiplier. |

You don't choose the builder directly — it's decided by the **Category** you select, and shown to you as read-only.

---

### 3a. The "VM Rungs" builder (the size ladder)

You fill in a few inputs:

- **Sub-Category (profile)** — e.g. *CPU Optimised*. This auto-fills the memory ratio.
- **Start size** and **Ceiling size** — the smallest and largest rung, in vCPU.
- **Memory ratio** — GB of RAM per vCPU (e.g. 1:2 means 2 GB per vCPU). Filled in for you from the profile; editable.
- **Base disk / base transfer / transfer step** — optional storage and data-transfer amounts.
- **Base price** — the price of the *smallest* rung, per currency.

Then press **Populate Rungs**. The configurator builds the ladder by doubling:

```
START 1 vCPU ──×2──▶ 2 vCPU ──×2──▶ 4 vCPU ──×2──▶ 8 vCPU  CEILING
  2 GB RAM           4 GB             8 GB            16 GB     (ratio 1:2)
  ₹1,000             ₹2,000           ₹4,000          ₹8,000    (base × size)
```

The rules it follows:

- **RAM** = vCPU × the memory ratio.
- **Disk** grows with the size (twice the size → twice the disk).
- **Transfer** steps up by a fixed amount each rung (real transfer tiers aren't a clean double, so this is additive).
- **Price** = base price × how many times bigger the rung is than the start.

Everything it generates is **editable**. You can change any rung, add an odd in-between size by hand (say a 1 vCPU / 3 GB), or tweak one rung's transfer — before you generate anything.

> 📷 [Screenshot: the Sizing inputs filled in, plus the Rungs table after "Populate Rungs"]

**Preview Pricing** shows the whole ladder with prices in every currency, without saving anything — a sanity check before you commit.

> 📷 [Screenshot: the "Pricing Preview" dialog with a table of sizes and prices]

---

### 3b. The "Simple" builder (row by row)

Some families aren't sizes on a ladder — they're a short list of named products (e.g. *"10M tokens"*, *"100M tokens"*). For these, you just fill a table:

- a **title**,
- the family's **resource type** (e.g. Tokens),
- the **quantity** included,
- a **price multiplier** (price = base price × multiplier).

No ladder maths — what you type is what you get.

> 📷 [Screenshot: the Simple builder's "Plans" table with a couple of token plans]

---

### 3c. Generating the plans

When you're happy, press **Generate Plans**. A dialog asks:

- **Which region** (cluster) to price for — blank means "global / every region".
- **Which currencies** to price in.
- **Which of the listed plans** to actually create.

It then runs in the background and:

1. Creates one **Plan** per selected rung/row (with its included resources).
2. Adds the **Catalog Rates** for the region and currencies you chose.
3. Tells you how many were created vs skipped when it finishes.

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

Two things worth knowing:

- **It's safe to re-run.** A plan that was already generated is *skipped*, not duplicated. Only its prices for the new region are added.
- **Re-price as you grow.** When a new region comes online, open the same template and run **Generate Plans** again with that region selected — it reuses the existing plans and just adds the new region's prices.

> 📷 [Screenshot: the "Generate Plans" dialog — cluster field, currency checkboxes, plan checkboxes]

---

## 4. How plans are used in billing

This is the journey from "a plan exists" to "the customer is charged".

```
  ┌─ Customer opens "New Server" in the dashboard
  │
  ▼
  Dashboard asks the billing system: "what can THIS team buy in THIS region?"
  │        (the get_eligible_plans API — see section 5)
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
  │                            (later catalogue price changes won't affect them)
  ▼
  The server runs
  │
  ▼
  Each month, the invoice charges the LOCKED price
```

A few of these ideas in plain terms:

- **Spending headroom.** Every team has a spending cap based on its trust level. The menu only shows plans whose price still fits within *cap minus what they're already spending*. A team on a ₹4,000 cap already running ₹1,000 of servers only sees plans priced ₹3,000 or less.

- **Grouped by profile.** On the "New Server" screen, plans are grouped into tabs by their sub-category (CPU Optimised, Memory Optimised, …), cheapest first. Plans with no profile fall under a "General" tab.

- **Price lock = price protection.** When a customer provisions, the price they see is *frozen* for them. If you later raise the catalogue price, existing customers keep their old price; only new provisions get the new one. (This is why changing a Catalog Rate never disturbs anyone already running.)

> 📷 [Screenshot: the customer "New Server" page showing plan tabs and plan cards with prices]

---

## 5. The Plans API (reference)

These are the data endpoints screens call. Two audiences: **customers** (their own team) and **operators/admins** (the whole catalogue).

### 5a. Customer — what can this team buy?

**`central.billing.api.dashboard.catalog.get_eligible_plans`**

The menu of plans a team can actually provision in a region. Already filtered by currency, region availability, trust-level allow-lists, and remaining spending headroom.

**Inputs**

| Input | Meaning |
|-------|---------|
| `cluster` | The region the customer is provisioning in (e.g. `ap-south-1`). |
| `team` | The team being priced (defaults to the signed-in team). |

**Output (shape)**

```jsonc
{
  // header — explains the menu the customer is seeing
  "team": "team-acme",
  "cluster": "ap-south-1",
  "currency": "INR",
  "tier": "t1",              // the team's trust level
  "max_spend": 6000,         // their spending cap
  "current_spend": 1000,     // what they already run
  "available": 5000,         // remaining headroom — plans must fit under this

  // the menu, grouped into tabs by profile, cheapest first within each
  "plans": {
    "General": [
      {
        "plan": "a1b2c3d4",          // the plan's short ID
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

Notes:
- If the region is **not allowed** for the team, `plans` comes back empty.
- A plan is included only if **all** of these hold: it's active, the trust level admits it, it's priced in the team's currency for that region, and its price fits the remaining headroom.

### 5b. Operator — the whole catalogue

**`central.billing.api.admin.catalog.get_catalog`**
Lists every plan (with its India base price and how many servers are currently running it), every add-on, and the regions teams are running in. Operator-only.

**`central.billing.api.admin.catalog.update_plan_rate`**
Change a plan's price.

| Input | Meaning |
|-------|---------|
| `plan` | The plan's ID. |
| `currency` | Currency to set the price in. |
| `rate` | The new price. |
| `cluster` | Region (blank = the global/default price). |

> Important: changing a price here **does not** create new plans and **does not**
> touch anyone already running — existing customers keep their locked price; only
> new provisions pick up the new one.

---

## 6. Quick glossary

| Term you'll see | Plain meaning |
|-----------------|---------------|
| **Plan** | One sellable item with contents and a price. |
| **Category / family** | A group of plans of the same kind (compute, tokens, storage). |
| **Sub-Category / profile** | An optional label inside a family; for compute it sets the RAM-to-CPU ratio. |
| **Catalog Rate** | One price tag (region + currency + amount) for one plan. |
| **Configurator** | A reusable template that generates many plans at once. |
| **Builder** | How a family is authored — a size *ladder* (VM Rungs) or a *list* (Simple). |
| **Rung** | One step on the size ladder (one generated plan). |
| **Cluster / region** | A data-centre location (e.g. Mumbai). Plans can be priced per region. |
| **Price lock** | The frozen price a customer keeps after they provision. |
| **Headroom** | How much a team can still spend under its cap. |
| **Trust level / tier** | A team's standing, which sets its spending cap and which plans it may buy. |
```
