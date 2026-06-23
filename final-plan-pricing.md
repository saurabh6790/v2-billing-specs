# Plan & Pricing — Final Model

> Synthesis of the implemented catalog ([plans-and-pricing.md](plans-and-pricing.md)) and the
> resource/lifecycle ideas in the rough draft ([plan-pricing.md](plan-pricing.md)), hardened in a
> grilling session. Terms are defined in [CONTEXT.md](CONTEXT.md); two decisions are recorded as
> ADRs ([0001 commitment](docs/adr/0001-commitment-as-team-spend-floor.md),
> [0002 live-priced storage](docs/adr/0002-live-priced-storage-add-ons.md)).
> Where the inputs disagree, this document is the tie-breaker and says why.

## 1. What this reconciles

Two inputs:

- **Implemented model** (`plans-and-pricing.md`) — flat-rate **bundles + add-ons**, a single
  **`Catalog Rate`** DocType holding region × currency rates, and **price-lock** grandfathering
  keyed by `resource_id`. Its hard-won lesson: **a rate change must never fork a new plan.**
- **Rough draft** (`plan-pricing.md`) — a sharper **resource model** (fractional vCPU, memory by
  ratio), **lifecycle states**, a **plan configurator**, and a **Fixed / Metered / Tiered**
  taxonomy. Its bad ideas: **immutable plan *versions* (`micro-vm v1`, `v2`)** — the proliferation
  trap the implemented model already escaped — and an internal contradiction on stopped VMs (§3
  said "charged when stopped," §7 said "stopped → disk only").

**The final model keeps the implemented catalog spine and grafts on the draft's resource and
lifecycle thinking — minus plan versioning, and with the stopped-VM contradiction resolved in
favour of "stopped still bills."**

---

## 2. Core philosophy (kept)

A **hybrid** model:

- **Predictable, flat-rate pricing for core compute** — a VM bundle is one number.
- **Usage-based pricing for variable resources** — snapshots, transfer, IPs, future API meters.

> Simple for the user (one rate + a monthly estimate); precise internally (event-driven, locked
> or live, frozen for billing).

---

## 3. The one word: **rate** (kept)

There is no `price`, no `price_per_unit`, no `quantity_included × price`. The single pricing word
is **rate**.

- **Bundle** → the rate *is* the price. Never summed from priced sub-resources.
- **Add-on** → `rate × quantity`.

The one legitimate multiplier on a bundle is **time**: billing prorates the bundle rate by the
days a resource was alive (`days × rate / days_in_period`, `invoicing.md`). "Flat-rate" means *one
rate for the whole bundle, never decomposed into priced parts* — not *flat per month regardless of
usage*.

---

## 4. Resource model (adopted from the draft — authoring-only)

The draft's resource math is good, but it lives **only in the plan configurator**, never in data
or billing:

- **Fractional CPU** — `1 vCPU = 1000 millicores`; sizes `0.125, 0.25, 0.5, 1, 2, …`.
- **Memory by ratio** — the configurator *pre-fills* memory from vCPU: standard **1:2**,
  high-memory **1:4** (`0.125 vCPU → 0.25 GB`). The ratio is a **default, not a constraint** — an
  admin may override it (e.g. `1 vCPU + 3 GB` off-ratio).

The configurator computes these, then writes **plain `quantity` / `unit`** into `Plan Includes`
(composition, **no price**) — the **schema is unchanged**, and billing never sees millicores or
ratios. The included quantities survive as the **allowance baseline** for grandfathered add-on
overage.

---

## 5. Plan = bundle (kept, with versioning resolved)

A **Plan (bundle)** is a flat-rate sellable with **one immutable identity forever**
(`bundle-2vcpu`), carrying its composition (`includes`, no price) and surfacing its rates from
`Catalog Rate` (§6).

### Versioning — the explicit correction

