# Entity ownership and sources of truth

Snapshot `a95b491e`. For each critical fact: who owns it, where copies live, and
whether the copies can disagree.

## Ownership table

| Fact | Owner (source of truth) | Copies | Can the copies disagree? | Guard |
|---|---|---|---|---|
| Team currency | `Billing Profile.currency` | Credit Wallet name, Invoice.currency, Payment Method `mandate_currency` | Only if a lock fails | Locks after activity (`billing_profile.py:304,433`) |
| Price a team pays for a resource | `Subscription Change.locked_rate` (ADR 0010) | `Usage Rollup.locked_rate` for metered; `Catalog Rate` is the list price | Intended to differ from list price | Append-only (`subscription_change.py:45`) |
| What ran and for how long | Subscription Change rows (segments) | Billing Event stream | No: Billing Event is derived and banned from decisions (`states.py:7-11`) | Grep test |
| Wallet balance | Sum of `Credit Ledger Entry` | `Credit Wallet.balance`, each entry's `running_balance`, ERPNext advance balance | Yes | Daily invariant audit: `check_wallet_matches_ledger`, `check_running_balance_chain` (`platform/invariants.py:82,143`) |
| Amount the customer owes for a period | `Invoice.total` / `expected_collection` (Central) | ERPNext Sales Invoice `grand_total` / `outstanding_amount` | **Yes.** Tax is computed twice (see [calculation-risks.md](../04-financial-integrity/calculation-risks.md) R-01). | Payment entry posts `min(attempt.amount, outstanding)` (`ingester/erpnext_sync.py:323`), which hides a difference rather than flagging it |
| Invoice paid | `Invoice.status = Paid` (set from webhook) | Payment Attempt `Captured`, ERPNext outstanding 0 | Yes, during the webhook gap | `check_paid_invoice_is_covered`, `check_captured_matches_amount_paid` (`invariants.py:226,317`), reconciliation hourly |
| Legal tax invoice and number | ERPNext Sales Invoice | `Invoice.erpnext_invoice`, `pdf_url` | No | — |
| Team standing (Current / Past Due / Suspended) | **No single owner.** Stored on every `Subscription.account_standing`. | — | **Yes.** See below. | none |
| Spending limit | `Trust Tier Level` × currency, or `Billing Profile.override_max_spend` | `Billing Profile.trust_tier` (Data copy of the level) | Copy can go stale | none found |
| Payment method order | `Payment Method.priority` | `Subscription.default_payment_method`, `Subscription.gateway` (19 references in code) | Yes | none found |
| Card is usable | Gateway | `Payment Method.status`, expiry fields | Yes (network renewals: issue 129) | monthly `expire_payment_methods` |
| GSTIN active | GST portal (through ERPNext) | `Billing Profile.gst_status`, `gst_category` | Yes, until next check | daily `run_gst_status_refresh`, customer "Check again" |

## Team standing has three definitions

Dunning moves a team's standing by updating every subscription row
(`catalog/subscriptions.py:1162-1230`). New rows are always created `Current`
(`catalog/subscriptions.py:120,328`, `catalog/snapshots.py:33`,
`catalog/public_ips.py:53`). Readers then disagree on how to read it:

| Reader | How it decides | File |
|---|---|---|
| Console team overview | The `account_standing` of whichever Subscription row the database returns first | `api/dashboard/account.py:291` |
| Dunning, projects, outlook | An "anchor subscription" | `revenue/dunning.py:391,416`, `api/dashboard/projects.py:68`, `api/dashboard/outlook.py:241` |
| Provision gate, "behind on payment" | Any row off Current, or any Overdue invoice | `payments/settlement.py:153-161` |

A Past Due team that adds a snapshot or IP gets a new `Current` row. The console
overview can then show "Current" while dunning treats the team as Past Due.
**Inferred**, not reproduced. Standing belongs on the team (Billing Profile), with
subscriptions reading it.

## Duplicated or inconsistent representations

| # | Duplication | Risk | Proposed change (on hold) |
|---|---|---|---|
| D-1 | Invoice amounts in Central and in ERPNext, tax computed by each | Paise drift between amount charged and tax invoice | Push Central's tax rows to ERPNext as actual amounts, or read ERPNext's back before charging |
| D-2 | Wallet balance in ledger, wallet row, running balance and ERPNext advances | Drift (the 3 Nov commit "book the missing credit of a wallet above its ledger" shows it has happened) | Keep the audit; make the wallet row a pure cache rebuilt from the ledger |
| D-3 | `account_standing` on every subscription | Three readers, three answers | Move to Billing Profile |
| D-4 | `trust_tier` Data copy next to `trust_tier_level` Link | Stale label in lists and reports | Drop the copy; use a fetch-from field |
| D-5 | Per-subscription `default_payment_method` and `gateway` next to the team order | Two sources for "which card pays" | Remove from Subscription, or document when it overrides |
| D-6 | `Entitlement Token` DocType, `entitlements.issue_token` and the signing key | Dead code: `issue_token` (`catalog/entitlements.py:193`) has no caller outside tests and demo | Remove with a patch |
| D-7 | Customer-facing figures recomputed in the browser | See [duplicated-and-low-value-data.md](duplicated-and-low-value-data.md) §4 | Return from the API |
