# 11 — Credit application at invoice (waterfall + wallet gating)

**Type:** AFK · **Milestone:** Phase 3 · **Spec:** [credits.md](../credits.md), [invoicing.md](../invoicing.md)

## What to build

At open-and-collect, apply credits **first** (under `FOR UPDATE`), reducing the amount due, then charge the remainder to the card (waterfall). For **credits-only** teams, the effective entitlement cap is `min(tier cap, wallet-covered spend)`, and the forecast notifies at ~80% of balance; the next token refresh shrinks the cap before an overspend, while running resources are never stopped for this.

## Acceptance criteria

- [ ] Credits applied first under `FOR UPDATE`; `credit_applied` recorded on the invoice; remainder charged to card.
- [ ] Credits-only team: cap = `min(tier cap, wallet-covered spend)`; provisioning denied beyond wallet coverage.
- [ ] Forecast-driven top-up notification fires at ~80% of balance.
- [ ] Residual shortfall at settlement flows into dunning (#14), not an immediate stop.
- [ ] At-least-one-settlement-source enforced at onboarding (card or credits).

## Blocked by

- #06
- #09
