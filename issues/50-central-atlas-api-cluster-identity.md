# 50 — Central → Atlas API client + cluster identity

**Type:** AFK · **Milestone:** Atlas Integration · **Spec:** [atlas-integration/02-central-atlas-api.md](../atlas-integration/02-central-atlas-api.md)

## What to build

The outbound Atlas seam in Central and one cluster identity per Atlas endpoint.
Central is the client ([ADR 0006](../docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)):
build `central/billing/integrations/atlas.py` with a thin API client
(`create_vm` / `resize_vm` / `terminate_vm` / `stop_vm` / `start_vm` /
`get_vm_state` / `list_snapshots`) authenticated by a per-cluster, least-privilege
key from Central site config, and a whitelisted `receive_vm_status` callback
endpoint Atlas posts lifecycle transitions to. Central configures each Atlas
endpoint with a `cluster` identity and stamps it on every event it records, so
events and the team's trust-tier slice / `Catalog Rate.cluster` agree on the
cluster name. This replaces the retired Agent push spine (no more
`press_billing.sync.*` / `subscription_agent.*` paths).

## Acceptance criteria

- [ ] `atlas.py` client calls the Atlas operation/read endpoints with the cluster-scoped key; each state-changing call returns and stores the Atlas Task id.
- [ ] `receive_vm_status` accepts `{name, team, plan, cluster, status, occurred_at}`, authenticated by a callback-only key, and is idempotent on the event log (a re-posted callback never double-records).
- [ ] Each Atlas endpoint carries a `cluster` identity in Central config; recorded events are stamped with it; a missing cluster config fails loud, not silently cluster-less.
- [ ] A create → `Running` callback round-trip records exactly one `subscribed` + price lock (integration test against a stub Atlas).
- [ ] Reconciliation read (`get_vm_state`) repairs a dropped callback idempotently.

## Blocked by

- #03