The draft's immutable **versions** (`micro-vm v1` → `v2`) are **rejected** — they are the v1
mistake (a rate bump forks a plan → catalog doubling → sync storm). We separate:

| Change | What it is | Mechanism | New plan identity? |
|--------|-----------|-----------|--------------------|
| **Rate change** | same resources, different price | edit / add a **`Catalog Rate`** document | **No** |
| **Region / currency** | same resources, new market | a new **`Catalog Rate`** document | **No** |
| **Composition change** | genuinely different resources (2→4 vCPU) | a **distinct bundle** (`bundle-4vcpu`) | A different *product*, not a *version* |

Immutability is preserved **by price-lock** (§9), not by versioned plans.

### Commitment (`billing_cycle = annual`) — see [ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md)

Frappe Cloud lives on recurring revenue, so a customer can trade a **term** for a better rate.
There is no lock-in by default; commitment is opt-in. It is modelled as a **team-level fixed-bundle
spend floor**, *not* a prepaid plan and *not* a resource lock:

- **Floor + term** — the team commits to ≥ ₹*floor*/month of **fixed bundle spend** for *N* months.
- **Monthly-in-arrears, discounted** — the discount applies to each monthly invoice; **no upfront
  prepaid bill** (that would need the banned pro-rata proration — `invoicing.md`).
- **Resource-agnostic** — upgrades, downgrades, and swaps are free as long as committed bundle
  spend stays at/above the floor. Metered usage and one-off add-ons bill at list and never count
  toward the floor or receive the discount.
- **Decoupled from price-lock** — commitment is about a *discount for a term*; price-lock is about
  *which rate applies*. They never touch.
- **Clawback on breach** — drop below the floor before term-end and the final invoice repays only
  the discount enjoyed on consumed months (`Σ months · (list − discounted)`). Never a fee for
  unrendered service.

Requires a **team-level fixed-bundle spend rollup** per month to test the floor, apply the
discount, and compute clawback.

---

## 5.1 Product families — the polymorphic catalog (see [ADR 0007](docs/adr/0007-polymorphic-catalog-category-masters.md))

The catalog was born VM-shaped: a plan's *kind* lived in frozen `Select` enums
(`plan_class`, `resource_type`). New families break that assumption — **AI tokens**
(metered and/or bundled), **SaaS storage** (disk-only, Dropbox-style), **Frappe Box
remote storage** (data / backups / snapshots). The §5 principle — *flexible by documents,
never by enums* — says the taxonomy itself must be data. So the kind-of-thing axis moves
into **masters**:

- **`Plan Category`** (behavioral, self-describing) — the product family. Not a label; it
  carries the family's rules **and its own vocabulary** so authoring and billing-data
  collection explain themselves:
  - `allowed_resource_types` — which `Resource Type`s a member plan may include (a Tokens
    plan cannot accidentally include Disk).
  - `default_billing_type` (Fixed / Metered / Tiered) and `default_pricing_mode`
    (Grandfathered / Live).
  - `billable_unit` — the human-readable thing billing counts (`vCPU bundle / mo`,
    `1M tokens`, `GB-day`). **This is the answer to "what do we collect to bill this?"**
  - `meter_kind` — `none (flat)` / `counter` / `gauge`, wiring into [metering.md](metering.md).
  - `sub_category_label` — what a sub-category *means* here ("Optimization profile",
    "Storage purpose"); blank ⇒ the family has no sub-category axis.
  - `configurator_builder` (`vm_rungs` | `simple`) and a one-line `description`.
- **`Plan Sub-Category`** (**optional**) — a variant within a family, `Link`ing to its
  Category. Used **only where a real variant axis exists** — it **replaces the mandatory,
  VM-only `plan_class`**. A family with no natural variant (AI Tokens, flat SaaS Storage)
  has **no sub-category**; the plan sits directly under its Category and the UI never
  forces one. Where a family *does* use them, a "Custom" run mints the Sub-Category first,
  then the plans + rates.
