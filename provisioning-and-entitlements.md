# Provisioning & Entitlements

## Purpose

Define how a regional cluster authorises provisioning **offline** against a Central-issued cap, and
how the cap (trust tier) is computed. Kept custom — this is platform identity/enforcement, not
accounting, so the ERPNext re-base leaves it intact.

## Trust tier is the cap

The entitlement **cap** is the team's **trust tier**, computed from billing history (payment
reliability, tenure, spend). The cluster knows only the cap; it never sees billing internals. Trial
/ free is the **entry tier** (small cap, single-cluster) — see [subscriptions.md](subscriptions.md).

**Trust Tier / Trust Tier Level** (custom DocTypes) hold the tier definitions and the team's current
tier. The tier drives:
- the provisioning cap on the entitlement token,
- the mandate ceiling (`mandate_max_amount` = tier cap, [payments.md](payments.md)),
- for credits-only teams, `effective_cap = min(tier cap, wallet-covered spend)` ([credits.md](credits.md)).

## Entitlement token (offline enforcement)

Central issues an **Entitlement Token** — an **Ed25519-signed** statement of the team's cap and
standing, with a short TTL and a refresh cadence. The Agent **verifies it locally** (the public key
is distributed to clusters) and authorises provisioning without a Central round-trip — so
provisioning survives a Central outage, and a cap change propagates on the next token refresh.

| Field (Entitlement Token) | Notes |
|---------------------------|-------|
| team | the capped team |
| cap | provisioning ceiling (from trust tier; or `min(tier, wallet)` for credits-only) |
| account_standing | current / past_due / suspended — drives enforcement |
| issued_at / expires_at | short TTL |
| signature | Ed25519 over the canonical payload |

## Enforcement & suspension

Account standing (Central, payment-derived) flows to the cluster via the token:

- `current` — provision freely up to the cap.
- `past_due` — grace; running resources keep running, new provisions allowed per policy.
- `suspended` — directive to **stop**, then (after the dunning window) **terminate**. An **expired
  token keeps the resource running** but denies *new* provisions — enforcement is fail-safe, not
  fail-destructive.

Dunning (Day 1/3/7 → Overdue → suspend → terminate) is driven by the Sales Invoice payment state
([payments.md](payments.md)); the suspend/terminate directives reach the cluster through the next
token.

## Cap shrink before overspend (credits-only)

For credits-only teams the forecast continuously compares projected month-end spend to the wallet
balance. At ~80% the team is notified; the **next token refresh shrinks the cap** to deny new
provisions *before* an overspend. Running resources are never stopped for this — only the residual
shortfall at settlement enters normal dunning. See [credits.md](credits.md).

## Notes

- The signed-token model is what lets clusters enforce **offline**; ERPNext/payments are never on the
  provisioning hot path.
