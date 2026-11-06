# 133 — Finish the PayPal integration

**Type:** AFK · **Milestone:** SA · **Area:** `central/billing/payments/webhooks.py`, `central/billing/gateways/paypal_adapter.py`

## Problem

PayPal can take money but Central cannot hear back from it. There is no PayPal webhook receiver. A `PENDING` capture maps to Failed, so collection can fall back to the next method while PayPal still takes the money. Every 4xx is a decline, including duplicate and in-progress responses. Each request fetches a new OAuth token. `api_base` is free text, so the client secret goes to whatever host is entered.

## TODO

- [ ] Add a PayPal receiver, verified through PayPal's verify-webhook-signature API.
- [ ] Map `PENDING` to an open attempt. Treat 409 and duplicate 422 responses as an unknown outcome.
- [ ] Cache the OAuth token until it expires. Read credentials through `get_credential`.
- [ ] Subscribe `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.REVERSED`, `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.RESOLVED`, `VAULT.PAYMENT-TOKEN.DELETED`.
- [ ] Allow only the PayPal live and sandbox hosts in `api_base`.

## Acceptance criteria

- [ ] A PENDING capture that later completes settles the invoice once and triggers no fallback charge.

## Source

Found in the billing security audit of 23 Oct 2026 (bench-local report `docs/bug-reviews/central-billing/security-audit-2026-10-23.md`, kept out of this public repo).

## Blocked by

—
