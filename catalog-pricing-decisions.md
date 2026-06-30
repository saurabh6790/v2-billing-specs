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

### Smaller decisions
- **A Plan always declares what it bills** — `Plan.includes` should require ≥1 row (the include
  binds the metered resource + allowance, or the bundle composition; empty = a price with no
  subject). Decided in principle; not yet enforced in code.

---

## To decide

### Implementation of the agreed ADRs
1. **Implement [ADR 0011](docs/adr/0011-plan-configurator-is-the-single-pricing-authority.md)** —
   move component-rate-card authoring into the Plan Configurator; make the pricing step capture
   all shipped currencies inline; demote the seed/endpoint to fresh-install/migration only.
2. **Build [ADR 0012](docs/adr/0012-catalog-administration-verb-first-desk-workspace.md)** —
   the verb-first Desk workspace + the small "Add-ons (metered)" report. (Or spec it further
   first.)
3. **Enforce `Plan.includes ≥ 1`** — set the Table field `reqd` + a clear validate message.

### Structural gaps the future offerings exposed (need a decision before building them)
4. **Account-level / asset-less metered services** (email, PDF "common"). Metering and
   invoicing assume **asset + cluster**; these are team-level with neither. Needs: a service
   subscription without an asset, and invoicing that collects region-less usage. → ADR/issue.
5. **One-time charges + per-instance / variable pricing** — the **Domains** misfit:
   registration is one-shot (model is recurring + metered), and price varies per TLD with a
   pass-through registrar cost. Needs: first-class one-time line items and a per-instance/live
   pricing path (not Plan-per-TLD). → ADR/issue.

### Smaller / deferred
6. **Resize UX** — lock the profile to the running config, or allow switching it during resize
   (currently allows switching). Minor.
7. **Storage unit label** — the picker shows "GB SSD" (hardcoded); decide whether to drive it
   from the `Disk` resource's `unit`.
8. **Full-collapse revisit trigger** — only if a primitive ever becomes independently sellable
   (at which point it is an offering and becomes a Plan honestly).

---

## Suggested sequencing

1. Enforce `Plan.includes ≥ 1` (tiny, removes ambiguity now). *(#3)*
2. Implement ADR 0011 in the Configurator (component card + all-currency pricing). *(#1)*
3. Build the ADR 0012 Desk workspace on top of it — the demoable front door. *(#2)*
4. Then decide the two structural gaps before building email/PDF/domains. *(#4, #5)*

---

## Status of artifacts

- **Code** (#79–#84 + UI refinements): branch `custom-plans` in the central app; 552 tests
  green; console builds (Node 20); build artifacts are gitignored.
- **ADRs 0011, 0012**: this specs repo (branch `plan-writeup`).
- Pricing storage/resolution, price-lock-as-grandfathering, and the customer picker are
  **unchanged** by the open items above — those are authoring/IA and new-offering decisions.
