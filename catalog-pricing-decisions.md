# Catalog & Pricing — decisions and open questions

A running summary of the composable-pricing work and the design discussion around it:
what is **decided** (and where it lives) versus what is still **to decide**. Companion to
the ADRs in [docs/adr](docs/adr) and the issues in [issues](issues).

---

## Where we are

We set out to ship **composable resource pricing** — design-your-own compute configs beside
curated presets ([ADR 0009](docs/adr/0009-composable-resource-pricing-design-your-own-config.md))
— and that surfaced a broader question: is the pricing model robust as future offerings
(email, PDF, domains, storage) arrive, and can a non-technical accounts team actually run it?
Two ADRs came out of that discussion ([0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md),
[0012](docs/adr/0012-catalog-administration-verb-first-desk-workspace.md)).

---

## Decided

### Built and tested (issues #79–#84, branch `custom-plans`)
The end-to-end composable-pricing slice is implemented and green (552 tests):

- **#79 Per-resource rate card** — `Catalog Rate` prices a `Resource Type` (Compute/Memory/
  Disk) per unit, regional-over-global; seeded starter card; admin setter.
- **#81 Profile bounds + validator** — `Plan Sub-Category` carries `ram_ratio` + `vcpu_steps`
  + disk bounds; one reusable server-side validator (ratio/steps/bounds) for provision + resize.
- **#80 Composed subscription** — a Subscription carries its composition; the whole-config
  rate `Σ(qty × component_rate)` is locked on one `Subscription Change` row; bills a single
  prorated line ([ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)).
- **#82 Resize** — `changed`-event re-lock at current rates; preset↔composed switch; headroom
  + validation enforced server-side; grandfathering preserved.
- **#83 Eligibility** — `get_eligible_plans` returns the rate card + profile bounds + headroom;
  provision re-validates everything server-side.
- **#84 Customer slider UI** — console "New Server" picker: presets + a Custom row that expands
  into a slider; vCPU/RAM/disk on discrete ladders (fractional vCPU through 256, storage
  ladder), each with a slider **and** a dropdown; sub-category-aware (tabs when a region's
  presets span profiles, flat otherwise); live estimate with a hard stop at headroom; resize
  reuses the same component.

### Pricing model — single source of truth ([ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md))
- The **storage/resolution layer is already one source of truth**: one `Catalog Rate` table,
  one resolver, two *honest* price targets — `Plan` (offerings) and `Resource Type`
  (composable primitives).
- The real fragility was **authoring** (presets via the configurator, component card via a
  separate seed + endpoint → drift → the `$0` estimate). Decision: **the Plan Configurator is
  the single authority that prices the whole catalog.**
- **Rejected: full collapse** (make every primitive a Plan, one `priced_doctype`) — it
  manufactures degenerate non-offering "plans" for cosmetic uniformity.
- **Future add-ons need no new concept** — they are metered single-resource Plans
  ([ADR 0008](docs/adr/0008-add-on-as-metered-single-resource-plan.md)).

### Admin experience ([ADR 0012](docs/adr/0012-catalog-administration-verb-first-desk-workspace.md))
- The catalog is administered from a **verb-first Frappe Desk workspace** for the accounts
  team (laypeople): task shortcuts (*Launch a plan / add-on*, *Update prices*, *Retire*) that
  open the **Plan Configurator** (one guided form), an on-page "how it works" legend, a metered
  **add-ons list** (allowance + overage in one row), masters tucked under *Advanced*, retired
  links pruned. Demoable in ~30s; the console picker stays a separate surface.

### Future offerings — pressure-tested
- **Email, PDF, additional storage** fit as metered single-resource Plans (new `Resource
  Type`s where needed) — no new concepts; they validate the narrow Resource-Type boundary.
- **Team-level (asset-less) metered services** — design resolved in
  [ADR 0013](docs/adr/0013-team-level-metered-services-synthesized-subject.md): a metered
  single-resource Plan keyed on a **synthesized `(team, service-plan, cluster)` subject** (no
  customer asset), regional-over-global rates unchanged, and **allowance-pooling as a `Plan
  Category` property** (globally-priced families pool team-wide; regionally-priced families stay
  per-cluster). No new metering/invoicing concept. Build pending.

