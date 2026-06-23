# Console UI Migration — legacy `dashboard/` → `console/`

**Status:** plan · **Owner:** TBD · **Milestone:** **CO** (Console UI migration)
**Targets:** parity before legacy `/legacy-dashboard` is removed.

Migrate the remaining billing/identity surfaces out of the legacy Vue SPA
(`apps/central/dashboard/`) into the new primary console SPA
(`apps/central/console/`), then decommission the legacy app. The new console
already owns `/dashboard`; the legacy SPA was demoted to `/legacy-dashboard`
while its surfaces are ported (see `console/vite.config.ts`).

This is a **port, not a rewrite** — both SPAs run the same runtime (Vue 3 +
vue-router + frappe-ui `useCall`/`useList` against `/api/v2/method/*`), and the
backend endpoints are unchanged (`central.billing.api.dashboard.*`,
`central.iam.*`). No backend/API-contract work is required beyond the small
grounding gaps flagged below.

## Decisions (settled)

- **Full TypeScript, `vue-tsc` clean.** Every ported composable / util / page is
  typed; the type-check gate stays green. No `any`-dumping to reach parity faster.
- **Drop the legacy Atlas screens** (`pages/atlas/*`, on `mock.js` + PROPOSED
  endpoints). Console's real **Servers** surface (`central.api.servers`) already
  supersedes that domain — do not port Region / Registry / VirtualMachines /
  AccessRequests.

## Target information architecture (from the new designs)

The new console billing IA **consolidates** the legacy's seven billing pages into
three nav items, plus two top-level items. Nav: **Servers · Billing (Overview ·
Invoices · Limit Tiers) · Team & Permissions · Notifications · Search**.

| New console surface | Absorbs (legacy pages) | Primary endpoints (existing unless 🟡) |
|---|---|---|
| **Billing › Overview** | Overview, Credits, PaymentMethods, Subscriptions, Settings | `get_team_overview`, `get_forecast`, `get_credit_balance`/`credit_ledger`, `create_topup_order`/`confirm_topup`, `list_payment_methods` (+ options/setup/confirm/reorder/set-default/remove), `get_billing_profile`/`save_billing_profile`, `list_subscriptions`, `get_collection_status`/`set_collection_mode`; 🟡 **Stop billing**, 🟡 **auto-recharge** toggle |
| **Billing › Invoices** | Invoices | `list_invoices`, `get_invoice`, `pay_invoice`/`pay_invoice_checkout`/`confirm_invoice_checkout`, `get_billing_settings`/`save_billing_settings` (recipient + language); 🟡 **Email invoice**, **Download PDF** route |
| **Billing › Limit Tiers** (UI label "Spending Limits") | TrustTier | `get_trust_tier`, `get_team_overview` (current subscribed amount = active run-rate); 🟡 **full ladder** (all tiers + requirements), see gap below |
| **Team & Permissions** (top-level) | team/Members, team/RoleBuilder | `central.iam.*` (members/roles/custom-roles) |
| **Notifications** (top-level, bell) | billing/Notifications | `list_notifications`, `get_notification_preferences`/`save_notification_preferences` |

**Terminology:** the customer-facing surface is **"Spending Limits" / nav "Limit
Tiers"**; the backend stays **Trust Tier** (`Trust Tier Level`, `trust_tier`,
`get_trust_tier`). Tier labels are **Base / Tier 1 / Tier 2 / Tier 3** in the UI
(not `t0…t3`). See `terminology.md`.

## What carries over for free (console already has it)

Ported pages **rebase onto console's shared infra** — they do not bring the
legacy `useTeam.js`/`utils/*` along:

- `composables/useSession.ts`, `useTeamScope.ts`, `useCapabilities.ts` (replace
  legacy `useTeam.js` / `useCapabilities.js`)
- `composables/common/useFrappeList.ts`, `useFrappeRealtime.ts`
- `layouts/AppShell.vue`, `components/common/PageHeader.vue`, the `ListView` suite
- `lib/{format,status,toast,plans}.ts` (replace legacy `utils/{money,status,date,toast,gateway}.js`)
- `api/methods.ts` (`method(path)` URL builder + typed `API` map)

## The conversion deltas (the recurring tax)

1. **JS → TS** — type every ported module; add row/response types to `types/index.ts`.
2. **frappe-ui `^0.1.0` → `#v1.0.0-beta.11`** — core (`useCall`/`useList`/plugin)
   is unchanged; reconcile component prop/slot changes per screen.
3. **Icons** — console uses CSS-class icons (`lucide-*`, `icon="lucide-…"`); legacy
   leans on `unplugin-icons` + `lucide-static`/`@iconify`. Rewire icon usage; do
   not re-add the unplugin stack.
4. **Stripe/payments plumbing is net-new in console** — `@stripe/stripe-js` plus
   the Stripe/Razorpay/topup/pay-invoice composables must be stood up (highest risk).

## Backend grounding gaps (small, flag before the dependent slice)

These UI affordances in the designs have no endpoint yet — confirm/extend:

- **Limit Tiers** shows the *full* ladder (every tier + its requirements +
  spending limit + a "Current" marker). `get_trust_tier` returns only current +
  next. → extend it (or add `get_spending_limits`) to return all rungs with
  per-currency thresholds and met/unmet requirement flags.
- **Stop billing** (suspend all servers) — no endpoint specced.
- **Auto-recharge** toggle on the Wallet card — no endpoint specced.
- **Email invoice** / **Download PDF** actions on the invoice detail panel.

## Migration slices

Vertical, demoable, both SPAs live in parallel until the last slice. See
`issues/66`–`issues/74`.

1. **#66 Foundation** — port the API map into `methods.ts`, the billing-setup
   router guard + onboarding gate, and shared types/lib. *(blocks all below)*
2. **#67 Payments plumbing** — `@stripe/stripe-js` + Stripe/Razorpay/topup/
   pay-invoice composables, typed. *(blocks Overview, Onboarding)*
3. **#68 Onboarding** — billing-profile + payment-method steps + the setup guard.
4. **#69 Billing Overview** — the consolidated page (estimate+alert, wallet,
   payment methods, billing contact, subscriptions, tax, stop-billing).
5. **#70 Invoices** — list + detail panel (line items, GST, credits, email/PDF,
   recipient & language).
6. **#71 Limit Tiers** — Spending Limits (current amount, ladder table, explainer).
7. **#72 Notifications** — top-level surface + preferences.
8. **#73 Team & Permissions** — members + role builder (`central.iam`).
9. **#74 Decommission legacy** — delete `dashboard/`, the `/legacy-dashboard`
   route/www/build output, and the Atlas mock screens.

**Land in order:** #66 first, then #67 (unblocks payments), then read-heavy
surfaces (#70, #71, #72) in any order, then #68/#69 (payments-dependent), then
#73, then #74 once parity is verified.

## Risks

- **Stripe/Razorpay flows** (#67) are the only net-new plumbing — the rest is a
  typed port. Validate the SetupIntent + Elements mount path early.
- **frappe-ui beta** component drift — budget reconciliation time on form-heavy
  screens (Onboarding, Settings-in-Overview).
- **Grounding gaps** above can block #69/#70/#71 polish — raise them at slice start.
