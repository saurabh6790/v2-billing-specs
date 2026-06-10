# 47 — Invoice `currency` lock

**Type:** AFK · **Milestone:** P3 · **Spec:** [invoicing.md](../invoicing.md), [payments.md](../payments.md)

## What to build

Add a `currency` (Link → Currency) field to the `Invoice` DocType and stamp it at draft generation time from the team's billing currency. This makes the invoice self-describing: the charge path can drive gateway selection from `invoice.currency` rather than looking up the team record, and the door is open for multi-currency per invoice in future without a schema migration.

**Changes:**

- Add `currency` (Link → Currency) to `Invoice`.
- `generate_draft_invoice` sets `invoice.currency = team.currency` when creating the draft.
- `collect_invoice` / `pay_invoice`: resolve the gateway via `gateways.resolve_gateway_for_currency(invoice.currency)` instead of `team.currency`.
- `Payment Attempt` already carries `currency`; confirm it is stamped from `invoice.currency` at attempt creation.

## Acceptance criteria

- [ ] `Invoice` DocType has `currency` field.
- [ ] `generate_draft_invoice` stamps `currency` from the team's billing currency.
- [ ] `collect_invoice` resolves the gateway from `invoice.currency`.
- [ ] `Payment Attempt.currency` is set from `invoice.currency` (not re-derived from the team).
- [ ] Existing invoice generation and charge tests pass; no team-currency reads remain in the charge path.

## Blocked by

- [#09](09-postpaid-invoice-generation-fixed.md)
- [#46](46-multi-currency-gateway-config.md)