- **`Resource Type`** (master) — `Compute, Memory, Disk, Transfer, Tokens, Storage,
  Backup`. `Plan Includes.resource_type` and `Add-on.resource_type` become
  `Link → Resource Type`. **`IP` and `Snapshot` leave the core set**: `IP` is an add-on,
  `Snapshot`/`Storage` is a live-priced add-on *or* the primary product of the
  `Remote Storage` family (Frappe Box). They were never composition primitives like
  Compute/Memory/Disk — they are billed independently of any bundle.

**The families, concretely** (this table is the contract — note AI Tokens has *no*
sub-categories by default):

| Category | Sub-Category (`sub_category_label`) | Resource type(s) | Billing type | `billable_unit` | `meter_kind` | Builder |
|----------|------------------------------------|------------------|--------------|-----------------|-------------|---------|
| **VM Plans** | Optimization profile — General / CPU / Memory / Storage Opt. | Compute, Memory, Disk, Transfer | Fixed | vCPU bundle / mo | none (flat) | `vm_rungs` |
| **AI Tokens** | *(none by default; optional "Packaging": PAYG / Token Pack)* | Tokens | Metered (allowance + overage) | 1M tokens | counter | `simple` |
| **SaaS Storage** | *(none; optional by suite)* | Disk | Fixed *or* Metered | GB / mo *or* GB-day | gauge | `simple` |
| **Remote Storage** (Frappe Box) | Storage purpose — Data / Backups / Snapshots | Storage, Backup | Metered, live-priced | GB-day | gauge | `simple` |

**What does not change:** `Catalog Rate`, price-lock/grandfathering, the metered formula
`max(0, qty − allowance) × rate`, gauge integration, commitment, and invoicing are all
untouched. AI tokens "metered or bundled or both" *is* the existing allowance+overage path
with `Resource Type = Tokens`. The redesign is contained to the **taxonomy** and the
**configurator** (§11) — never the engine that prices, locks, or bills.

---

## 6. Catalog Rate — one standalone DocType (kept)

Rates are **not** child tables. Following ERPNext's `Item Price`, every rate is a row in **one**
standalone DocType — **`Catalog Rate`** — shared by Plan and Add-on through a **Dynamic Link**.

| Field | Type | Notes |
|-------|------|-------|
| priced_doctype | Link → DocType | `Plan` or `Add-on` |
| priced_for | Dynamic Link | the specific `bundle-2vcpu` / `addon-snapshot` |
| cluster | Data | **blank = global default**; else region key (`ap-south-1`) |
| currency | Link → Currency | INR, USD, … |
| rate | Long Int | **Rate units** (minor × 10⁶), never a float — bundle = flat rate; add-on = per-unit rate. See [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md) |

**Resolution** for `(plan-or-addon, team currency, resource cluster)`: query by
`priced_doctype + priced_for + currency`, prefer the row whose `cluster` matches the resource's
region, else fall back to the blank-cluster (global) row.

A team has **one billing currency**; the **cluster** comes from where the resource runs. **One
plan identity covers every currency and region** — adding a market is a new *document*, never a
new plan and never a new column.

---

## 7. Lifecycle billing: alive vs terminated (reconciled)

The draft wanted state-dependent billing (running / stopped / terminated). After grilling, **only
two states matter for pricing** — the running/stopped split is *operational*
([subscriptions.md](subscriptions.md)), not *billing*:

| Billing state | Operational states | What is billed |
|---------------|--------------------|----------------|
| **Alive** | `running` **or** `stopped` | full **bundle rate**, time-prorated by days alive |
| **Terminated** | `terminated` | nothing — the bundle's price-lock closes; only retained **snapshots** keep billing (§8) |

**A stopped VM still bills the full bundle** — its resources stay reserved (DigitalOcean model,
*not* AWS "stopped = pay only for storage"). This resolves the draft's internal contradiction and
means:

