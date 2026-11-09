# Progress and coverage

Snapshot: central `upstream/develop` at `a95b491e`, 9 Nov 2026.

Evidence reached: E1–E2 (code). No phase reached E4 (operational). The next stage is
measurement: [roadmap stage A](10-final-assessment/prioritized-roadmap.md#stage-a-verify-and-measure-read-only).

## Phases

| Phase | Status | Deliverables | Next targets it raised |
|---|---|---|---|
| 1. System discovery | Done | 01-discovery (4 files) | Razorpay timeout; Entitlement Token leftovers |
| 2. Domain and data model | Done for billing DocTypes | 02-domain-model (4 files) | Team standing ownership; Central vs ERPNext totals |
| 3. Workflow reconstruction | Done (17 workflows, 7 customer journeys, screen teardown) | 03-workflows (4 files) | Prepaid meaning; auto-restart copy |
| 4. Financial correctness | Done, static | 04-financial-integrity (2 files) | Measure tax drift (Q-02) |
| 5. Integrations | Done | 05-integrations (2 files) | ERPNext retry exhaustion |
| 6. Background processing | Done | 06-processing (2 files) | Missed-tick catch-up (Q-13) |
| 7. Failure and recovery | Done, static | 07-resilience (3 files) | Console false success; error mapping |
| 8. Support operations | Done | 08-operations (2 files) | Desk actions for 7 console tasks |
| 9. Observability and security | Done, structural | 09-security (2 files) | Finance role; permission hooks |
| 10. Final assessment | Done | 10-final-assessment (5 files) | — |

## Product teardown

| Checkpoint | Scope | Status | Evidence |
|---|---|---|---|
| 1 | D1 billing setup and payment methods; D2 invoices and collection | Done, reviewed 9 Nov 2026 | E2 + E4 |
| 2 | D3 cost visibility and limits; D4 wallet and credits | Done, reviewed 9 Nov 2026 (D-12 to D-15 decided) | E2 + E4 + Seen (demo, 1440 px) |
| 3 | D5 subscriptions and projects, D6 purchase-time billing, D7 operator back office | Done, reviewed 9 Nov 2026 (D-16, D-17 decided) |
| 4 | Open points; D8 metered services (Cargo, Grove) | **Done, waiting for review** | E2 + E4 + Seen (central.local) + both service repos | E2 + E4 + Seen (demo: Subscriptions card, Desk home) |

Output so far: 48 problems (CB-01 to CB-49; CB-22 deferred by decision), 5
hypotheses (2 refuted, 2 confirmed, 1 open), 2 suggestions, 35 strengths, 18
missing capabilities, 24 decisions (9 decided; briefs for the rest), 44 issues in
`issues/146`–`189`.
Browser pass done at 1440 px on `demo-billing.localhost` with a test user created
there, plus an operator test user for Desk. Open-points pass on central.local:
add-method end to end in Stripe test mode (success and abandoned authentication),
phone width via a 390 px frame. Still not done: screen reader, Pay end to end (no
open invoice on the test teams), the New server page (neither test site has
tiers and images), Plan Configurator in depth.

## What was read

| Area | Scope |
|---|---|
| Customer console | `dashboard/src/pages/billing/*` (3), `components/billing/*` (37), `AddMethodDialog.vue`, `TopupDialog.vue`, billing composables, `lib/feedback.ts`, `lib/dunning.ts`; billing parts of onboarding and server create/resize |
| Backend | `central/billing/api/**`, `states.py`, `authz.py`, the domain functions those call; all 52 DocType JSON files; `central/hooks.py` scheduler and doc events |
| Integrations | `gateways/*_adapter.py`, `ingester/*`, `payments/webhooks.py`, `platform/alerts.py` |
| Desk | Billing workspace JSON, every billing DocType JS with custom buttons, Team form buttons, report list |
| Docs | `central/billing/ARCHITECTURE.md` as a map; claims cited here were checked in code |

## Not covered

- No browser session: layout at phone width, focus order, screen-reader output.
- No production or staging data: frequencies are estimates from code paths.
- The 41 reports and the Billing Simulator Desk page were listed, not reviewed.
- No probes were run; payment security depth is in the 23 Oct 2026 audit and
  issues 128–145.
- Atlas, signups and services were read only at their billing touch points.
