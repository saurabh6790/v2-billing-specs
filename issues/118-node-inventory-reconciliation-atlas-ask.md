# 118 — Reconcile declared node inventory against Atlas (needs an Atlas change first)

**Type:** Blocked · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (What Central knows about the metal) · **Atlas:** change required — **not to be made as part of this issue**

## Why this is blocked

Private-cluster billing prices a node on its core or thread count
([#113](113-managed-cluster-catalog-and-node-registration.md)), and those numbers are **declared by
an operator at registration**. Nothing verifies them.

That is a deliberate, bounded trade — a private cluster is racked, validated and contracted by hand,
so somebody already knows what is in the box — but it means a typo becomes a wrong invoice with
nothing to catch it. Verification needs facts only Atlas can produce, and Atlas is not being changed
right now. This issue records the contract so the requirement is not lost, and specifies the Central
side so it can be built the day the facts arrive.

## What Atlas would need to provide

Stated as an ask, to be raised with the Atlas team as its own piece of work:

1. **Physical core count on `Server`.** Atlas records `vcpus_total` (threads),
   `memory_megabytes_total` and `pool_disk_gigabytes_total`. It records nothing about sockets or
   physical cores, so per-physical-core pricing currently rests entirely on a declared number. The
   fact is one `lscpu` read away (sockets × cores-per-socket) on a host the agent already reports
   from.
2. **Capacity in the `server.status_changed` payload.** `_server_payload` currently returns
   `{name, status}`. Adding cores, threads, memory and disk lets Central verify on every transition
   rather than on a schedule.
3. **A node-inventory read for a region** — the pull-side backstop, matching the existing reconcile
   pattern. Central counts nodes; it still never places on them, so Atlas's "Central never sees
   hosts" boundary is bent for billing facts and not broken for placement.

## What Central builds once they exist

1. **Compare declared against reported** on every `server.status_changed` and on the periodic
   reconcile.
2. **Flag drift; never silently re-price.** A mismatch raises an operator alert and marks the node,
   because an automatic re-price on a machine-reported number is a bill that changes without anyone
   deciding it should. Correcting the node is an explicit operator action, which then re-prices
   through the ordinary `changed` event.
3. **Fail soft.** An unreachable Atlas leaves the last-known inventory intact and reports staleness,
   exactly as `reconcile()` does for the Asset mirror today.

## Acceptance criteria

*(Deferred until the Atlas change lands.)*

- [ ] A node whose declared cores differ from Atlas's report is flagged, with both numbers shown.
- [ ] No invoice amount changes as a result of a reported number alone.
- [ ] Accepting the reported number re-prices through a `changed` event, prorated, from the moment it
      is accepted.
- [ ] An unreachable Atlas produces staleness, not drift alerts.

## Notes

Until this lands there is a commercial question attached: whether per-physical-core is sold at all,
or whether flat-per-node and per-thread are the only bases offered while the core count is
unverifiable. `vcpus_total` at least *exists* in Atlas today, so per-thread is checkable sooner than
per-core. See [private-clusters.md](../private-clusters.md) § Open questions.
