# Metered services report totals and levels, not events

Date: 2026-10-19

Central bills services it does not run: Grove (AI) and Cargo (object storage) first, email and print
later. ADR 0015 gave team-level services a `report_usage` call, but it takes a pilot credential bound
to one team, and its default for small services is to send deltas. Grove and Cargo serve every team,
and a delta lost or sent twice is money lost or charged twice. Each new service also needed a code
change, because the service names were Select options.

Design: [metered-services.md](../../metered-services.md).

## Decision

**A service is a `Service` record, and it reports the period's total (Sum meters) or the current
level (Level meters) for each subject, signed with its own secret. Central maps the subject to a team
through `Team Service`, and pushes the team's limits back to the service.**

- **Registry, not code.** `Service` and its `Service Meter` rows map the service's meter names to
  catalog Resource Types. `Team Service.add_on_service` and `Service Detail.service` become Links to
  it. A new service is Desk records, catalog rows and limit rows.
- **Totals and levels.** A Sum meter's value is the period so far. A Level meter's value is what is
  held now. A retry is harmless, a lost report heals at the next one, and one `as_of` timestamp
  guards the order. No batch ledger is kept.
- **Central integrates levels.** Storage is billed in GB-months like S3: Central adds
  `last_level × hours` on each report. Services send readings, not byte-hours.
- **Service credential.** Each service signs with an HMAC key on its `Service` record. It can report
  only for subjects a `Team Service` row registers to it, so it cannot bill a team that did not turn
  it on. This replaces ADR 0015's pilot-only rule for platform services; pilots keep their path.
- **AI is rated by Grove.** Grove reports `spend_usd` per model, billed through a Resource Type
  "AI Usage" in USD with a Catalog Rate per currency. This is a deliberate exception to ADR 0011,
  because the gateway needs the per-model rates to stop a key in real time and a second copy would
  drift.
- **A period belongs to whoever counts it.** All wire timestamps are UTC. A Sum line carries its
  `period` in the service's clock (`Service.period_timezone`; Grove counts UTC months), and Central
  stores that window in IST (1 Oct 05:30 – 1 Nov 05:30). Level meters use Central's IST months. An
  invoice takes each service period that ended in its month. Central never takes the period from
  the arrival time.
- **Central owns limits.** `Trust Tier Service Limit` rows on `Trust Tier Level`, and overrides on
  `Billing Profile`, resolve through `get_service_limits`. Central pushes them on every change. The
  service enforces Block limits; Central checks Notify limits on each report.

## Consequences

- Grove and Cargo each add an hourly report and a state endpoint. Central keeps no per-service code
  for billing.
- `Usage Rollup` gains `dimension`, `last_level` and `last_reported_at`. It stays one row per subject,
  meter, dimension and period.
- Grove's Tier values and Cargo's bucket quotas become copies of what Central pushed.
- AI invoices depend on Grove's pricing being right. Grove's existing gateway-vs-Grove audit and a
  daily check against `pulled_after` / `pulled_until` cover this.

## Considered and rejected

- **Send each event or delta.** Needs a ledger of batch ids to stop double counting, and a lost call
  is lost money. Kept only as ADR 0015's Incremental mode, for a small service that keeps no count.
- **Central pulls each service.** Each service would need a Central-side client, which is the code
  change this ADR removes. Grove's pull stays as a daily check.
- **Central rates AI tokens.** Nine counters times every model in Central's catalog, kept in step
  with Grove's gateway. Two price lists that must always agree.
- **A new metering doctype per service.** The existing rollup, rates, allowances and price-lock
  already cover it.

## Supersedes / amends

- Amends [ADR 0015](0015-consumer-service-metering-api-contract.md): platform services report with a
  service credential, and Authoritative (totals) is the default.
- Builds on [ADR 0013](0013-team-level-metered-services-synthesized-subject.md) (service subject),
  [ADR 0007](0007-polymorphic-catalog-category-masters.md) (Plan Category), and
  [ADR 0010](0010-price-lock-folded-into-subscription-change.md) (locked rate).
- Makes a stated exception to [ADR 0011](0011-plan-configurator-is-the-single-pricing-authority.md)
  for AI.
