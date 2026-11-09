# 187 — Store metered usage per day (Usage Day), and build the monthly figure from the days

**Type:** AFK · **Milestone:** TD · **Priority:** P1 · **Size:** M · **Labels:** `type:feature` `priority:p1` `area:metering`
**Area:** central/billing/revenue/metering.py, central/billing/revenue/storage_usage.py, new DocType Usage Day
**Source:** [CB-48](../central-billing-teardown/12-problem-discovery/problem-register.md) in the central billing teardown (code at central `a95b491e`; production counts from the backup of 3 Nov 2026).

## Problem

Central keeps one running monthly row per metered subscription. The days under it are not stored, so usage cannot be shown per day, audited, or compared with a bundle until the month is over.

## Current behaviour

- Storage: a daily job reads current bucket bytes and adds GiB × new days / days in month to one monthly Usage Rollup (central/billing/revenue/storage_usage.py:18-63). Individual days are not kept; a missed day is billed at the next reading's size.
- Cargo keeps no usage history; get_usage is the current reading only (cargo bucket.py:226-240).
- Grove keeps one Usage Record per key per UTC day but purges them after 90 days (usage_record.py:13).
- The monthly spine (Usage Rollup with locked rate and allowance, metered_line_items) is correct and stays.

## What we want

Every metered service writes one Usage Day per subject, meter and day. The monthly Usage Rollup is the sum of the period's Usage Days, and the invoice marks the days it billed. Design: [daily-usage-store.md](../central-billing-teardown/13-brainstorming/daily-usage-store.md).

**Who it affects:** Finance, support, customers (daily usage view).

**Why it matters:** Without per-day rows, a bundle cannot be tracked during the month, a dispute cannot be answered, and Grove's usage is lost after 90 days.

## Options

- A. Usage Day DocType, append-only, unique on source_ref; monthly rollup derived from it (design doc).
- B. Keep only monthly rollups and query Grove for days on demand (lost after 90 days; nothing for storage).

Compared in [solution-alternatives.md](../central-billing-teardown/13-brainstorming/solution-alternatives.md).

## Recommended approach

A.

## Acceptance criteria

- [ ] A day on which the bucket held 0 bytes bills nothing; GB-month = sum of each day's peak GB ÷ days in the month.
- [ ] Cargo is read hourly and the Usage Day keeps the day's peak, so a bucket emptied mid-day bills that day's peak and nothing after.
- [ ] Usage Day exists with the fields in the design, unique on source_ref, no edit or delete for any role.
- [ ] The storage job writes one Usage Day per bucket per day with that day's reading.
- [ ] The monthly run builds each metered Usage Rollup from the period's Usage Days and stamps the invoice on them.
- [ ] A rerun of the job or the month writes no duplicate row and bills no day twice.
- [ ] A day with no reading bills the last reading, flagged estimated on the Usage Day.
- [ ] Tests cover a missed day, a bucket deleted mid-month, and a month-end boundary.

## Dependencies

D-23 decided: GB (10⁹). D-24 decided: bill what is stored, as S3 and R2 do; an empty bucket bills nothing. D-27 decided: a missed reading bills the last reading, marked estimated. #186 and #188 build on it.
