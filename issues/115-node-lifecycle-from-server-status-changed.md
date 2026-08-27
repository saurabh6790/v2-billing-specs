# 115 — Node lifecycle from the event Atlas already sends

**Type:** AFK · **Milestone:** PVC · **Spec:** [private-clusters.md](../private-clusters.md) (What Central knows about the metal) · **Atlas:** no change

## What to build

Close the loop between a physical machine going live or being retired and its billing segment
opening or closing — **without touching Atlas.**

Atlas already emits `server.status_changed`, and Central already receives it: `ingest_event` stores
every authenticated event, and an unhandled type lands as an `Atlas Event` with status `Ignored`
specifically so "a handler added later has history to replay". This issue is that handler.

1. **Register `server.status_changed` in `_EVENT_HANDLERS`** (`central/integrations/atlas.py`),
   alongside the `vm.*` and `site.*` entries.
2. **Map Atlas status onto `Cluster Node.status` and the billing segment:**

   | Atlas status | Node | Billing |
   |---|---|---|
   | Pending / Bootstrapping | Pending | nothing |
   | **Active** (first time) | Active | **open the segment**, stamp `active_since` |
   | Draining | Draining | keeps billing |
   | Broken | Broken | keeps billing — downtime does not pause the fee |
   | **Archived** | Archived | **close the segment** |

3. **Idempotent both ways.** Re-delivery, or a node flapping Active → Broken → Active, must not
   double-open or double-close. Re-check current state before appending, the way the VM handler
   already does.
4. **Ignore servers Central does not know.** The event fires for every server in every cluster,
   including public ones. Only a server with a matching `Cluster Node` row does anything; everything
   else is a no-op, and public clusters are entirely unaffected.
5. **Replay the backlog.** A patch (or an operator command) that re-applies stored `Ignored`
   `server.status_changed` rows for servers now registered as nodes — the history is already sitting
   in `Atlas Event`.
6. **The payload stays `{name, status}`.** Core, thread and memory counts remain operator-declared
   ([#113](113-managed-cluster-catalog-and-node-registration.md)); this handler must not expect
   capacity fields that Atlas does not send.

## Acceptance criteria

- [ ] `server.status_changed` for a registered node is stored `Received`, not `Ignored`, and applied.
- [ ] First `Active` opens the node's segment and stamps `active_since`; the invoice for that cycle
      prorates from that moment, not from registration.
- [ ] `Archived` closes the segment; billing stops at that timestamp.
- [ ] `Broken` and `Draining` leave the segment open and the fee running.
- [ ] Active → Broken → Active leaves exactly one open segment.
- [ ] A duplicate delivery of the same `event_id` changes nothing (existing dedupe still holds).
- [ ] An event for a server with no `Cluster Node` row is a no-op and does not error.
- [ ] The replay applies stored `Ignored` rows exactly once and is safe to re-run.
- [ ] No file under `apps/atlas` is modified.
- [ ] Suite green.

## Decisions baked in

- **Consume the existing event; do not ask Atlas for a new one.** The type is already emitted,
  already authenticated, already stored, and already retained for exactly this case.
- **Broken keeps billing** — the same reasoning that keeps a stopped VM billing
  ([atlas-integration/01](../atlas-integration/01-atlas-central-integration.md)).

## Blocked by

- [#113](113-managed-cluster-catalog-and-node-registration.md) (there must be a node to move).
