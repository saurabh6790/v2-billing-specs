# Important business workflows (entry points)

Snapshot central `a95b491e` (9 Nov 2026). Phase 1 identifies each workflow by its
entry point and the code read so far. It does **not** reconstruct full behaviour;
that is Phase 3. Each step is marked:

- **E2**: the lines cited were read and the step follows from them.
- **E1**: the step is a registration, an import or a call seen by search, not read.
- **Doc**: taken from `central/billing/ARCHITECTURE.md`, not checked in code.

Paths are under `central/billing/` unless they start with `central/` or `dashboard/`.

| # | Workflow | Entry point | Steps found | Level |
|---|---|---|---|---|
| W-1 | Customer completes billing profile | `api/dashboard/account.py:139` `save_billing_profile` | Currency validation and lock (`api/dashboard/account.py:114-130`); profile completion triggers provisioning (`payments/provisioning.py`, docstring "One-time provisioning when a team completes its billing profile") | E2 for validation lines; provisioning E1 |
| W-2 | Server purchase and subscription | `central/api/servers.py` create endpoints → `central/resource_actions.py` | `central/resource_actions.py` imports billing `catalog`, `revenue`, `payments`, `doctype` (import scan). Subscription rows are created with `account_standing: "Current"` (`catalog/subscriptions.py:120,328`; snapshots `catalog/snapshots.py:33`; IPs `catalog/public_ips.py:53`) | E1 for the chain; E2 for the inserts; full flow Doc (§4A) |
| W-3 | Usage reporting | `api/billing_api.py:623` `report_usage` (guest, pilot credential) | Rollup ingestion `revenue/metering.py:193` `ingest_rollup`; totals may only increase (`metering.py:287`); daily `revenue.storage_usage.record_storage_usage` (`central/hooks.py:312`) | E1 (entry, job); E2 for `metering.py:287` |
| W-4 | Monthly invoice run | `central/hooks.py:327` monthly `draft_monthly_invoices`; hourly `collect_due_invoices` (`:317`) | Page jobs enqueued to `billing_queue()` (`revenue/invoicing/run.py:353,470`); per-team totals: subtotal, commitment, tax, total, expected collection (`revenue/invoicing/generate.py:196-208`); below-minimum write-off (`generate.py:333-350`); unpriced metered usage raises (`revenue/metering.py:477-482`) | E2 for the cited lines; orchestration E1 |
| W-5 | Charge an invoice | hourly `collect_on_payment_date` (`central/hooks.py:318`); customer "Pay now" (`api/dashboard/invoices.py` → `payments/charges.py`) | On-session order: claim attempt, call gateway after the lock, store order id (`payments/charges.py:292-336`); gateway chosen by invoice currency (`charges.py:463-467`) | E2 for `charges.py`; job E1 |
| W-6 | Gateway webhook | `payments/webhooks.py:29,38,48` | Signature check first (`:80`); store with unique event id (`:122-148`); enqueue handler deduplicated (`:150-157`); hourly retry of Failed (`retry_count < 5`) and stale Received (`:217-237`) | E2 |
| W-7 | Dunning, suspension, restore | daily `run_dunning` (`central/hooks.py:302`) | Manual Checkout and Action Required are not retried off-session; Prepaid is (`revenue/dunning.py:326-339`); restore after payment starts servers stopped for non-payment (`catalog/subscriptions.py:1214-1230`, called from `doctype/invoice/invoice.py:118`) | E2 for cited lines |
| W-8 | Collection mode | `api/dashboard/account.py:275` `set_collection_mode` | `payments/collection_mode.py:171-194` `choose`; `is_debit_allowed` holds debits only for Manual Checkout and Action Required (`:105-112`); first active method moves Prepaid to Auto Charge (`:115-126`) | E2 |
| W-9 | Payment method removal | `api/dashboard/methods.py:234` | `payments/payments.py:326-349`: revoke mandate at gateway, delete, re-densify; no check of owed invoices or remaining methods in those lines | E2 |
| W-10 | Pause / resume billing | `api/dashboard/invoices.py:262,273` | `catalog/subscriptions.py:1134-1159`: set `enabled`, record change, stop/start server | E2 |
| W-11 | Refund and cancellation (operator) | `api/admin/corrections.py:12,24,35,44` | Reasons required (`corrections.py:18,30,50`); domain rules raise in `payments/corrections.py:45-93,113,154,730,757`; cancellation job enqueued (`payments/corrections.py:780`) | E2 for the raise conditions; flow E1 |
| W-12 | Credit adjustment (operator) | `api/admin/teams.py:66-77` | `require_operator`, then `credits.adjust_credits(team, amount, entry_type, currency, note)`; `note` optional in the API | E2 |
| W-13 | Wallet top-up | `api/dashboard/invoices.py:728` `create_topup_order` | Amount > 0 check (`:752`); gateway order via adapter; confirmation path not read | E1 (only the check read) |
| W-14 | Accounting sync | Invoice Paid → `ingester/erpnext_sync.py:28` enqueue `sync_invoice` | Sales Invoice built from Central invoice with GST rows from the ERPNext template (`erpnext_sync.py:158-196`, `ingester/gst.py:47-56`); 3 attempts then Failed and ops alert (`:100-117`); hourly retry picks only Pending (`:121-131`) | E2 |

## Not identified in this phase

- Trial conversion (`central/signups/*` imports billing; not read).
- Commitment discount and clawback (`catalog/commitments.py`; not read).
- Disputes (`payments/disputes.py`; not read).
- Mandate registration and pre-debit (`payments/mandates.py`, `payments/emandate.py`; not read).
- Rerating (`revenue/rerating.py`; not read).
