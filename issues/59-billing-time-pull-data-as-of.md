# 59 — Reconciliation read + per-team "data as of" freshness

**Type:** AFK · **Milestone:** post · **Spec:** [atlas-integration/02-central-atlas-api.md](../atlas-integration/02-central-atlas-api.md), [observability.md](../observability.md)

## What to build

The verification/repair path for the Central→Atlas seam. Central reconciles its
own records against Atlas by reading state (`get_vm_state` for in-flight/suspect
VMs; `list_snapshots` / `get_transfer_counters` for meters) — so a dropped status
callback or a stalled metering read is detected and repaired rather than silently
under-billing ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)).
The invoice run records, per team, the "data as of" timestamp it billed from
(latest confirmed lifecycle/meter read for the team's clusters); a cluster whose
reads have stalled past a threshold surfaces in admin observability before
invoices go out.

## Acceptance criteria

- [ ] A reconciliation read recovers a missed `Running`/`Terminated` transition; events lock idempotently, meter figures replace.
- [ ] The read path uses the cluster-scoped Atlas key; it is unreachable from customer/admin sessions.
- [ ] Each invoice records the data-freshness timestamp it was computed from.
- [ ] A stalled cluster (no successful read past threshold) is flagged in the admin view pre-invoice-run.

## Blocked by

- #53, #57
