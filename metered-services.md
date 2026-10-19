# Metered services: one platform for Grove, Cargo and what comes next

Date: 2026-10-19 · ADR: [0025](docs/adr/0025-metered-services-report-levels-and-totals-not-events.md)

## The goal

Central bills services it does not run. Grove (AI tokens) and Cargo (object storage) come first.
Email and print come later, and more after them. Each service reports usage to Central over one
API. Central prices it, applies the allowance, puts it on the invoice and sets each team's limits.

Adding a service must be data, not a release: a Desk record, some catalog rows and some limit rows.

## What exists today

Most of the billing spine is already built. The gaps are at the edges, where the services meet it.

### In Central

| Piece | State |
|---|---|
| `Plan Category` with `billing_type`, `settlement_mode` (Postpaid Overage, Prepaid Pack), `reporting_mode` (Authoritative, Incremental) | Built (ADR 0007, 0015) |
| `Resource Type` master, the thing a rate and an allowance key on | Built, but only a name |
| `Usage Rollup`: one row per subject, resource type and period, replace or accumulate, `sequence` cursor | Built (ADR 0015) |
| Synthesized service subject per (team, service plan, cluster), `provision_service_subscription` | Built (ADR 0013) |
| `report_usage` in `api/billing_api.py` | Built, but takes a **pilot** credential only |
| `metered_line_items`: `max(0, qty − allowance) × rate` | Built |
| `Team Service` (team, service, region, bucket, subscription) | Built, `add_on_service` is a Select of `storage`, `ai` |
| `Service Detail` (region, service, endpoint) | Built, `service` is a Select of `telemetry`, `storage` |
| `Trust Tier Level` with per-currency `Trust Tier Threshold` | Built, no per-service limits |

### In Grove (`frappe/grove`, HEAD c9684a8)

- Grove prices every request itself. `Model Pricing` holds one rate per counter per model
  (`prompt_tokens`, `cached_tokens`, `cache_write_tokens`, `completion_tokens`, `request_count`,
  the `_above_272k` variants and more). The gateway uses the same rates to stop a key in real time.
- Grove lands one `Usage Record` per key per day with `cost` in USD. It audits its own price against
  the gateway's and keeps corrections as separate rows.
- Grove is **postpaid**. Its README says Central bills what landed since the last invoice by reading
  `api.usage.usage(pulled_after=, pulled_until=)`. Grove holds no money.
- Grove gates on a **Tier** (`spend_limit` per month, `max_keys`, rate limits per metric and window).
  Central sends only the tier **label** and `suspended`, through `api.teams.team_webhook`. The numbers
  are edited in Grove's Desk.

### In Cargo (`frappe/cargo`, HEAD 5cb4bc5)

- One Garage cluster per region. Central asks Cargo for buckets and keys.
- `get_usage(name, region)` gives one bucket's `used_bytes` and `object_count`. It is a counter read,
  not a scan.
- `set_quota(name, region, size_gib, max_objects)` caps one bucket. Garage enforces it. There is no
  team-level cap, because Cargo has no idea of a team.
- Cargo reports nothing to Central except cluster status. Nothing sends bucket usage on a schedule.

### Gaps

1. **Central's Grove client is out of date.** `central/integrations/grove.py` calls
   `grove.api.balance`, `grove.api.add_credit`, `grove.api.provision_user` and
   `grove.api.usage(users=)`. Grove HEAD has none of these paths: `grove/api/__init__.py` is empty,
   usage is `grove.api.usage.usage(teams=)` and a team is `grove.api.teams.provision_team`. Grove
   moved from prepaid credit to postpaid. Check this against the Grove that is deployed.
