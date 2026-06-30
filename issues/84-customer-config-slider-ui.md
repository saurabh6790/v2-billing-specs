# 84 — Customer slider UI: design-your-own config + resize

**Type:** AFK · **Milestone:** CC · **Spec:** [plan-writeup.md §1/§6.5/§7](../plan-writeup.md), [final-plan-pricing.md §5.2](../final-plan-pricing.md) · **ADR:** [0009](../docs/adr/0009-composable-resource-pricing-design-your-own-config.md)

## What to build

The customer-facing tracer: a slider on the console "New Server" surface that lets a customer
**design their own config** beside the curated presets, and the **same slider** for resizing a
running machine.

- Driven by `get_eligible_plans` (#83): render the presets as today, plus a "design your own" mode
  fed by `rate_card` + `profiles` + `available`.
- Pick an optimization **profile**, then drag **vCPU** (snaps to `vcpu_steps`); **RAM follows
  automatically** by `ram_ratio` (not independently draggable, so an off-ratio shape can't be
  expressed); **disk** is an independent slider within `[disk_min, disk_max]`.
- The **estimate recomputes live** as `Σ(qty × rate)` from the rate card; the slider has a **hard
  stop at `available` headroom** — the customer cannot drag into a config they can't afford.
- Provision posts the chosen composition (the server re-validates per #83). The bundle-discount note
  is shown only while sitting exactly on a preset.
- **Resize** reuses the same component for a running machine: pre-fill the current config, show
  old-vs-new estimate, and on confirm drive the #82 resize. Sliding off a preset visibly drops the
  discount.
- Follows the console UI conventions (Frappe-UI, the live `console/` app — not legacy `dashboard/`);
  mutations use POST.

## Acceptance criteria

- [ ] "New Server" shows presets + a "design your own" slider fed by `rate_card`/`profiles`/`available`.
- [ ] Dragging vCPU snaps to `vcpu_steps` and RAM updates by `ram_ratio`; RAM is not independently editable; disk is bounded by `[disk_min, disk_max]`.
- [ ] The estimate updates live and the slider cannot exceed `available` headroom (hard stop).
- [ ] Provisioning a designed config creates a composed subscription (#80) end-to-end; a provision the client somehow lets through over headroom is still refused server-side.
- [ ] The same slider resizes a running machine: pre-filled, old-vs-new estimate, confirm drives the #82 `changed` event; sliding off a preset drops the discount.
- [ ] UI uses the `console/` app + Frappe-UI; config mutations are POST.

## Blocked by

- [#83](83-eligibility-rate-card-bounds-headroom.md) (the rate card + bounds + headroom the slider reads)
- [#82](82-resize-composed-config-changed-event.md) (the resize the slider drives)
- [#66](66-console-migration-foundation.md) (the console app the slider is built in)
