# 49 — Admin Gateway Config UI: currency grouping + `is_default` toggles

**Type:** AFK · **Milestone:** P4 · **Spec:** [dashboard.md](../dashboard.md), [payments.md](../payments.md)

## What to build

Update the admin **Gateway Config** panel to expose the multi-currency gateway model introduced in #46. Admins need to see at a glance which gateway handles which currency and be able to change the default for any currency without touching credentials or other settings.

**UI changes:**

- Gateways are displayed grouped by the currencies in their `Payment Gateway Currency` child table.
- Each currency row shows an `is_default` toggle. Toggling one ON automatically clears the previous default for that currency (mirrors the server-side invariant — the server enforces this regardless; the UI just makes it obvious).
- A read-only **"Effective routing"** summary table below the gateway list: one row per configured currency, showing which gateway currently wins (i.e. has `is_default = True` and `is_enabled = True`). Makes the resolver output visible without requiring mental simulation.
- Adding or removing a currency from a gateway's list is done inline on the gateway card (add row / remove row in the child table).

No changes to credential management, webhook secret handling, or any other gateway fields.

## Acceptance criteria

- [ ] Gateway Config panel groups gateways by currency.
- [ ] `is_default` toggle per currency row; toggling one clears the prior default for that currency in the UI (and the server enforces the invariant on save).
- [ ] Effective routing table shows one row per currency with the winning gateway name; updates immediately after a toggle is saved.
- [ ] Disabling a gateway (`is_enabled = False`) removes it from the effective routing table.
- [ ] No gateway credentials or secrets are exposed in the UI response.

## Blocked by

- [#46](46-multi-currency-gateway-config.md)
- [#26](26-billing-portal-frontend-scaffold.md)