### Smaller decisions
- **Money stays float `Currency` (major units).** [ADR 0003](docs/adr/0003-money-as-integer-minor-units.md)'s
  integer minor-units model was **never implemented** — rates and amounts are `Currency` floats in
  major units throughout (e.g. `0.12`/vCPU, `0.8` overage), with no paisa/cent conversion. So the
  Configurator's [ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md)
  pricing step writes `Currency` rates, not minor-unit integers. **Reconciled 2026-07-01:** ADR 0003
  is marked deprecated-never-implemented and CONTEXT.md's money terms (now *Money representation* /
  *Rate precision*) + flagged ambiguity describe the float model. **Sweep complete (#90):**
  `invoicing.md`, `metering.md`, `tax.md`, `credits.md`, `commitment.md`, `payments.md`, `security.md`,
  `observability.md`, and issues #79/#80 now describe the float model, and the ADR 0003 migration
  issues #34–#39 are marked OBSOLETE.
- **A Plan always declares what it bills** — `Plan.includes` should require ≥1 row (the include
  binds the metered resource + allowance, or the bundle composition; empty = a price with no
  subject). Decided in principle; not yet enforced in code.

---

## Remaining work (all decided — implementation + cleanup)

Nothing here is an open *decision* anymore. Items 1–6 are build work; 7–9 are closed.

### Implementation of the agreed ADRs
1. **Implement [ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md)** —
   move component-rate-card authoring into the Plan Configurator; make the pricing step capture
   all shipped currencies inline; demote the seed/endpoint to fresh-install/migration only.
2. **Build [ADR 0012](docs/adr/0012-catalog-administration-verb-first-desk-workspace.md)** —
   the verb-first Desk workspace + the small "Add-ons (metered)" report. (Or spec it further
   first.)
3. **Enforce `Plan.includes ≥ 1`** — set the Table field `reqd` + a clear validate message.
4. **Finish the [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md)
   read-path migration.** ADR 0010 moved only the *write* path; `Price Lock` is still the
   **read** source in ~6 places, so a **composed** subscription (which writes no `Price Lock`,
   only a `Subscription Change`) is **invisible** to the billing readers — undercounted in
   "resources used", missing from admin consumption, skipped by the currency fallback, and
   `get_eligible_plans` now computes "what's running" two ways that disagree for composed
   configs. Replace every remaining `Price Lock` read with a shared `team_active_segments(team)`
   helper (which also kills the `team_run_rate` N+1), backfill, then retire the `Price Lock`
   doctype. → [review notes #1+#2](central-billing-review-notes.md).

### Structural gaps the future offerings exposed (design resolved — build pending)
5. **Account-level / asset-less metered services** (email, PDF "common"). **[Design resolved —
   [ADR 0013](docs/adr/0013-team-level-metered-services-synthesized-subject.md); build pending.]**
   These run on a cluster but have no customer-owned asset. Resolved as a metered single-resource
   Plan on a synthesized `(team, service-plan, cluster)` subject; rates resolve regional-over-global
   unchanged; allowance pools team-wide for globally-priced families and stays per-cluster for
   regionally-priced ones (a `Plan Category` property). What remains is implementation, not a
   decision.
6. **Per-instance / live-registrar pricing (Domains)** — **[Design resolved —
   [ADR 0014](docs/adr/0014-domains-live-registrar-pricing-threshold-renewals.md); build pending.]**
   A domain is an annual `Subscription` on a single `Domain` Plan; TLD + rate are instance data
   (no Plan-per-TLD). The rate is sourced **live from a registrar adapter at registration** and
   locked on the price-lock spine; renewals **grandfather with a cost-threshold guard** (re-price
   only when the registrar wholesale rises past a band). The **"one-time line item" need
   dissolved** — registration is just year 1 of the annual charge; a genuine one-time-charge
   capability stays deferred (no current offering drives it). What remains is implementation.

### Smaller items (resolved)
7. **Resize UX** — **[Resolved: allow switching.]** Central billing is **profile-agnostic on
   resize**: Atlas owns the resize mechanics (a family switch and an in-place upgrade are
   indistinguishable to billing), so billing just calls the Atlas API, then re-prices + re-locks
   (a `Plan Changed` segment) and re-validates the composition against the **target** profile's
   bounds. Any guardrail on a profile change is console UX polish, not a billing rule
   ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
8. **Storage unit label** — **[Resolved: drive the unit, keep "SSD" literal.]** Drive the "GB"
   from the `Disk` resource's `unit`; leave "SSD" as a literal in the picker (disk is single-type
   today, no price impact). Revisit only if a second disk type (NVMe/HDD) appears.
9. **Full-collapse revisit trigger** — **[Resolved: effectively retired.]** Even the one stated
   trigger doesn't require it: if a primitive ever becomes independently sellable, it just becomes
   its own metered single-resource `Plan`
   ([ADR 0008](docs/adr/0008-add-on-as-metered-single-resource-plan.md)) *alongside* its rate-card
   `Resource Type` row (the Plan prices the standalone offering; the Resource Type still prices
   composed configs). No scenario requires collapsing *all* primitives, so full collapse is
   closed, not deferred.

---

## Suggested sequencing

1. Enforce `Plan.includes ≥ 1` (tiny, removes ambiguity now). *(#3)*
2. Finish the ADR 0010 read-path migration — a shared `team_active_segments` helper that kills
   the composed-invisibility bug **and** the `team_run_rate` N+1 together, then retires
   `Price Lock`. *(#4)*
3. Implement ADR 0011 in the Configurator (component card + all-currency pricing). *(#1)*
4. Build the ADR 0012 Desk workspace on top of it — the demoable front door. *(#2)*
5. Build the now-resolved structural offerings when those products are scheduled — asset-less
   metered services (#5, [ADR 0013](docs/adr/0013-team-level-metered-services-synthesized-subject.md))
   and Domains (#6, [ADR 0014](docs/adr/0014-domains-live-registrar-pricing-threshold-renewals.md)).

---

## Status of artifacts

- **Code** (#79–#84 + UI refinements): branch `custom-plans` in the central app; 552 tests
  green; console builds (Node 20); build artifacts are gitignored.
- **ADRs 0011, 0012** (pricing authority, verb-first workspace) and **0013, 0014** (team-level
  metered services, Domains live-registrar pricing): this specs repo (branch `plan-writeup`).
  **ADR 0003** is now marked deprecated-never-implemented (money is float `Currency`).
- Pricing storage/resolution, price-lock-as-grandfathering, and the customer picker are
  **unchanged** by the open items above — those are authoring/IA and new-offering decisions.
