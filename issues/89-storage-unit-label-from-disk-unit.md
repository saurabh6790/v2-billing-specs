# 89 — Storage unit label: drive "GB" from `Disk.unit` in the console picker

**Type:** AFK · **Milestone:** CC · **Spec:** [catalog-pricing-decisions.md §8](../catalog-pricing-decisions.md)

## What to build

The console config picker shows a hardcoded **"GB SSD"** storage label. Drive the **unit** portion
("GB") from the `Disk` resource's `unit` so the unit is single-sourced. The **"SSD"** qualifier stays
a literal for now (storage is single-type today with no price impact — revisit only if a second disk
type appears).

## Acceptance criteria

- [ ] The disk slider/label in the console picker reads its unit from the `Disk` resource's `unit`
      (via the data the picker already receives), not a hardcoded "GB".
- [ ] "SSD" remains a literal; no behavior change to pricing or bounds.
- [ ] Changing the `Disk` resource's `unit` is reflected in the picker label.

## Blocked by

None - can start immediately.
