# Billing UI (Team self-service)

## Purpose

Specify the **customer-facing billing UI** — how a **team** performs every billing
action through the portal. This is the team self-service surface only; the
cross-team operator/admin console is out of scope here (it gates on
`central.iam.user_has_operator_bypass`, see [security.md](security.md) §3 and
[issue #19](issues/19-admin-dashboard.md)).

Per [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md) §5, the
billing dashboard is **rebuilt inside the Central app** against the **same
whitelisted billing APIs**. The pre-merge standalone Frappe-UI SPA, its `/billing`
route and shell, are dropped at the boundary. This spec describes the rebuilt
screens, the team action → endpoint mapping, and the frappe-ui composition rules
they follow. It does not re-specify the backend — each action points at an
existing endpoint owned by the `billing` module.

For the surrounding team/identity and infrastructure screens — members, roles,
custom roles, trust tier, and the Atlas (VMs / region / cluster-access) console —
see the companion spec [central-console-ui.md](central-console-ui.md).

## Where it lives

- A set of **frappe-ui** screens inside Central's existing console shell — the same
  `Sidebar` + `router-view` app shell, mounted under a **Billing** sidebar group.
  No new SPA, no bespoke `/billing` route tree of its own; the routes are Central
  router children.
- Built with **frappe-ui** components and **semantic Tailwind tokens** only
  (`bg-surface-*`, `text-ink-*`, `border-outline-*`) — never raw colors, never
  hand-rolled controls. Color encodes state only (status badges, destructive
  actions, error messages); the rest is neutral ink-gray/surface.
- Data through **`useCall` / `useList`** against the whitelisted methods below.
  Never `fetch`/`axios`. Reads auto-fetch on mount; writes are
  `immediate: false` + `submit(params)` triggered on action.

### App shell — sidebar is fixed on the **left**

The three-zone shell never changes: the **`Sidebar` is pinned on the left** (app
nav: Billing group + the Team/Atlas groups from
[central-console-ui.md](central-console-ui.md)), the **main content** fills the
center, and a record's **detail panel opens on the right** (split view, below).
The right-hand detail panel is *not* the sidebar and never displaces it — left nav
and right detail can both be visible at once on desktop.

```
┌──────────┬──────────────────────────────────┬─────────────────┐
│ Sidebar  │  Main content (list / page)      │ Detail panel    │
│ (LEFT,   │                                  │ (RIGHT, ~480px, │
│  fixed)  │  ← grows                         │  when a row is  │
│  Billing │                                  │  selected)      │
│  Team    │                                  │                 │
│  Atlas   │                                  │                 │
└──────────┴──────────────────────────────────┴─────────────────┘
```

Below `sm:` the **left sidebar** collapses to a drawer (toggled, still slides from
the left) and the detail panel goes full-screen — the sidebar never moves to the
right.

### Reference apps

Match the look and interaction of Frappe's first-party frappe-ui apps; study these
before inventing layouts:

| App | Repo | Borrow |
|-----|------|--------|
| Frappe CRM | github.com/frappe/crm | left sidebar nav, list + side-panel detail, activity feeds |
| Frappe Helpdesk | github.com/frappe/helpdesk | queue lists, status/SLA badges, agent detail panel |
| Frappe HRMS | github.com/frappe/hrms | self-service screens, approval flows, dashboards |
| Frappe Insights | github.com/frappe/insights | charts/visualizations (forecast, usage), dashboards |
| Frappe Builder | github.com/frappe/builder | property panels (right-side editing), drag handles |

### Running locally

The screens are a frappe-ui (Vite) front-end; the dev server runs with **`yarn dev`**
(`yarn install` once), proxying `/api` to the Central bench site. Production builds
with `yarn build` into Central's served assets. (Per the frappe-ui setup: Tailwind
v3 + Vite 5, `optimizeDeps.exclude: ['frappe-ui']`, `app.use(FrappeUI)`.)

## Authorisation model (what the UI may render)

The UI never decides permission itself — it mirrors **Central's capability IAM**.
Every screen is gated by a capability the signed-in member carries on the
**current team** (the Central `Team` DocType), resolved via
`central.iam.can(user, team, capability)`.

| Capability | Carried by team roles | Gates |
|------------|----------------------|-------|
| `billing:view` | `Owner`, `Billing` (+ any custom view-only role, [#45](issues/45-test-suite-update-capability-authz.md)) | Every **read** — the whole portal is visible |
| `billing:manage` | `Owner`, `Billing` | Every **mutation** — pay, top up, edit methods, save settings |

`Admin`, `Developer`, `Viewer` carry **neither** → they get a 403 on billing
endpoints and the UI shows the no-access state (below), not an empty dashboard.

**UI rules that follow from this:**

1. **Gate reads at the shell.** If `can(user, team, "billing:view")` is false, the
   Billing sidebar group resolves to a single no-access page — don't mount the
   child routes. The backend chokepoint is `_resolve_team` → `can(..., "billing:view")`
   ([#42](issues/42-adopt-central-capability-iam.md)); the UI must not appear to
   offer screens the API will 403.
2. **Gate mutations at the control.** A `billing:view`-only member sees every
   screen **read-only**: render the data, but disable/hide every `billing:manage`
   action (Pay, Top Up, Add Card, Save, Reorder, Remove…). Don't rely on the
   server 403 alone — compute `canManage` once from `can(..., "billing:manage")`
   and bind it to `:disabled` / `v-if` on action controls. The server remains the
   source of truth (`_require_manage` re-checks every mutation), but the UI should
   not present a button that will only fail.
3. **Current-team scoping.** All endpoints auto-scope to the resolved team; the UI
   never sends a `team` it got from the client as authority. Multi-team users pick
   the current team through Central's existing team switcher — the billing screens
   inherit it. Passing another team's name is an IDOR and 403s
   (`PermissionError`); the UI surfaces that as the no-access state.

```ts
// composables/useBillingCaps.ts — computed once, drives every screen
import { useCall } from 'frappe-ui'
import { computed } from 'vue'

// Central exposes the current member's capabilities for the active team.
const caps = useCall<string[]>({ url: '/api/v2/method/central.iam.my_capabilities' })

export const canView   = computed(() => caps.data?.includes('billing:view') ?? false)
export const canManage = computed(() => caps.data?.includes('billing:manage') ?? false)
```

```vue
<!-- every manage action binds canManage -->
<Button
  v-if="canManage"
  variant="solid" theme="gray"
  label="Pay Now"
  :loading="payInvoice.loading"
  @click="pay"
/>
<Tooltip v-else text="You need the Billing or Owner role to pay invoices.">
  <Button variant="solid" theme="gray" label="Pay Now" disabled />
</Tooltip>
```

## Money display

All settled money arrives as **integer minor units** (paisa/cent) per
[ADR 0003](docs/adr/0003-money-as-integer-minor-units.md). The UI **never** does
money math — the backend rounds once and returns minor units plus a `currency`.
Format for display only:

```ts
// utils/money.ts — display-only; mirrors backend utils.money
const SYMBOL: Record<string, string> = { INR: '₹', EUR: '€', USD: '$' }
const FACTOR: Record<string, number> = { INR: 100, EUR: 100, USD: 100 } // ISO-4217 minor digits

export function money(minor: number, currency: string): string {
  const f = FACTOR[currency] ?? 100
  const major = (minor / f).toLocaleString(undefined, { minimumFractionDigits: 2 })
  return `${SYMBOL[currency] ?? ''}${major}`
}
// money(123450, 'INR') => "₹1,234.50"
```

A team has a **single billing currency** at launch; every amount on its screens is
in that one currency. Never sum minor amounts across currencies in the UI.

## List & detail layout (shared)

Data screens follow one layout so the portal reads like the rest of Frappe (CRM /
Helpdesk / Insights). These conventions apply to Invoices, Payment History,
Payment Methods, Credits, Subscriptions — and to the Atlas/Team lists in
[central-console-ui.md](central-console-ui.md).

- **Split view, not modal-for-detail.** A list grows on the left; selecting a row
  opens a **fixed ~480px detail panel on the right** (`border-l border-outline-gray-1`),
  not a modal. Reserve `Dialog` for *actions* (Pay, Top Up, Add card, confirm), not
  for *viewing* a record. (Overusing modals is the most common Frappe-UI smell.)
- **List toolbar.** Each list header carries, left→right: a debounced **search**
  (`TextInput`, ~300ms), a **filter** (`ListFilter` / `Select`), and — where a row
  has a status — a status `TabButtons`. The page's one solid primary stays on the
  right.
- **Detail panel structure.** Header (record name + close ×) → `Tabs`
  (**Details** | **Activity**) → scrollable body → footer actions. *Activity* is the
  record's timeline — for an invoice, its Payment Attempts; for a VM, its event log.
- **Row anatomy** (align into columns, don't float in a flex row): optional avatar/
  icon · primary + secondary text · **status `Badge`** (fixed-width slot) · relative
  timestamp · row `Dropdown` (⋯). See PATTERNS layout principle #1.
- **Loading = skeletons, not spinners.** First load renders the list/panel shell with
  `LoadingText` placeholder rows; never blank the screen or center a `Spinner`.
- **Mobile.** Below `sm:`, the Central sidebar collapses to a drawer, the detail
  panel goes **full-screen** over the list, and toolbars stack. Verify with the
  app's dark-mode + mobile toggles before calling a screen done.

> **Status colors via `statusTheme`, never raw classes.** External pattern guides
> (e.g. lubusIN's `frappe-ui-patterns`) map statuses to raw `bg-green-100
> text-green-700`; this project overrides that with **semantic tokens only** — map
> each status to a `Badge` `theme` in one `statusTheme()` helper (PATTERNS → Status
> badges) and let the token system handle light/dark. Never write a raw color class.

## Screen map

```
Billing  (sidebar group, gated by billing:view)
├─ Overview              /billing                 get_team_overview, get_forecast, get_credit_balance, get_trust_tier
├─ Invoices              /billing/invoices        list_invoices  →  get_invoice (detail)
├─ Payment Methods       /billing/methods         list_payment_methods, get_payment_method_options
├─ Credits               /billing/credits         get_credit_balance, credit_ledger
├─ Payment History       /billing/payments        list_payment_attempts
├─ Subscriptions         /billing/subscriptions   list_subscriptions
└─ Settings              /billing/settings        get_billing_profile, get_billing_settings
```

Each row is a Central router child rendered inside the shared shell. The header of
each page is the standard 48px sticky `Breadcrumbs` + actions row (PATTERNS → Page
header).

---

## 1. Overview — `/billing`

The landing page. Answers "what do I owe / what's my balance, and am I in good
standing?" in one screen. Reads: `get_team_overview`, `get_forecast`,
`get_credit_balance`, `get_trust_tier`.

The headline block has **two variants** keyed off the team's settlement mode
(`get_billing_settings.mode`):

- **Postpaid (autopay):** show **Amount outstanding** (sum of open invoices) with a
  **Pay Now** action; show the **forecast** (projected month-end spend).
- **Prepaid (credits-only):** show **Wallet balance** with a **Top Up** action;
  show the **80% top-up alert** when `forecast.projected_total ≥ 0.8 × balance`
  (credits-only gating, [credits.md](credits.md)).

```
┌─ Billing ▸ Overview ───────────────────────────────────── [Trust: Established ★]
│
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  │ Amount outstanding   │  │ This month (forecast)│  │ Account standing     │
│  │ ₹12,480.00           │  │ ₹18,900.00 projected │  │ ● Current            │
│  │ 2 open invoices      │  │ 11 days remaining    │  │ running              │
│  │ [ Pay Now ]          │  │ ▓▓▓▓▓▓░░░░ 64%        │  │                      │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
│                                                    (postpaid variant)
│  ─── Recent invoices ──────────────────────────────────────────────────────
│   INV-2026-0041   May 2026   ₹6,240.00   ● Unpaid    [View]
│   INV-2026-0032   Apr 2026   ₹6,240.00   ● Paid      [View]
│
│  ─── prepaid variant of the first card ───
│  ┌──────────────────────┐
│  │ Wallet balance       │   ⚠ Projected spend is 82% of your balance.
│  │ ₹4,100.00            │      Top up to avoid a provisioning hold.
│  │ [ Top Up ]           │
│  └──────────────────────┘
```

- The two **account-standing axes** are distinct ([architecture.md](architecture.md)):
  `account_standing` (`current` / `past_due` / `suspended`, Central) and the
  operational state (`running` / `stopped` / `terminated`, Agent). Render them as
  two `Badge`s, never collapsed into one. `statusTheme`: current→green,
  past_due→orange, suspended→red.
- Stat blocks are **section surfaces, not boxed cards for decoration** — a heading +
  number, color only on the standing badge and the alert. Forecast bar is
  `Progress`. (PATTERNS layout principles #3, #6.)
- **Pay Now** / **Top Up** are `billing:manage` — gated by `canManage`. They open
  the dialogs in §2 / §4.

---

## 2. Invoices — `/billing/invoices` + detail

**Split view** (List & detail layout, above): the invoice **list** grows on the
left; selecting a row opens the **detail panel** on the right — not a modal.

**List** (`list_invoices`) via `ListView` with the standard toolbar (debounced
search by invoice #, period filter, status `TabButtons`): columns Invoice #,
Period, Amount, Status. Status `Badge` via `statusTheme`: Paid→green, Unpaid→
orange, Overdue→red, Void→gray.

**Detail panel** (`get_invoice`), ~480px, `Tabs`:
- **Details** — line items (each via the backend's `_describe_line`), the tax block
  (GST additive / SEZ zero-with-reason / TDS note, [tax.md](tax.md)), totals, and
  **Download PDF**.
- **Activity** — this invoice's **Payment Attempts** timeline (`list_payment_attempts`
  filtered to the invoice): each attempt with method, amount, result, and the next
  scheduled retry — the same data as the Payment History screen, scoped to one
  invoice. Footer carries **Pay Now** (`canManage`).

```
┌─ Billing ▸ Invoices ──────────────────────────────────────────────────────┐
│ 🔎 search   [Period ▾] [All·Unpaid·Paid·Overdue]          │ INV-2026-0041 ✕ │
│ Invoice #      Period    Amount      Status               │ Details  Activity│
│ ▸INV-2026-0041 May 2026  ₹6,240.00   ● Unpaid             │ ───────────────  │
│  INV-2026-0032 Apr 2026  ₹6,240.00   ● Paid               │ Compute Bundle   │
│  INV-2026-0021 Mar 2026  ₹5,980.00   ● Paid               │   30d×₹120 ₹3,600│
│                                                           │ Bandwidth   ₹640 │
│                                                           │ ──────────────── │
│                              (list grows)                 │ Subtotal  ₹4,240 │
│                                                           │ GST 18%     ₹763 │
│                                                           │ Total   ₹5,003.20│
│                                                           │ [Download PDF]   │
│                                                           │ ───────────────  │
│                                                           │ [ Pay Now ] ⤴    │
└───────────────────────────────────────────────────────────┴─────────────────┘
   (Activity tab → INV-2026-0041 attempts)
   2026-05-03  Visa ••4242  ₹5,003.20  ● Failed (insufficient funds)
   2026-05-01  Visa ••4242  ₹5,003.20  ● Retry scheduled (Day 3)
```

### Pay Invoice — `pay_invoice`  *(billing:manage)*

Postpaid action. **Pay Now** → confirm dialog → `pay_invoice.submit({ invoice })`.

- The charge is **webhook-driven**: the API kicks off a Payment Attempt; the UI must
  **not** flip the invoice to Paid on the method response ([payments.md](payments.md)).
  Show an optimistic "Payment initiated" `toast.info` and let the invoice/overview
  reload reflect Paid when the webhook lands (poll the resource or rely on realtime).
- Settlement runs the **credits-then-card waterfall** server-side; the dialog states
  what will be used ("₹2,000 credits + ₹3,003.20 card") from the overview/forecast
  fields, but the UI computes nothing.

```ts
const payInvoice = useCall({
  url: '/api/v2/method/billing.api.dashboard.pay_invoice',
  method: 'POST', immediate: false,
  onSuccess: () => toast.info('Payment initiated — we’ll update the invoice when it clears.'),
  onError: (e) => toast.error(e.message),
})
function pay(invoice: string) {
  dialog.confirm({
    title: 'Pay this invoice?',
    message: `${money(inv.total, inv.currency)} will be charged via your default method.`,
    confirmLabel: 'Pay',
    onConfirm: () => payInvoice.submit({ invoice }),
  })
}
```

---

## 3. Payment Methods — `/billing/methods`

Reads `list_payment_methods` (the saved cards/mandates, priority order) +
`get_payment_method_options` (what can be added: gateway-by-currency, UPI Autopay
eligibility). All mutations here are `billing:manage`.

`get_payment_method_options` drives **which add-buttons render**
([payments.md](payments.md)):

- INR team → Razorpay **card** + **UPI Autopay** (mandate).
- USD/EUR team → Stripe **card** only.
- **UPI Autopay** offered only when `options.upi_eligible` is true (mandate cap =
  trust-tier cap; `mandates.upi_eligibility`). When ineligible, show the option
  disabled with the reason in a `Tooltip`.

```
┌─ Billing ▸ Payment Methods ──────────────────────  [+ Add card] [+ Add UPI Autopay]
│  ⠿  Visa •••• 4242        default     active     ⋯
│  ⠿  UPI  user@okhdfc      mandate ₹1,00,000/mo    active     ⋯   (cap = trust tier)
│  ⠿  Mastercard •••• 5100             active     ⋯
│        ⋯ menu → Set as default · Move up/down · Remove
└──────────────────────────────────────────────────────────────────────────
```

Rows are reorderable (drag handle `⠿`); the priority is the **fallback order**
("escalate, don't repeat" — [#28](issues/28-secondary-payment-method-fallback.md)). Each row
has a `Dropdown` (⋯) with Set as default / Remove; reorder commits the new order.

| Action | Endpoint | Notes |
|--------|----------|-------|
| Add card (start) | `initiate_card_setup` | returns gateway client params for the card sheet |
| Add card (finish) | `confirm_card` | after the gateway tokenizes; **micro-charge validation** (₹1 / $0.50) moves it `pending_validation → active`; **no duplicate card** |
| Add UPI / mandate (start) | `setup_payment_method_order` | only when `upi_eligible`; creates the mandate order |
| Add UPI / mandate (finish) | `confirm_payment_method_order` | mandate activates after gateway approval |
| Set default | `set_default_payment_method` | one default; drives autopay |
| Reorder | `reorder_payment_methods` | new priority/fallback order |
| Remove | `remove_payment_method` | confirm dialog (`theme: 'red'`); blocked if it's the team's only settlement source |
| Demo card (seed only) | `add_demo_card` | demo/seed convenience only — not a production UI affordance |

Card entry uses the **gateway's hosted element** (Stripe/Razorpay sheet) inside a
`Dialog`; raw PAN never touches our form or our DocTypes. The two-step
start→confirm shape is the same for cards and mandates: open dialog → start order →
hand to gateway → on gateway success call confirm → `toast.success` + reload list.

```ts
const startCard   = useCall({ url: '/api/v2/method/billing.api.dashboard.initiate_card_setup', method: 'POST', immediate: false })
const confirmCard = useCall({ url: '/api/v2/method/billing.api.dashboard.confirm_card',        method: 'POST', immediate: false,
  onSuccess: () => { toast.success('Card added'); methods.reload() } })
```

---

## 4. Credits — `/billing/credits`

Prepaid wallet. Reads `get_credit_balance` (balance + currency) and `credit_ledger`
(the **append-only** ledger; never a stored scalar — [credits.md](credits.md)).

```
┌─ Billing ▸ Credits ─────────────────────────────────────────  [ Top Up ]
│  Wallet balance   ₹4,100.00
│  ─── Ledger ───────────────────────────────────────────────────────────
│  Date         Type                Amount        Balance after
│  2026-05-12   Top-up           + ₹5,000.00       ₹9,100.00
│  2026-05-01   Invoice settle   − ₹5,003.20       ₹4,096.80   INV-2026-0032
│  2026-04-18   Refund           + ₹   3.20        ₹9,100.00   overcharge
└────────────────────────────────────────────────────────────────────────
```

- Ledger via `ListView`; `entry_type` → `Badge` (credit→green, debit→gray);
  amounts shown with explicit `+ / −`; `running_balance` is the server's exact
  integer sum — display only.
- The **80% top-up forecast alert** also surfaces here as an `Alert theme="orange"`
  when applicable (same condition as Overview).

### Top Up — `create_topup_order` → `confirm_topup`  *(billing:manage)*

Two-step like card setup: a `Dialog` collects the amount (`FormControl` numeric,
plus quick chips like ₹2,000 / ₹5,000 / ₹10,000), `create_topup_order.submit({ amount })`
returns gateway params, the gateway collects payment, then
`confirm_topup.submit({ order })` books the **credit** ledger entry. On success,
`toast.success` and reload balance + ledger.

> Older docs reference `purchase_credits` / `credits.purchase` as a one-shot. The
> rebuilt UI uses the **order → confirm** pair (`create_topup_order` / `confirm_topup`)
> so the credit is only booked after the gateway confirms — webhook-consistent with
> the rest of billing. `purchase_credits` remains whitelisted for compatibility but
> is not the primary flow.

---

## 5. Payment History — `/billing/payments`

`list_payment_attempts` via `ListView`: each attempt with date, invoice, method,
amount, and **result** badge — including **failed retries** (dunning Day 1/3/7,
[#14](issues/14-retry-dunning-suspension.md)). Read-only; no manage actions. This is where a customer
sees *why* a charge failed and what the next retry is.

```
Date         Invoice          Method            Amount       Result
2026-05-03   INV-2026-0041    Visa •••• 4242    ₹5,003.20    ● Failed (insufficient funds)
2026-05-01   INV-2026-0041    Visa •••• 4242    ₹5,003.20    ● Retry scheduled (Day 3)
2026-04-01   INV-2026-0032    UPI Autopay       ₹5,003.20    ● Succeeded
```

Result `Badge`: Succeeded→green, Failed→red, Retry scheduled→orange,
Processing→blue.

---

## 6. Subscriptions — `/billing/subscriptions`

`list_subscriptions` — the team's plan **intent/contract** (Central's
`Subscription` records intent; the Agent records what ran —
[architecture.md](architecture.md)). Read-only in this customer surface: bundle/
plan, region×currency rate, current price-locked rate, and the two state axes.
(Plan change/configurator flows — [#30–#33](issues/README.md) — are a separate
surface; this page lists and links, it doesn't mutate here.)

---

## 7. Settings — `/billing/settings`

Two sections (Settings-panel pattern: vertical `Tabs` left, form right). Both saves
are `billing:manage`.

### Billing profile — `get_billing_profile` / `save_billing_profile`
Legal name, billing email, address, tax IDs (GSTIN / PAN; SEZ flag feeds the tax
block). `FormControl` fields, `space-y-4`, Cancel/Save pair.

### Billing settings — `get_billing_settings` / `save_billing_settings`
- **Settlement mode**: `Select` postpaid (autopay) / prepaid (credits-only) — this
  is the toggle the Overview headline keys off.
- **Thresholds**: minimum balance / spend alert (`FormControl` numeric, minor-unit
  aware) — feed the 80% top-up forecast and dunning notifications.
- **Notification preferences**: which billing events email the team
  ([#20](issues/20-notification-suite.md), Central is the sole sender) —
  `Switch` rows per event class (invoices, payment failures, top-up reminders).

```
┌─ Billing ▸ Settings ────────────────────────────────────────────────────
│  ┌ Profile ┐                  Settlement mode   ( • Postpaid  ○ Prepaid )
│  │ Profile │                  Spend alert at     [ ₹15,000.00        ]
│  │ Billing │                  Min wallet balance [ ₹ 2,000.00        ]
│  │ Notify  │                  ───────────────────────────────────────
│  └─────────┘                  Email me about
│                                 [✓] New invoices
│                                 [✓] Payment failures
│                                 [✓] Top-up reminders
│                                            [ Cancel ]  [ Save ]
```

---

## Cross-cutting UI rules

- **No-access state.** When `billing:view` is false (or an IDOR 403 comes back),
  render a single centered empty-state: "You don't have access to billing for this
  team" + which roles grant it (Owner / Billing). Don't show a broken dashboard.
  (Empty-state pattern.)
- **Loading.** First load renders the page shell + `LoadingText` placeholders in
  content slots — never blank the screen. Buttons bind `:loading` to their call's
  `.loading`. (PATTERNS loading states.)
- **Errors.** Surface `call.error?.message` inline next to the action with
  `ErrorMessage`; transient failures use `toast.error`. Never swallow a 403 — it
  means a capability gap and should route to the no-access state.
- **Confirmations** use imperative `dialog.confirm` (Pay, Remove method,
  destructive). Never hand-mount a confirm `<Dialog>`.
- **One primary action per page** (`variant="solid" theme="gray"`): Pay Now on
  Overview/Invoice, Top Up on Credits, Save on Settings. Everything else `subtle`.
- **Webhook-truth, not response-truth.** Pay and Top-Up reflect success only after
  the gateway webhook updates the record. The UI shows "initiated" and reloads;
  it never marks Paid / credits-booked from the synchronous method return.
- **Dark mode.** Semantic tokens only, so `[data-theme="dark"]` just works — verify
  before declaring a screen done.

## Endpoint → screen index

| Endpoint | Capability | Screen |
|----------|-----------|--------|
| `get_team_overview` | view | Overview |
| `get_forecast` | view | Overview (forecast card) |
| `get_trust_tier` | view | Overview (badge) |
| `get_credit_balance` | view | Overview, Credits |
| `list_invoices` | view | Invoices (list) |
| `get_invoice` | view | Invoices (detail) |
| `list_payment_attempts` | view | Payment History |
| `credit_ledger` | view | Credits (ledger) |
| `list_payment_methods` | view | Payment Methods |
| `get_payment_method_options` | view | Payment Methods (which add-buttons) |
| `list_subscriptions` | view | Subscriptions |
| `get_billing_profile` | view | Settings (profile) |
| `get_billing_settings` | view | Settings (billing), Overview variant key |
| `pay_invoice` | manage | Invoices / Overview — Pay Now |
| `create_topup_order` → `confirm_topup` | manage | Credits — Top Up |
| `purchase_credits` | manage | Credits (legacy one-shot; superseded by order→confirm) |
| `initiate_card_setup` → `confirm_card` | manage | Payment Methods — Add card |
| `setup_payment_method_order` → `confirm_payment_method_order` | manage | Payment Methods — Add UPI/mandate |
| `set_default_payment_method` | manage | Payment Methods — Set default |
| `reorder_payment_methods` | manage | Payment Methods — Reorder |
| `remove_payment_method` | manage | Payment Methods — Remove |
| `add_demo_card` | manage | (demo/seed only) |
| `save_billing_profile` | manage | Settings — Save profile |
| `save_billing_settings` | manage | Settings — Save billing/notify |

Every endpoint above is the **existing** whitelisted billing method
([#42](issues/42-adopt-central-capability-iam.md)); this UI adds **no new backend
surface** — it composes frappe-ui screens over them inside Central
(ADR 0004 §5).

## Per-screen checklist (definition of done)

Before a screen ships, confirm:

- [ ] **Capability-gated** — reads behind `billing:view`; every mutating control
  bound to `canManage`; no-access state for missing `view` / IDOR 403.
- [ ] **frappe-ui components only** — no hand-rolled buttons/inputs/dialogs; no
  `Card` (compose surfaces); icons as `lucide-*` spans.
- [ ] **Semantic tokens only** — `surface/ink/outline`; status via one
  `statusTheme()`; no raw `bg-*-100`/`text-gray-*`.
- [ ] **Split view for records** — list + ~480px detail panel; `Dialog` only for
  *actions*, never to *view* a record.
- [ ] **List toolbar** — debounced search + filter + status `TabButtons`.
- [ ] **States present** — skeleton (`LoadingText`) first-load, empty state with
  CTA, inline `ErrorMessage`; never a bare spinner or blank screen.
- [ ] **Money** — rendered via `money()` from minor units; the UI does no math.
- [ ] **Webhook-truth** — Pay/Top-Up show "initiated" and reload on webhook; never
  mark Paid/credited from the synchronous return.
- [ ] **One solid primary** per page; everything else `subtle`/`ghost`.
- [ ] **Data via `useCall`/`useList`** — reads auto-fetch, writes `immediate:false`
  + `submit`; no `fetch`/`axios`/`createResource`.
- [ ] **Responsive + dark mode** — sidebar→drawer and detail→full-screen below
  `sm:`; verified under `[data-theme="dark"]`.

> Pattern sources: the official **frappe-ui** skill (component + token rules,
> authoritative here) and lubusIN's
> [`frappe-ui-patterns`](https://github.com/lubusIN/frappe-skills/blob/main/frappe-ui-patterns/SKILL.md)
> (split-view, list toolbar, detail-panel tabs, skeleton-over-spinner, mobile).
> Where they conflict — lubusIN's **raw color classes** vs frappe-ui's **semantic
> tokens** — the semantic-token rule wins.
