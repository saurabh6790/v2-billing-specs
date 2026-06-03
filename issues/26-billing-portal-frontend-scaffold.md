# 26 — Billing portal frontend scaffold (Frappe-UI)

**Type:** AFK · **Milestone:** Phase 4 · **Spec:** [dashboard.md](../dashboard.md)

## What to build

The shared **Frappe-UI** single-page-app shell that the customer (#18) and admin (#19) dashboards are built inside — set up once so both surfaces inherit press's exact design system rather than re-deriving colours per screen. This is the foundation slice for all billing UI.

Stack mirrors `frappe/press`'s `dashboard/`: **Vue 3 + Vite + Vue Router + Pinia + `frappe-ui`**, served from `press_billing/dashboard/` and mounted via a `www/` route + Frappe build pipeline.

**Design system is non-negotiable:** Tailwind config uses `presets: [frappeUIPreset]` from `frappe-ui/tailwind`. That preset is the single source of colour tokens, spacing, and typography — the SPA uses **only** press's tokens (`gray`, `blue` primary, semantic `green`/`amber`/`red`), no bespoke palette or hand-picked hex. Components come from `frappe-ui` (`Button`, `Dialog`, `ListView`, `Badge`, form controls); charts via `vue-echarts`; icons via `unplugin-icons`/`feather-icons`.

## Acceptance criteria

- [ ] `press_billing/dashboard/` SPA builds and serves; Tailwind extends `frappeUIPreset` (no custom colour palette defined anywhere).
- [ ] App shell: router, Pinia store, logged-in **team context**, and a `frappe-ui` resource layer pointing at the billing whitelisted endpoints.
- [ ] Shared layout primitives (page shell, nav, panel/card, money + status `Badge`) render with press's tokens — visually consistent with the press dashboard.
- [ ] A smoke route renders against a real endpoint (e.g. current team) to prove auth + data wiring end-to-end.
- [ ] Lint/build wired into the app's asset pipeline (`bench build`); no Desk-form fallback for these surfaces.

## Blocked by

- #01

## Notes

- Customer screens (built in #18) follow the billing wireframes: [central-spec wireframes#billing](https://github.com/rmehta/central-spec/blob/master/wireframes.md#billing).
- Keep the surface thin: the SPA renders and calls whitelisted APIs; all money/auth logic stays server-side.