- No "disk-retention rate," no mandatory disk add-on, no second rate on the lock. (The earlier
  synthesis invented these; they are deleted.)
- The billing engine needs **no stop/start events** — it already segments the event log on plan
  changes and closes the lock on terminate (`invoicing.md:42`). Stopping changes nothing on the
  invoice.

---

## 8. Snapshots & metered add-ons — see [ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md)

Snapshots and other variable resources are **add-ons**, billed independently of the VM lifecycle.
Add-ons come in two pricing modes:

- **Grandfathered** (default) — rate + allowance **locked at provision**, like bundles
  (transfer overage, IPs, extra disk).
- **Live-priced** — rate read from the **current** `Catalog Rate` **each billing period**, *not*
  locked. The deliberate exception to grandfathering, for **depreciating storage** where a locked
  rate would strand a customer on a stale-high price.

**Snapshot** is the first live-priced add-on:

- **Own `resource_id` from birth** — not a meter on the VM, so it **survives VM termination**,
  then owned by the team.
- **Live rate, no allowance** → `bill = GB-days × live_rate`.
- Metered as a **gauge** (integral over time = GB-days); see [metering.md](metering.md).

Other metered add-ons keep the standard formula **`max(0, quantity − locked_allowance) ×
locked_rate`**. **Edge aggregation** stands: the cluster manager rolls usage up at the edge and
exposes only the aggregate, which Central records; Central never stores raw samples (this is what
keeps v2 off v1's 10M-records path). ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md) — no Agent.)

---

## 9. Price-lock & grandfathering (kept — grandfathering only)

Price-lock's **sole job is grandfathering**: freeze the rate a specific provisioned resource was
shown, so a later catalog rate rise affects only *new* provisions. It is **not** a commitment
mechanism (§5).

Pricing has **three roles, one number**:

1. **Read live at purchase** — the regional UI shows the resolved rate for currency + cluster.
2. **Locked at provision** — Central resolves the **shown rate**, provisions via the cluster manager,
   and writes an append-only price-lock row + `subscribed` event with `resource_id`. **Rate shown = rate locked.**
3. **Frozen for billing** — billing reads the lock forever.

Rules:

- A grandfathered resource keeps its locked rate until **terminated / re-provisioned** — no
  time-based expiry. (Live-priced add-ons, §8, skip step 2 by design.)
- Destroy-then-reprovision is a **different `resource_id`** → a new lock at the then-current rate.
- An admin rate change edits / adds **one `Catalog Rate` document**; existing locks untouched, new
  provisions lock the new rate. **Zero new plans.**
- Escape hatch: bulk "re-lock to current rate" for forced migrations (sunsetting a bundle).

---

## 10. Pricing-type taxonomy (adopted from the draft)

| Type | Used for | Status |
|------|----------|--------|
| **Fixed** | VM bundles | implemented |
| **Metered** | snapshots (live), transfer / IPs (counter / gauge) | implemented |
| **Tiered** | quantity-banded usage (APIs, transfer steps) | **future** |

**Tiered is not "just rows" on `Catalog Rate`.** When it lands it needs:

- an **`up_to` band field** on `Catalog Rate`, with the uniqueness key extended to include the
  band (a schema change, not extra rows of the current shape);
- a **graduated tier-walker** at line-item time (`Σ over bands of band_qty × band_rate` — marginal,
  tax-bracket style), replacing `qty × rate`.

Only **lock / freeze / distribution** are reused unchanged; the rate-resolution and line-item math
are new. Not built until a real tiered need exists.

---

## 11. Plan Configurator — category-aware, pluggable builders ([ADR 0007](docs/adr/0007-polymorphic-catalog-category-masters.md))

The configurator is the **plan builder** for every family, not just VMs. It reads the
chosen Category's `configurator_builder` and dispatches to the matching builder. Two ship:

**`vm_rungs`** — the original VM flow (unchanged), producing a bundle + composition (it does
**not** touch rates beyond seeding them):

1. Pick the memory **ratio** (1:2 or 1:4) — a pre-fill default.
2. Pick **vCPU**.
3. **Auto-fill memory** from the ratio (override allowed).
4. Add **disk** size.
5. Save the bundle identity + `includes` (plain `quantity` / `unit`).
6. Separately, create `Catalog Rate` documents per currency / region.

**`simple`** — a minimal builder covering AI Tokens, SaaS Storage, and Remote Storage:
name + included quantity + `billable_unit` (pre-filled from the Category) + rate(s). No
sizing math; the Category's `allowed_resource_types` constrains the composition.

New rung-style families add a builder only when one is genuinely needed; everything that
fits "an allowance and a rate" uses `simple`. When the chosen family uses sub-categories
and the author picks **Custom**, the configurator mints the new `Plan Sub-Category` first,
then the plans + rates beneath it.

User-facing result: a clear **rate**, a **monthly estimate**, and transparent **add-on
rates** read live from the resolved Catalog Rate — with the Category telling the author (and
the billing pipeline) exactly **what unit is collected**.

### Plan identity: hash key, descriptive title

A **Plan's primary key is an opaque `hash`**, never its title. A human title was a bad
key — it collides, it changes, and using it as the synced identity (Catalog Rate,
Subscription, invoice lines, price-lock all reference the Plan name) makes cluster sync
brittle. The configurator therefore **stops hand-naming plans**: it lets Frappe mint the
hash and writes a derived **`title`** for display, composed as **sub-category (or
category, when the family has none) + resource info** — e.g. `CPU Optimised — 2 vCPU,
4 GB, 80 GB`. Identity and idempotency inside the configurator move from "Plan name ==
rung name" to the rung's **`plan` link** (the hash it produced); re-running prices the
already-linked plans rather than re-creating them. Existing plans keep their current
names — `hash` only governs newly-minted plans, so no rename/migration.

---

## 12. What changed, at a glance

| Topic | `plan-pricing.md` (draft) | `plans-and-pricing.md` (impl) | **Final** |
|-------|---------------------------|-------------------------------|-----------|
| Bundle pricing | flat bundle | flat bundle, one word "rate" | **kept (impl)** |
| Rate change | new plan **version** | new `Catalog Rate` doc | **impl wins — no versions** |
| Region / currency | — | extra `Catalog Rate` docs | **kept (impl)** |
| Resource model | millicores + ratio | composition only | **draft added — authoring-only, no schema change** |
| Stopped VM | self-contradictory | implicit full charge | **alive = full bundle; only terminate stops compute** |
| Annual / commitment | annual discount | `billing_cycle`, undefined | **team spend-floor + clawback ([ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md))** |
| Snapshot | usage-based, outlives VM | grandfathered metered add-on | **own resource_id, live-priced, no allowance ([ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md))** |
| Pricing types | Fixed / Metered / Tiered | Fixed / Metered | **taxonomy adopted; Tiered = future, honestly scoped** |
| Configurator | yes | — | **draft added (authoring-only)** |
| Grandfathering | (not addressed) | price-lock by `resource_id` | **kept — and explicitly *only* grandfathering** |

---

## 13. Future flexibility (deliberately left open)

- **Tiered / graduated pricing** — `up_to` band on `Catalog Rate` + a tier-walker (§10).
- **More live-priced add-ons** — extra block storage and other depreciating storage opt into the
  live mode ([ADR 0002](docs/adr/0002-live-priced-storage-add-ons.md)).
- **More meters** (API calls, request volume) — additive to counter/gauge (§8).
- **`cluster` → `Link → Cluster`** — upgrades in place when a `Cluster` DocType exists.

> **User view:** simple plans with a predictable cost; commit for a term to pay less.
> **System view:** event-driven usage, locked *or* live by add-on type, frozen for billing —
> flexible by *documents*, never by plan proliferation.
