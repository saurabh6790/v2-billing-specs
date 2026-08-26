# Consumer-service metering: dual reporting mode, per-family settlement, pilot-authenticated API

Date: 2026-07-04

[ADR 0013](0013-team-level-metered-services-synthesized-subject.md) settled *how a team-level metered
service is subjected* — a metered single-resource `Plan` over a synthesized `(team, service-plan,
cluster)` subject. It left open *how a consumer service actually transacts with billing*: how it
discovers plans, subscribes, reads its current subscription, and — the crux — **reports usage over an
authenticated API**, which ADR 0013 did not address (Central metered from the cluster manager,
pull-style; `record_meter_rollups` is deliberately internal — "any caller could forge usage").

Micro-services (a shared PDF renderer at `$0.0001/pdf`, S3 streaming backup, snapshot maintenance) and
bundled services (AI tokens at `$20 → 1M`, email at `$5 → 10k`) will drive an **in-app subscription
flow** and **push** their own consumption. This ADR fixes that contract.

## Decision

**A consumer service transacts with billing through the pilot-authenticated in-app facade
(`api/billing_api.py`), reusing the `X-Pilot-Token` seam. Usage is reported in one of two declared
modes, and the settlement of a bundle's allowance is a per-family property.** Everything lands in the
existing bounded `Usage Rollup` store; the price-lock, invoicing, and rate-resolution spines are
unchanged.

### 1. Authentication reuses the Pilot Credential; the team is the attribution guarantee

`report_usage` and friends are added to the pilot-authenticated facade. The team is taken **from the
credential, never a request parameter** — so a pilot can only ever report *its own team's*
consumption. The pilot↔team binding, elsewhere an IDOR defence, here *is* the usage-attribution
guarantee: a shared cluster service does not self-report cross-team; each team's own pilot reports the
consumption attributed to it, and the cluster comes from the pilot's context. This closes the
forge-usage hole that kept ingestion internal, without inventing a service-level trust boundary.

### 2. Reporting mode is declared per service-plan: Authoritative or Incremental

The two shapes coexist because they carry different idempotency contracts, and conflating them
destroys the audit trail. **`reporting_mode` is a stored property of the family (`Plan Category`)**, so
every `report_usage` call's semantics are unambiguous:

- **Authoritative** — the service keeps its own usage ledger (an AI-token manager, an email system)
  and sends the **period's running/final total**. Central **replaces** the rollup quantity. This is
  today's `ingest_rollup` behaviour unchanged; `idempotency_key` identifies the *period*.
- **Incremental** — a micro-service (PDF) has no ledger of its own and posts **deltas as consumed**.
  Central **accumulates** (`quantity += delta`). Dedup is a **monotonic per-`(subject, period)`
  sequence cursor**: Central applies a batch only if its sequence exceeds the last applied, so a
  retried or duplicated batch is a no-op. `idempotency_key` identifies the *batch*.

Both modes write **one `Usage Rollup` row per `(subject, period)`** — the store stays bounded (~one
metered line per team per service per cluster per month) whether a month is one authoritative total or
ten thousand accumulated deltas. The sequence cursor is one integer on the rollup, not a batch-key
ledger, so incremental dedup adds no unbounded row growth. Incremental assumes ordered delivery per
subject; a service that cannot guarantee order must declare Authoritative.

### 3. Settlement is per-family: Postpaid Overage or Prepaid Pack

**`settlement_mode` is a stored `Plan Category` property** governing what the included allowance
(`Plan Includes.quantity`) *means* when it runs out:

- **Postpaid Overage** (the built path) — keep serving; bill `max(0, qty − allowance) × rate` at the
  period close. Unbounded intra-period spend is bounded only by the trust-tier headroom.
- **Prepaid Pack** — the allowance is a **purchased balance** drawn down as usage is reported; at zero
  the service is **blocked/degraded** until another pack is bought. This rides the Credit-Wallet /
  offline-entitlement machinery, not monthly overage: enforcement is at the edge against a
  periodically-refreshed balance, exactly like VM spend caps.

Settlement and reporting mode are **orthogonal** — a prepaid AI-token pack can report authoritatively
while a postpaid PDF service reports incrementally.

### 4. The billing console shows a team's metered subscriptions and can subscribe/upgrade

Even though micro-services subscribe through the in-app flow, the admin billing console surfaces
**what metered services a team has subscribed to** (subject, plan, mode, allowance/balance, run-rate)
and offers the **subscribe/upgrade** provision through the same synthesized-subject path — so support
and accounts are never blind to a team's metered footprint.

## Consequences

- New code is confined to: two `Plan Category` properties + patch; a synthesized-subject provisioning
  branch (ADR 0013); a dual-mode branch in `ingest_rollup` (accumulate + cursor); four facade methods;
  the prepaid draw-down/enforcement; and a console panel. The rollup store, invoicing, price-lock and
  rate resolver are reused as-is.
- `report_usage` is now an authenticated external surface. Its safety rests entirely on the
  team-from-credential rule — no method may accept a team parameter.
- Declaring a family Incremental couples correct billing to **ordered delivery** from that service.
- Prepaid Pack introduces edge enforcement that can lag the true balance by a refresh interval
  (accepted, mirroring entitlement-token offline enforcement).

## Considered and rejected

- **A new per-service Service Credential trust boundary** (a shared PDF service self-attributing to
  any team). Rejected in favour of reusing the pilot: each team's pilot reporting its own consumption
  needs no new credential type and makes cross-team forgery structurally impossible.
- **A single reporting mode.** Authoritative-only forces micro-services to maintain a period ledger
  they have no reason to; incremental-only forces a batch-key ledger (unbounded) or loses the clean
  replace semantics the cluster-manager path already relies on. The per-family declaration keeps both
  cheap and auditable.
- **Batch-hash dedup ledger for incremental.** Tolerates reordering but reintroduces the per-event row
  growth the rollup store exists to avoid. The sequence cursor is one column; ordering is the trade.

## Supersedes / amends

- Builds on and completes [ADR 0013](0013-team-level-metered-services-synthesized-subject.md)
  (synthesized subject) with the reporting/settlement/API contract it deferred.
- Reuses [ADR 0008](0008-add-on-as-metered-single-resource-plan.md) (metered single-resource Plan),
  [ADR 0007](0007-polymorphic-catalog-category-masters.md) (behavioral `Plan Category`), and
  [ADR 0010](0010-price-lock-folded-into-subscription-change.md) (locked rate on the change row).
