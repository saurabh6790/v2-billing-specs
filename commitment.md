# Commitment

## Purpose

Let a team trade a **term** for a discounted rate by committing to a minimum
monthly **fixed-bundle spend floor** — without prepaying, without binding to a
specific resource, and without punishing a customer for spending *more*.

See [ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md) for the choice
between this model and the rejected alternatives (upfront prepaid annual,
per-resource term lock, remaining-term fee). Terms are defined in
[CONTEXT.md](CONTEXT.md).

## Concepts

- A **Commitment** is a team-level promise to keep monthly **fixed bundle
  spend** at or above a **floor** for a fixed **term** (e.g. 12 months), in
  exchange for a `discount_pct` applied to each monthly-in-arrears invoice.
- **Fixed bundle spend** is the only measure that counts toward the floor:
  metered usage (snapshot, transfer) and one-off add-ons bill at list, are
  never discounted, and never count toward the floor.
- The commitment is **resource-agnostic** — a team may upgrade, downgrade, or
  swap bundles freely. As long as total fixed-bundle spend stays at or above
  the floor, no breach occurs and the discount keeps applying.
- **Decoupled from price-lock** — price-lock decides which rate applies to a
  specific provisioned resource (grandfathering); commitment decides whether a
  *discount on that rate* applies. They share no fields and never interfere.
- A missed floor before term-end is a **breach** and triggers a
  **clawback** — the team repays only the discount it enjoyed on consumed
  months, never a fee for unrendered service.

## Data Model

**Commitment** (one active Commitment per team at a time)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | |
| team | Link → Team | |
| currency | Link → Currency | Copied from the team's billing currency at creation; commitment amounts are in this currency |
| floor | Long Int | **Minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)) — the minimum monthly fixed-bundle spend the team commits to |
| term_months | Int | Commitment term length; `billing_cycle = annual` on a Plan is shorthand for `term_months = 12` |
| discount_pct | Float | Percentage discount applied to fixed-bundle line items when the floor is met; a rate, not money — stays `Float` |
| started_at | Date | First day of the first covered billing period |
| ends_at | Date | `started_at` + `term_months` calendar months; set at creation, never recomputed |
| status | Select | active / completed / breached |
| completed_at | Datetime | Set when status → completed (term elapsed, floor met throughout) |
| breached_at | Datetime | Set when status → breached; cleared when a new Commitment is created |
| breach_reason | Small Text | Human-readable note (e.g. "spend ₹700 < floor ₹800 in Jun 2026") |

Only one Commitment per team may have `status = active` at a time — validated on
save. When an active Commitment is created, any previous `completed` or `breached`
record is left as-is (append-only history of terms).

**Team Fixed-Bundle Spend Rollup** (one row per `(team, billing_period)`)

| Field | Type | Notes |
|-------|------|-------|
| name | Data | `{team}-{billing_period}` (autoname) |
| team | Link → Team | |
| billing_period | Data | `YYYY-MM` — the calendar month this rollup covers |
| currency | Link → Currency | |
| fixed_bundle_spend | Long Int | **Minor units** — sum of all fixed-bundle `Invoice Line Item.amount` for this team × period. Computed once at invoice generation (Draft phase); never updated after the invoice is Open |
| commitment | Link → Commitment | The active Commitment at the time of generation; null if the team had none |
| floor_met | Check | `fixed_bundle_spend ≥ commitment.floor`; false when no commitment |
| discount_applied | Long Int | **Minor units** — total discount given on the invoice for this period (0 when floor not met or no commitment) |

The rollup is created by `generate_draft_invoice` alongside the `Invoice` draft.
It is the sole input to breach detection and clawback computation, so both
operations are based on the same figures the invoice itself used.

## Lifecycle

```
                  team signs up for a commitment term
                              │
                              ▼
                           active  ◄──────────────────────────────┐
                              │                                    │
          ┌───────────────────┴────────────────────┐              │
          │                                        │              │
  floor met every period               floor missed before        │
  through ends_at                      ends_at                    │
          │                                        │              │
          ▼                                        ▼              │
       completed                              breached            │
                                                  │               │
                                   team may create a new          │
                                   Commitment (separate record)───┘
```

State transitions are driven by `evaluate_commitment(team, billing_period)`,
called at the end of each invoice Draft phase (28th of the month):

1. **Floor met** — apply the discount to fixed-bundle lines; write the rollup
   (`floor_met = True`, `discount_applied = Σ discount`). If `billing_period`
   is the last covered period (`ends_at` is in this month), mark the Commitment
   `completed`.
2. **Floor missed** — write the rollup (`floor_met = False`,
   `discount_applied = 0`). Emit a clawback line on the invoice (see
   [Clawback computation](#clawback-computation)). Mark the Commitment
   `breached`.
3. **No active Commitment** — write no rollup row; invoice generation proceeds
   at list prices.

## Discount application

When `floor_met = True`, the discount is applied to **fixed-bundle line items
only** during Draft generation:

```
discounted_amount = round_half_up(line_amount × (1 − discount_pct / 100))
discount_given    = line_amount − discounted_amount   (integer subtraction; exact)
```

Each fixed-bundle `Invoice Line Item` receives the discounted amount. Metered
and add-on line items are written at list and are never touched. The
`Team Fixed-Bundle Spend Rollup.discount_applied` accumulates the sum of
`discount_given` across all fixed-bundle lines for audit and clawback input.

All arithmetic is integer minor units; the `discount_pct` percentage is the
only `Float` in this path, and the single rounding step converts it back to a
minor-unit integer per line item ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)).

