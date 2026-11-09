# Daily usage store for metered services (D8)

How Cargo and Grove keep usage today, what Central does with it, and a design for
storing usage per day in Central so a month's usage can be compared with what a
bundle includes. Evidence: Cargo `d0f6f0c` (6 Nov 2026), Grove `e028f25`
(9 Nov 2026), central `a95b491e`, production backup of 3 Nov 2026.

## What each service keeps

| | Cargo (object storage) | Grove (AI inference) |
|---|---|---|
| What it counts | Bytes and object count per bucket, kept by Garage as it writes | Requests and token counters per API key, counted by the `pathway` gateway |
| Kept per day? | **No.** `get_usage` returns the current reading only (`cargo/object_storage/doctype/bucket/bucket.py:226-240`); nothing is stored per day or per month | **Yes.** One `Usage Record` per API key per UTC day per drain, with requests, `total_tokens`, per-model JSON detail, and `cost` in USD (Grove's sell price) |
| Kind of meter | Level (a reading at a moment) | Sum (a count over a day) |
| Who prices it | Nobody: Central must | Grove, in USD, at the `Model Pricing` the gateway tagged the request with |
| How Central reads it | `POST cargo.object_storage.api.bucket.get_usage` with a Central-minted token (`docs/central-contract.md`) | `grove.api.usage.usage(teams, pulled_after, pulled_until)`: totals per team and model, plus `daily_summary` per UTC day, for records that **landed** in the window (`grove/api/usage.py:19-71`) |
| Retention at the source | None (no history) | Usage Records older than 90 days are purged (`usage_record.py:13`) |
| Day boundary | Whenever Central reads | UTC day of the gateway's clock |

Grove's README states the contract: "AI is billed in arrears by Central … Central
bills what landed since its last invoice from `api.usage.usage(pulled_after=,
pulled_until=)`, its Credit Wallet used first. Grove holds no money."

## What Central does today

- **Storage.** A daily job reads every bucket's current bytes and adds
  `GiB × new days / days in month` to one monthly Usage Rollup per subscription, with
  the day number as its sequence (`central/billing/revenue/storage_usage.py:18-63`).
  The Remote Storage category is Incremental, so the increments add up correctly.
  The individual days are not kept. A missed day is billed at the next day's size.
  The unit is GiB (`BYTES_PER_GIB = 1024**3`) labelled GB.
  Production: 4 rollups, all internal teams, 2.05 GB-months in October, rate ₹0
  (no Storage price in the catalog), allowance 0.
- **AI.** Not billed. `Team Service` says "AI is prepaid at Grove, so it has no
  subscription here" (`central/services/doctype/team_service/team_service.py:123`),
  which contradicts Grove. `GroveClient.get_usage` accepts `pulled_after` and
  `pulled_until` (`central/integrations/grove.py:150-170`), but no billing code calls
  it. The AI Tokens category exists (Authoritative, Postpaid Overage) with no plan.
  Production: 8 active AI services (1 external since 30 Oct, 7 internal since 8
  Oct), 0 subscriptions, 0 usage rows, 51 trial keys.
- **Bundles.** Service plans include no allowance (Storage plan: 0 GB). VM plans
  promise 1 TB of transfer a month ("Every server includes 1 TB of transfer a
  month", `PlanGroup.vue:222-226`); nothing meters transfer.
- **Monthly spine that already works.** `Usage Rollup` stamps the locked rate and
  allowance at first receipt, and `metered_line_items` bills
  `max(0, quantity − allowance) × rate` (`central/billing/revenue/metering.py`). It is
  the right place for the monthly figure; it lacks the days under it.

## Design: Usage Day ledger, Usage Rollup from it

### Store

A new DocType **Usage Day**, append-only, one row per subject, meter and day:

| Field | Meaning |
|---|---|
| `team`, `subscription` | Who is billed, and under which subscription |
| `service` | Storage, AI (later Email, PDF, Transfer) |
| `resource_type` | The catalog resource it is rated as (Storage, Tokens, AI Usage) |
| `subject` | The bucket, or the Grove API key hash |
| `day` | The day the usage happened, in the source's time zone (UTC for Grove; IST for storage samples) |
| `quantity`, `unit` | GB-day for storage (bytes ÷ 10⁹ or ÷ 2³⁰, see D-23), tokens or requests for AI |
| `source_amount`, `source_currency` | Grove's USD cost for the day, kept even if Central re-rates (D-20) |
| `source_ref` | Grove drain id + key + day, or the storage sample id: the unique key |
| `landed_at` | When Central stored it, to bill by landing window |
| `invoice` | Set when billed; never changed after |

Unique on `source_ref`, so a re-pull or a retried sample writes nothing twice.
Corrections are new rows with a negative quantity or amount (Grove's Usage
Correction maps to one), never edits.

### Collect

- **Storage:** the daily job stores one Usage Day per bucket with that day's reading
  (GB-day = GB held that day). A missed day is a missing row, and the month is billed
  on the days present, scaled to the month only if D-24 says so. No guessing a past
  day from today's size.
- **AI:** an hourly job asks Grove for the landing window since the last pull, per
  team, and stores one Usage Day per team, model and UTC day from `daily_summary`.
  Billing by landing window means a late drain goes on the next invoice, not twice.
  Pull at least daily, so nothing reaches Grove's 90-day purge unstored.

### Bill

At the monthly run, per team and resource type:

1. Sum the Usage Days not yet invoiced whose `day` falls in the period (storage) or
   that landed in the period (AI, matching Grove's contract).
2. Write the monthly Usage Rollup from that sum (Authoritative: the days are the
   truth). The locked rate and allowance stay as today.
3. `metered_line_items` bills `max(0, monthly quantity − allowance) × rate`, as now.
4. Stamp the invoice on the Usage Days it used.

The allowance ("bundled") comes from the subscription's Plan Includes row for that
resource type, or from a team-wide pool when D-22 says the bundle is per team.

### Show

The customer sees a daily chart per service and "used X of Y included this month"
from the Usage Days, the same rows the invoice used. Today the console's AI usage
comes straight from Grove and storage shows nothing per day.

## Decisions needed

| ID | Question | Recommendation |
|---|---|---|
| D-20 | Who rates AI: Grove's USD price, or Central's catalog rates per token? | Grove's price, converted (D-21). Grove's invoice API returns cost per model and day, not per token type, so Central rating needs a Grove change. |
| D-21 | AI for INR teams: convert Grove's USD at what rate, or an INR price book? | Convert at the invoice date's rate with the rate on the line; revisit when AI revenue is material |
| D-22 | What is bundled, and per subscription or pooled per team? | Per subscription for storage and AI plans; transfer stays "included" with no meter until a fair-use rule exists |
| D-23 | Storage unit: GB (10⁹) or GiB (2³⁰)? | Bill GB, the unit the customer sees; convert from bytes with 10⁹ |
| D-24 | A day with no storage reading: bill nothing, or the day before's size? | The day before's size, marked estimated on the Usage Day |

## Order

1. Usage Day ledger and storage writing to it (#187).
2. AI pull into the ledger, then AI subscriptions and billing (#186; needs D-20, D-21).
3. Storage price and unit (#188; needs a price and D-23).
4. Bundled transfer (#189; D-22).
