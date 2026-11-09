# Progress and coverage

Snapshot: central `upstream/develop` at `a95b491e`, 9 Nov 2026.

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