## Clawback computation

A clawback repays only the discount the team enjoyed on the months already
consumed — never a fee for months not yet elapsed.

```
clawback_amount = Σ (rollup.discount_applied)
                  for each rollup where commitment = this Commitment
                                    and rollup.floor_met = True
```

The clawback is emitted as a single **`Invoice Line Item`** on the breach-period
invoice with `line_type = clawback` (distinct from `fixed_bundle` and `metered`
line types). It has:

| Field | Value |
|-------|-------|
| `line_type` | `clawback` |
| `description` | "Commitment clawback — discount repayment for {N} months" |
| `amount` | `clawback_amount` in minor units (positive — adds to total) |
| `commitment` | Link → the breached Commitment |

After the clawback line is written:
- The Commitment status → `breached`.
- The discount stops applying on this and all future invoices.
- The `Team Fixed-Bundle Spend Rollup` row for the breach period has
  `discount_applied = 0` (no discount was given on the breach month itself).

**Idempotency** — `evaluate_commitment` checks for an existing rollup row for
`(team, billing_period)` before writing. Re-running invoice generation
(e.g. after a correction) replaces the rollup row and clawback line in-place;
it never emits two clawback lines for the same breach.

## Invoice Line Item changes

Two additions to the existing `Invoice Line Item` child table are required:

| Field | Type | Notes |
|-------|------|-------|
| line_type | Select | `fixed_bundle` / `metered` / `clawback` — distinguishes bundle lines (eligible for discount), metered lines (never discounted), and clawback lines; defaults `fixed_bundle` for existing rows |
| commitment | Link → Commitment | Set on `clawback` lines; null on all others |

These additions do not change the existing `amount` / `rate` / `days` semantics;
`line_type` is purely a classification the UI and billing engine read to decide
treatment.

## Relationship to billing_cycle

`billing_cycle = annual` on a `Plan` is a UI shorthand that signals the plan
is designed to be paired with a 12-month Commitment. It does **not** change the
billing cadence — invoices are still monthly-in-arrears, one per calendar month.
The actual Commitment record (`term_months = 12`) is what creates and enforces the
floor and discount; the plan field is a hint to the subscription flow to offer a
Commitment at checkout.

## Relationship to price-lock

Price-lock (`plans-and-pricing.md`) and Commitment are parallel, non-overlapping
mechanisms:

| | Price-lock | Commitment |
|---|---|---|
| **Keyed by** | `resource_id` | team |
| **Controls** | which rate applies (grandfathering) | whether a discount on that rate applies |
| **Triggered by** | provisioning | customer signing a term |
| **Closes** | on terminate / re-provision | on term-end or breach |

A committed team on a grandfathered plan enjoys both: the locked rate from
price-lock, with the commitment discount on top. An upgrade-then-reprovision
creates a new price-lock at the then-current rate; the Commitment is unaffected
(the new resource's spend still counts toward the floor).

## API

```
# [Customer] Create a Commitment (sign up for a term)
POST /api/method/cloud_billing.commitment.create
     { "floor": <minor_units>, "term_months": 12, "discount_pct": 10.0 }
     → { commitment: "COMM-001", floor, term_months, discount_pct, started_at, ends_at }

# [Customer] View current Commitment
GET  /api/method/cloud_billing.commitment.get_active
     → { commitment or null, status, floor, ends_at, months_remaining, consumed_discount }

# [Customer] Commitment history
GET  /api/resource/Commitment?filters=[["team","=","TEAM-001"]]&order_by=started_at desc

# [Admin] Create or override a team's Commitment
POST /api/method/cloud_billing.admin.set_commitment
     { "team": "TEAM-001", "floor": <minor_units>, "term_months": 12, "discount_pct": 10.0 }

# [Admin] View rollups for a team (floor-met history, discount granted)
GET  /api/resource/Team Fixed-Bundle Spend Rollup
     ?filters=[["team","=","TEAM-001"]]&order_by=billing_period desc

# [Internal] Evaluate at invoice generation (called by generate_draft_invoice)
cloud_billing.commitment.evaluate_commitment(team, billing_period)
```

## Notes

- **One active Commitment per team.** The controller rejects a second `active`
  Commitment on save. The customer may create a new one after the current one
  `completed` or `breached`.
- **Early voluntary exit is not modelled.** A customer cannot "cancel" a
  Commitment short of breaching it (missing the floor). There is no early-exit
  path that waives the clawback.
- **`floor` and all amounts are `Long Int` minor units** ([ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)).
  The `floor` field in issue #30 was typed `Currency` — that is corrected here.
- **Commitment does not affect metered or add-on billing** in any way —
  neither the floor test, the discount, nor the clawback touches those lines.
- The `Team Fixed-Bundle Spend Rollup` is the permanent audit record linking
  each billing period to the Commitment and the discount granted. It is never
  deleted as part of log pruning (unlike `Payment Attempt` / `Webhook Event`
  rolling windows) — it is a money record.