2. **AI usage is not billed.** `TeamService.validate` skips the subscription for AI ("AI is prepaid
   at Grove").
3. **Storage usage is not billed.** A bucket opens a subscription on the "Object Storage Plan", but
   nothing writes a `Usage Rollup` for it.
4. **A new service needs a code change.** The service names are Select options on `Team Service`
   and `Service Detail`.
5. **AI limits have two owners.** The trust tier is Central's, but the money it allows for AI is set
   in Grove.
6. **A platform service cannot report.** `report_usage` takes a pilot credential, which is bound to
   one team. Grove and Cargo serve every team.
7. **The month is taken from the arrival time, in IST.** `_billing_period` in
   `api/billing_api.py` uses `frappe.utils.nowdate()` when no `period` is sent. Grove counts in UTC
   months. Grove's final October total, sent at 1 Nov 02:00 IST (31 Oct 20:30 UTC), lands on the
   **November** rollup. October misses its last updates and November starts with October's total.
   See [Time zones](#time-zones-grove-counts-in-utc-central-in-ist).

## The model

```
Service ──has──> Service Meter ──prices as──> Resource Type ──> Plan Includes (allowance)
   │                                                         └─> Catalog Rate (rate, per currency/region)
   │
   └──has──> Team Service (one subject the service knows, e.g. a bucket or a team) ──> Subscription
                  │
   report ──────> └──> Usage Rollup (one row per subject, meter, dimension, period) ──> invoice line

Trust Tier Level ──> Trust Tier Service Limit ─┐
Billing Profile ───> Service Limit Override ───┴──> limits ──push──> Service
```

Four words carry the design:

- **Service**: a system that reports usage, for example `ai` (Grove) or `storage` (Cargo).
- **Meter**: one number a service reports, for example `bytes_stored` or `spend_usd`.
- **Subject**: the thing the service measures, in the service's own words: a bucket name for Cargo,
  a team id for Grove. Central maps it to a team through `Team Service`.
- **Limit**: a cap Central sets per team and service, from the trust tier, and pushes to the service.
  The service enforces it. Central cannot stop a request in real time.

## Doctypes

### New: `Service`

The registry. One row per service. This replaces the Select options.

| Field | Type | Notes |
|---|---|---|
| `service_name` | Data, unique | `ai`, `storage`, `email`, `print` |
| `title` | Data | "AI", "Object Storage" |
| `plan_category` | Link Plan Category | The product family it bills under |
| `enabled` | Check | A disabled service's reports are refused |
| `report_secret` | Password | HMAC key for reports in and state pushes out |
| `state_url` | Data | Where Central pushes team state and limits. Blank: the service reads them |
| `expected_cadence` | Select Hourly, Daily, Weekly, Monthly | Only for the "no report" alert |
| `late_window_hours` | Int, default 72 | How long after a period ends a report can still change it |
| `period_timezone` | Data, default `UTC` | The clock the service counts its Sum periods in. Grove: `UTC` |
| `meters` | Table Service Meter | |

### New: `Service Meter` (child of `Service`)

Maps the service's words to the catalog's.

| Field | Type | Notes |
|---|---|---|
| `meter_key` | Data | What the service sends, e.g. `bytes_stored` |
| `aggregation` | Select Sum, Level | Sum: a running total for the period. Level: a reading of how much is held now |
| `resource_type` | Link Resource Type | What billing prices. Blank: kept for limits and charts, never billed |
| `unit_divisor` | Float, default 1 | Reported unit to billed unit: 1e9 for bytes to GB, 1e6 for tokens to 1M tokens |
| `label` | Data | "Storage", "AI usage" |

### Changed: `Team Service`

- `add_on_service`: Select becomes **Link Service**. A patch creates `Service` rows `ai` and
  `storage`, so the existing values stay valid (the names match the old options).
- New `external_id`: the subject as the service names it. Unique per service. For storage it is the
  bucket name (backfilled from `bucket_name`). For AI it is the team id.
- `Service Detail.service` becomes Link Service in the same patch.

### Changed: `Usage Rollup`

- New `dimension` (Data): a breakdown inside one meter, for example the bucket or the model. It is
  part of the idempotency key: `subject:resource_type:dimension:period`.
- New `last_level` (Float) and `last_reported_at` (Datetime): what a Level meter needs to integrate
  over time, and the order guard for both kinds.

The store stays bounded: one row per team, meter, dimension and month.

### New: `Trust Tier Service Limit` (child of `Trust Tier Level`)

| Field | Type | Notes |
|---|---|---|
| `service` | Link Service | |
| `meter_key` | Data | Must be a meter of that service |
| `scope` | Select Team, Subject | Team: across all the team's subjects. Subject: per bucket, per key |
| `window` | Select Hour, Day, Month, Level | Sum meters take Hour, Day or Month. Level meters take Level |
| `value` | Float | In billed units (GB, USD, 1M tokens) |
| `enforcement` | Select Block, Notify | Block: the service refuses past it. Notify: Central alerts only |

### New: `Service Limit Override` (child of `Billing Profile`)

The same fields. A row here replaces the tier's row for the same (service, meter, scope, window). It
sits next to the profile's existing `manual_override` and `override_max_spend`.

A team gets its limits from one function, the same way `get_team_caps` works today:

```python
get_service_limits(team, service) -> [{meter, scope, window, value, enforcement}]
# override row > tier row > nothing (the service applies no limit from Central)
```

The entry tier must carry a row for every enabled service. `Trust Tier Level.validate` checks this,
the same way it checks that the entry tier prices every currency.

## The two calls

A service talks to Central through one call in and one call out. Nothing else is required.

### In: the service reports usage

```
POST /api/method/central.metering.api.report
X-Central-Service: storage
X-Central-Signature: <base64 HMAC-SHA256 of the raw body, keyed by Service.report_secret>

{
  "as_of": "2026-10-19T10:00:00Z",
  "lines": [
    {"subject": "t81f-blr-backups", "meter": "bytes_stored", "value": 53687091200},
    {"subject": "t81f-blr-media",   "meter": "bytes_stored", "value": 1073741824}
  ]
}
```

Grove, the same call:

```json
{
  "as_of": "2026-10-19T10:00:00Z",
  "lines": [
    {"subject": "team-8f2a", "meter": "spend_usd", "dimension": "llama-3.3-70b",
     "period": "2026-10", "value": 12.4381},
    {"subject": "team-8f2a", "meter": "spend_usd", "dimension": "whisper-large",
     "period": "2026-10", "value": 0.9120}
  ]
}
```

The rule for `value`:

- **Sum meter**: the total for `period` so far. Never the amount since the last report. `period` is
  required, in the service's own clock (`Service.period_timezone`). Central never guesses it from
  the arrival time.
- **Level meter**: how much is held at `as_of`. It has no `period`.

Every timestamp on the wire is UTC with a `Z` (RFC 3339), in both directions.

Central's answer: `{"accepted": 2, "rejected": [{"subject": "...", "reason": "unknown subject"}]}`.

What Central does with each line:

1. Checks the signature against the service named in the header. The header picks a secret; it is
   never trusted on its own. Every failure is the same 403.
2. Finds the `Team Service` for (service, subject). An unknown subject is rejected, not billed. A
   service can only report for teams that turned it on.
3. Takes the team, cluster and subscription subject from that row, and the period from `as_of`.
   When several subjects share one subscription (a team's buckets in one region), the service's
   subject becomes the rollup's `dimension`. The allowance is applied once to the sum of the
   dimensions, not to each one.
4. Locks the rollup row and applies the line. A line whose `as_of` is not newer than the row's
   `last_reported_at` changes nothing.

At most 1,000 lines a call. A service with more sends more calls with the same `as_of`.

### Out: Central pushes team state

```
POST {Service.state_url}
X-Central-Signature: <HMAC of the body, same secret>

{
  "team": "team-8f2a",
  "subjects": ["team-8f2a"],
  "status": "Active",
  "observed_at": "2026-10-19T10:00:00Z",
  "limits": [
    {"meter": "spend_usd", "scope": "Team", "window": "Month", "value": 200, "enforcement": "Block"}
  ]
}
```

`status` is Active, Suspended or Cancelled. Central sends it when the team turns the service on,
changes tier, gets an override, is suspended or cancels. The service keeps the newest `observed_at`
and ignores an older one. Grove's `team_webhook` already works this way for `tier` and `suspended`.

A failed push is retried by a background job. A service that has no `state_url` reads the same body
from `central.metering.api.get_state(team)`.

## Why report totals and levels, not events

The obvious design is "send each event, or each delta, and Central adds them up". It breaks in
three ways: a retry counts twice, a lost call is lost money, and two calls out of order give a wrong
running total. Fixing these needs a ledger of every batch id, which grows without bound.

A total or a level has none of these problems:

- **A retry is harmless.** The same total twice is the same total.
- **A lost report heals.** The next report carries everything the lost one did.
- **Order is checked by one timestamp.** An older `as_of` is ignored.
- **The cadence does not matter for the bill.** Hourly, daily or weekly reports give the same
  invoice. Cadence only changes how fresh the dashboard and the limits are.

Both Grove and Cargo can do this today. Grove already sums its records per team for any window.
Garage already keeps a byte count per bucket.

The Incremental mode from ADR 0015 stays, for a small service that truly keeps no count of its own.
It is the exception, and it needs ordered delivery.

## How storage is counted

You asked for "the total first, then the increments, like S3". S3 does it this way, but the increments
are Central's job, not Cargo's. Cargo sends the level every time. The first report is the total.
Each later report is the new total. Central works out the change.

S3 bills **byte-hours**: how much was stored, multiplied by how long it was stored. Central does the
same with a Level meter:

```
on each report (level L at time t):
    if t <= last_reported_at: ignore
    quantity += last_level × hours(t − last_reported_at)
    last_level = L
    last_reported_at = t

billed GB-months = quantity / hours_in_month / 1e9
```

Example, a 30-day month: 50 GB for 15 days, then 100 GB for 15 days.

```
50 × 360 h + 100 × 360 h = 54,000 GB-hours
54,000 / 720 h = 75 GB-months
```

The bill is 75 GB-months at the GB-month rate, less the allowance.

A missed report keeps the last level until the next one. The next one corrects the level. When a
month ends, the closing job integrates to the period end, and the next month's row opens at that
level. A bucket that is deleted reports 0 once, or Central writes the 0 when the `Team Service` row
is trashed.

Object count is a second Level meter, `objects_stored`, with no resource type. It is not billed. It
is there for the `max_objects` limit and the dashboard.

Later, egress and request counts are Sum meters on the same service. They come from the gateway's
nginx logs, not from Garage. Nothing in Central changes when they are added.

## How AI is counted

Grove already prices each request: per model, per counter, with cache discounts and the 272k
bracket. The gateway needs these rates to stop a key the moment it runs out. Copying 9 counters
times every model into Central's catalog would give two price lists that must always agree.

So **Grove rates, Central bills the rated amount.** Grove reports `spend_usd` per model as a Sum
meter. In Central:

- Resource Type **AI Usage**, unit USD.
- Catalog Rate on it: 1.00 in USD. In INR, the rupee price of one dollar of AI usage, set by finance.
- A plan with "$20 of AI included" is a Plan Includes row of 20 on AI Usage.
- The invoice line is `max(0, spend − 20) × rate`, with one sub-row per model.

This keeps ADR 0011 intact for everything Central prices. AI is the one family whose unit is money
another system worked out. It is written down as a deliberate exception in ADR 0025.

Tokens are still visible: Grove can also report `tokens` per model as a meter with no resource type.
Central stores it for the dashboard and for a token limit, and never bills it.

## Time zones: Grove counts in UTC, Central in IST

Grove counts in UTC. A Usage Record's `day` is a UTC day, and the gateway's `spent:<YYYY-MM>`
counter, which enforces the monthly cap, starts at 00:00 UTC. Central's site runs in IST
(Asia/Kolkata, UTC+05:30), and Frappe stores every Datetime as naive IST.

So "October" means two windows that are 5 h 30 min apart:

| | Starts | Ends |
|---|---|---|
| Grove's October (UTC) | 1 Oct 00:00 UTC = 1 Oct **05:30 IST** | 1 Nov 00:00 UTC = 1 Nov **05:30 IST** |
| Central's October (IST) | 1 Oct 00:00 IST | 1 Nov 00:00 IST |

Grove cannot report an IST month. Its smallest bucket is a UTC day, and a UTC day straddles two IST
days. Asking Grove to change clocks would also move its spend caps, its reports and its vendor
reconciliation.

**The rule: a period belongs to whoever counts it.**

1. **On the wire, everything is UTC.** `as_of`, `observed_at` and every other timestamp carry a `Z`.
   Central converts to IST when it stores a value (`convert_utc_to_system_timezone`) and converts
   back when it sends one. A timestamp with no zone is refused.
2. **Sum meters keep the service's period.** Grove sends `"period": "2026-10"`. With
   `period_timezone = UTC`, Central stores the rollup's `period_start` as 1 Oct 05:30 IST and
   `period_end` as 1 Nov 05:30 IST. The idempotency key uses the period label, so every October
   report lands on the same row whenever it arrives.
3. **Level meters use Central's period.** A level is a reading at one moment, so it has no clock of
   its own. Central integrates it and cuts it at the IST month boundary. Cargo storage is billed by
   IST month.
4. **An invoice takes each service's period that ended in its month.** Central's October invoice
   takes Grove's October (ending 1 Nov 05:30 IST) and storage's October (ending 1 Nov 00:00 IST).
   The line shows its real window: "AI usage, 1 Oct 05:30 – 1 Nov 05:30 IST".
5. **The month closes on the service's clock.** Grove's October closes 72 hours after 1 Nov 05:30
   IST, not after midnight.
6. **Limits use the service's clock.** Grove's monthly cap resets at 05:30 IST and its daily token
   cap at 05:30 IST each day. Central's 80% check reads the rollup of Grove's current period, so the
   two agree. A notice says "resets on 1 Nov at 05:30 IST", not "on 1 Nov".

**What a customer sees.** A request at 1 Nov 02:00 IST is 31 Oct 20:30 UTC. It is on the October
invoice. Every period is contiguous, so a request is billed once: it moves at most 5 h 30 min
across a month boundary, and is never billed twice or lost.

**What this fixes.** Gap 7: today the month comes from `nowdate()` at arrival. With `period` required
on Sum lines, a late report for October always goes to October.

**Trust tier spend.** `max_spend` is checked against the sum of each meter's current period. Near a
month boundary, AI and storage are on different periods for up to 5 h 30 min. This is accepted:
the error is at most 5 h 30 min of one service's usage, and Grove's own cap still blocks in real
time.

## Limits

The trust tier sets how much a team can use of each service. The service enforces it.

| Service | Meter | Scope | Window | Entry tier | Enforced by |
|---|---|---|---|---|---|
| ai | `spend_usd` | Team | Month | 50 | Grove: the Tier `spend_limit` |
| ai | `tokens` | Team | Day | 5 (million) | Grove: a Model Limit row |
| storage | `bytes_stored` | Subject | Level | 100 (GB) | Cargo: `set_quota` `size_gib` |
| storage | `objects_stored` | Subject | Level | 1,000,000 | Cargo: `set_quota` `max_objects` |
| storage | `bytes_stored` | Team | Level | 500 (GB) | Central: Notify only (Cargo has no team cap) |

The values are examples. Operators set them in Desk on the Trust Tier Level.

Three rules:

- **Central owns the numbers.** Grove's Tier and Cargo's bucket quota become copies of what Central
  pushed. Today an operator edits AI limits in Grove; after this, they edit them in Central.
- **Block needs the service.** Only the service sees a request in time. Central checks every report
  against the Notify limits and sends the team a notice at 80% and 100%.
- **The team spend cap still applies.** The trust tier's `max_spend` is across everything the team
  uses. A service limit is narrower, never wider.

A **Prepaid Pack** (ADR 0015) uses the same push: the pack's balance goes out as a limit with
`window: Month` and `enforcement: Block`, and is lowered as reports arrive. When the team buys
another pack, Central pushes the new balance.

## Late reports and closing a period

- A report for a period is applied until `late_window_hours` after the period ends. Grove keeps
  usage for 72 hours, so 72 is the default.
- The invoice job closes the period after that window. A closed rollup is never changed.
- A report for a closed period that raises the total becomes a **prior-period adjustment** line on
  the next invoice, using the rollup versioning already built (`superseded_by`). A lower total
  becomes a credit through the existing refund path, with a reason.
- No report from a service for twice its `expected_cadence` raises an operator alert. The bill does
  not change; the next report fills the gap.

## Adding a service at runtime

For email, print, or anything else, nobody writes Central code.

1. **Catalog**, in the Plan Configurator: a Plan Category with its settlement and reporting mode, a
   Resource Type for each billed meter, plans with their allowances, and the rates per currency and
   region.
2. **Service**, in Desk: name, the category, the meters, the secret, the state URL.
3. **Limits**, on each Trust Tier Level: one row per meter that needs a cap.
4. **The service team** builds two things: `report` calls to Central, and a `state_url` endpoint
   (or a call to `get_state`).

Example, email at "$5 for 10,000 emails a month, then $0.40 per 1,000":

| Record | Values |
|---|---|
| Resource Type | Emails |
| Plan Category | Email, Postpaid Overage, Authoritative |
| Plan | "Email 10k": Plan Includes 10,000 Emails, fixed $5 |
| Catalog Rate | Emails: $0.0004 |
| Service | `email`, meter `emails_sent`, Sum, resource type Emails, divisor 1 |
| Tier limit | `emails_sent`, Team, Day, 2,000, Block |

The email service reports `{"subject": "<team>", "meter": "emails_sent", "value": <sent this month>}`
each hour.

A print service sold as packs ("1,000 pages for $3") is the same, with Prepaid Pack settlement.

## What changes in Grove and Cargo

**Grove**

- Call `report` each hour after a pull lands: `spend_usd` and `tokens` per team and model, month to
  date. This is one grouped query over `money_rows` that already exists.
- Accept `limits` on `team_webhook` and write them to the team's Tier values. The label stays for
  display.
- `pulled_after` / `pulled_until` stays as the reconciliation read. Central checks its rollup against
  it once a day.

**Cargo**

- An hourly job: for each bucket on the region's cluster, read the byte and object counts from
  Garage, and call `report` once per region. Cargo signs it with the secret Central already gives it
  at enrolment (`webhooks.configure`).
- A `state_url` endpoint that turns Subject limits into `set_quota` calls, and Suspended into a
  read-only quota.

**Central**

- Fix the Grove client to Grove's current API (gap 1) before anything else.
- Remove the "AI is prepaid at Grove" branch, and open a service subscription for AI like storage
  does (gap 2).

## Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Who rates AI: Grove (bill `spend_usd`) or Central (rate tokens per model and counter)? | Grove. One price list, already used by the gateway. |
| 2 | How is AI billed to INR teams? | A fixed INR rate per USD of AI usage on the Catalog Rate, set by finance and changed by a normal rate change. |
| 3 | Does Grove push, or does Central keep pulling `pulled_after`? | Push, through the same `report` call as every other service. Keep the pull as a daily check. |
| 4 | Does Central own the AI limit numbers? | Yes. Grove's Tier becomes a copy. |
| 5 | Is a team-wide storage cap Notify only, or does Central block writes when it is crossed? | Notify for now. Blocking means setting every bucket's quota to its current size. |

## Build order

1. Fix the Grove client to Grove HEAD. Without this, nothing else about AI works.
2. `Service` and `Service Meter`. Link `Team Service` and `Service Detail` to it. Patch the two rows.
3. `Usage Rollup`: `dimension`, `last_level`, `last_reported_at`, and the Level integration.
4. `central.metering.api.report` with signature, subject lookup, order guard, required `period` on
   Sum lines and UTC-only timestamps. This also fixes gap 7.
5. Storage: Cargo's hourly report, the GB-month resource type and rate, invoice lines.
6. AI: the AI Usage resource type, open a subscription for AI, Grove's hourly report.
7. `Trust Tier Service Limit`, `Service Limit Override`, `get_service_limits`, the state push.
8. Grove and Cargo apply pushed limits.
9. Late reports, period close, the "no report" alert, and the daily Grove check.
