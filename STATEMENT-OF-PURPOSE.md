# Statement of Purpose — Billing & Pricing, H2 2026

**Author:** Saurabh · **Horizon:** July – December 2026 · **Status:** planning draft (2026-07-09)

> Where Frappe Cloud v2 billing stands, what I am setting out to own over the next six
> months, and how the roadmap sequences behind it. Grounded in the live `central/billing`
> module — not the [specs corpus](README.md), which described the build and now trails it.

---

## 1. Where we are — the build is essentially done

The billing platform is **feature-complete and running in production inside `central`**.
The first half of 2026 took it from a spec to a live system; the engine, the catalog, the
metering platform, and the console frontend are all built and under test.

**The automated money cycle runs on its own.** The scheduler owns it end to end:
- **Monthly (1st):** two-phase invoicing — draft one consolidated invoice per team, then
  open + collect (credits → card).
- **Daily:** dunning + staged suspension, gateway reconciliation, the INR e-mandate
  pre-debit/debit cycle, subscription backfill, log pruning.
- **Hourly:** ERPNext Sales Invoice sync retries. · **Every 10 min:** Atlas reconcile.

**The catalog is polymorphic, composable, and self-consistent:**
- Product families are masters (Category / Sub-Category / Resource Type; ADR 0007).
- **Design-your-own compute** ships to customers — the console slider (`ConfigDesigner`,
  resize, ladder) prices à la carte from a per-resource rate card beside curated presets
  (ADR 0009).
- The **Plan Configurator is the pricing authority**, authoring plans *and* the component
  rate card (ADR 0011).
- **Price Lock is retired** — the `Subscription Change` ledger is the single source of
  truth for "what's running," read through one `active_segments` helper (ADR 0010).

**Billing is already a metering platform, not just a VM biller:**
- The **consumer-service metering contract** is live (ADR 0015): a `report_usage`
  endpoint, team-level synthesized subject, dual reporting (authoritative total +
  incremental delta), per-family postpaid/prepaid settlement, pilot auth.
- New families beyond VMs are modelled and tested; services revenue reporting is shipped
  (MRR/YTD, cluster-wise, services, payment-mix).

