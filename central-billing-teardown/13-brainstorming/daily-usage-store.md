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
| `quantity`, `unit` | GB-day for storage (bytes ÷ 10⁹, D-23), tokens or requests for AI |
| `source_amount`, `source_currency` | Grove's USD cost for the day, the price billed (D-20) |
| `source_ref` | Grove drain id + key + day, or the storage sample id: the unique key |
| `landed_at` | When Central stored it, to bill by landing window |
| `invoice` | Set when billed; never changed after |

Unique on `source_ref`, so a re-pull or a retried sample writes nothing twice.
Corrections are new rows with a negative quantity or amount (Grove's Usage
Correction maps to one), never edits.

### How other object stores bill storage (for D-24)

| Provider | Measure | Empty bucket | Minimum duration |
|---|---|---|---|
| Amazon S3 | Byte-hours over the month, as GB-month | Bills nothing | None on Standard; 30 days on Standard-IA, 90 to 180 on Glacier classes |
| Cloudflare R2 | Average of each day's peak storage over the month | Bills nothing | None |
| Backblaze B2 | Byte-hours | Bills nothing | None |
| Wasabi | GB-month | 1 TB monthly minimum | 90 days (pay as you go) |

Central can only read Cargo's current size, so it follows R2: read every hour, keep the
day's peak on the Usage Day, and bill GB-month = sum of daily peaks ÷ days in the
month. A day on which the bucket held 0 bytes bills 0. No minimum duration.

### Collect

- **Storage:** an hourly job reads each bucket; one Usage Day per bucket per day keeps
  that day's peak GB (GB-day). An empty bucket gives 0. A day the job did not run is
  D-27.
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
resource type: the plan's base offering, per subscription, never pooled (D-22).

### Show

The customer sees a daily chart per service and "used X of Y included this month"
from the Usage Days, the same rows the invoice used. Today the console's AI usage
comes straight from Grove and storage shows nothing per day.

### Showing AI in INR

Grove prices in USD and the invoice converts at the billing day's rate (D-21). An
Overview that converts at each day's rate would change the INR price of the same
usage from day to day, and would not match the invoice. Recommended (D-26): one
rate per month.

- On the billing day (the 1st), Central reads the USD to INR rate (ERPNext Currency
  Exchange for that date, so ERPNext's Sales Invoice uses the same rate) and fixes it
  for the month that starts.
- Each AI Usage Day for an INR team stores the USD amount and the INR amount at the
  month's rate.
- The Overview, the AI price list and the daily chart show INR at that rate, with
  "Rate for November: ₹84.10 per US$1" next to them.
- The month's invoice uses the same rate and prints it on the AI line.

Frappe carries one month of rate change on AI revenue. If the rate must be the one
on the billing day that closes the month, the Overview can show only an estimate.

## Decisions

| ID | Question | Status |
|---|---|---|
| D-20 | Who rates AI? | **Decided:** Grove's USD price |
| D-21 | AI for INR teams? | **Decided:** convert at the billing day's rate |
| D-22 | What is bundled? | **Decided:** the plan's base offering, per subscription |
| D-23 | Storage unit? | **Decided:** GB (10⁹) |
| D-24 | A day with nothing stored? | **Decided:** bill only what is stored, as S3 does; an empty bucket bills nothing |
| D-27 | A day the reading job did not run? | Open. Recommended: the last reading, marked estimated |
| D-26 | How the Overview shows AI in INR | Open. Recommended: one rate per month, above |

## Order

1. Usage Day ledger and storage writing to it (#187).
2. AI pull into the ledger, then AI subscriptions and billing (#186; needs D-26).
3. Storage price and unit (#188; needs a price from finance).
4. Bundled transfer (#189).