**Everything upstream is done:** gateway seam (Stripe + Razorpay + PayPal), subscriptions,
credit ledger + wallet, tax (GST/SEZ + TDS seam), refunds, notifications, capability IAM
(Central Merge, #41–#45), and the console at `/dashboard/`.

**So the next six months are not a build phase.** They are the **transition**: cut over
off the legacy stack, migrate teams onto the new billing, operate it reliably at scale,
and grow the catalog on rails that are already proven — while retiring the last debt.

---

## 2. The mission for the next six months

> **Retire the legacy stack (dashboard + `frappe/payments`), operate the automated billing
> cycle reliably at production scale, and grow the metering platform onto proven rails —
> paying down the last catalog-pricing debt as we go.**

Three words: **cut over, operate, grow.**

---

## 3. What I am setting out to own

Ranked by consequence. Each theme names the outcome I am accountable for, the concrete
work, and how I will know it is done.

### Theme A — Cut over and decommission the legacy stack *(cut over)*

Console is the primary app, but the legacy SPA is still shipped — `dashboard/`'s seven
billing pages (Overview, Invoices, Credits, Payment Methods, Subscriptions, Notifications,
Settings) plus its mock Atlas screens still exist behind `/legacy-dashboard`.

- Close the remaining console parity gaps (notifications surface, team & permissions,
  any invoice/limit-tier detail still only in legacy).
- Decommission `dashboard/` and its route; drop the mock Atlas screens the real Servers
  surface supersedes (#74).

**Done when:** the legacy SPA is deleted and console is the *only* billing frontend.

### Theme B — Migrate teams off `frappe/payments` *(cut over — the big structural move)*

The whole point of this project was to rewrite away from `frappe/payments`. The new stack
is live; the remaining move is bringing existing teams onto it. Deliberately **gradual and
per-team**, post-launch, and **HITL** — it needs migration sign-off (#23).

- Stand up the migration tooling: per-team cutover, dry-run + reconcile, rollback path.
- Pilot on a cohort, verify invoice/credit/payment-method continuity, then widen.

**Done when:** teams bill through `central/billing` and the old payment path carries no
production traffic.

### Theme C — Operate it at production scale *(operate)*

Reliability is the feature now that the cycle is automated. My job is that the scheduled
jobs stay correct and observable as volume grows, and that no charge silently strands.

- **Reconciliation** as a first-class operated job: the charged-but-never-webhooked
  terminal-state model resolved with clear provenance (#21 — the top hardening item; the
  terminal-state design is still open).
- **Atlas enforcement matured**: the stop/terminate-delinquent loop and snapshot/transfer
  metering proven against real clusters, not just the reconcile backstop (#56–#58).
- **Observability**: revenue/dunning/failure dashboards that make a bad billing run
  obvious the morning of the 1st, not at month-end.
- A load + security pass at the volumes migration will bring.

**Done when:** the monthly run is a non-event, delinquency is actually enforced via Atlas,
and every charge has a known terminal state.

### Theme D — Grow the metering platform *(grow)*

The ADR 0015 contract is the reuse point, and it is proven. Growth is now cheap — light up
families on existing rails rather than build new machinery.

- **Domains** (ADR 0014): the one *designed-but-unbuilt* family — live-registrar pricing
  and threshold-based renewals. The clearest net-new build this half.
- **More meters onto the ADR 0015 contract** (transfer/bandwidth, additional consumer
  services) — additive, no new spine.
- **Tiered / graduated pricing** — explicitly future ([final-plan-pricing.md](final-plan-pricing.md) §10),
  no slice yet; scope it if a family needs it.

**Done when:** Domains bills end-to-end, and adding the next meter is a config + rate-card
exercise, not an engineering project.

### Theme E — Retire the last catalog-pricing debt *(operate)*

The [review notes](central-billing-review-notes.md) captured real seams; the big ones
(Price Lock, the N+1) are closed. What remains:

- **Collapse `memory_ratio` into `ram_ratio`** — two fields that must agree still coexist
  (~29 refs); derive the label from the numeric ratio and drop the Select (review §3).
- **Make composed-config input validation explicit** — reject foreign resource types /
  non-positive quantities up front instead of leaning on "unpriced → rejected" (review §7).
- **Per-patch before→after tests** for the backfills — the least-tested, highest-risk area
  (review §8).

**Done when:** the review-notes debt list is empty and the backfill patches are covered.

---

## 4. How the roadmap sequences

Rough phasing. Cut-over front-loads (it unblocks a clean migration); operate runs
continuously; grow starts once the legacy risk is retired.

| Window | Primary | Alongside |
|---|---|---|
| **Jul–Aug (Q3 start)** | **A** — close console parity, decommission legacy `dashboard/` (#74) | **E** — `memory_ratio` collapse, composed-config validation, patch tests |
| **Sep (Q3)** | **B** — migration tooling + first pilot cohort off `frappe/payments` (#23) | **C** — reconciliation terminal-state model (#21), enforcement loop (#56) |
| **Oct–Nov (Q4)** | **B** — widen migration · **D** — Domains family live (ADR 0014) | **C** — observability dashboards, Atlas metering (#57/#58) |
| **Dec (Q4 close)** | **B** — migration at scale · **C** — load + security pass | **D** — next meter on ADR 0015 rails; scope tiered pricing |

Ordering rule: **A before B** (don't migrate teams onto two frontends), **C continuously**
(operating never pauses), and **D after the legacy risk is down** — growth shouldn't
compete with the cut-over for attention.

---

## 5. What "done" looks like by year-end

By 31 December 2026, without hedging:

1. **Legacy is gone.** `dashboard/` decommissioned; console is the only billing frontend.
2. **`frappe/payments` carries no production traffic.** Teams bill on the new stack.
3. **The monthly run is a non-event** — reconciliation resolves every terminal state,
   delinquency is enforced via Atlas, and a bad run is visible the morning of the 1st.
4. **Domains bills end-to-end**, and the next meter is a config exercise.
5. **The debt list is empty** — one ratio field, explicit composed-config validation,
   backfill patches tested.

---

## 6. Risks and open decisions

- **HITL gates.** The migration (#23) needs sign-off, and the reconciliation terminal-state
  model (#21) is still an open design item — both are on the critical path for "operate."
- **Migration is the real risk this half.** The engine works; moving live teams onto it
  without dropping an invoice, credit, or mandate is where things break. Guardrail:
  dry-run + reconcile + rollback per team, pilot cohort before widening.
- **Don't let "grow" outrun "operate."** Domains and new meters are the fun work and the
  easiest to prioritise over the unglamorous migration. The mission order — cut over,
  operate, *then* grow — is deliberate.
- **Status to confirm.** A couple of items in §1/§3 are read from the code, not from a run:
  the exact console parity gap (Theme A) and how far the Atlas enforcement loop is proven
  vs. specced (Theme C). Worth a verification pass before this goes to anyone.

---

*Companion reading: live `central/billing` module · [central-billing-review-notes.md](central-billing-review-notes.md) ·
[catalog-pricing-decisions.md](catalog-pricing-decisions.md) · [roadmap.md](roadmap.md) ·
[issues/README.md](issues/README.md) · [docs/adr/](docs/adr/) (0006–0015).*
