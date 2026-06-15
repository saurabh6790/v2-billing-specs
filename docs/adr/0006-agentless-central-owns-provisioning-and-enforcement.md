# No Subscription Agent — Central owns provisioning, usage recording, and enforcement

Date: 2026-06-15

The original architecture split the system into **two applications**: Cloud Billing
(Central) for money/intent, and a per-cluster **Subscription Agent** that was the
source of truth for *what actually ran*. The Agent held four DocTypes (Plan Cache,
Plan Subscription Log, Usage Meter, Sync Log), recorded the event log and metered
rollups locally, **verified Central-issued signed Entitlement Tokens offline**, and
pushed usage back to Central. The split bought outage-resilience: a cluster could
provision and enforce caps even with Central unreachable.

That resilience is no longer worth its cost. Provisioning on Frappe Cloud v2 is
already mediated by the **cluster manager** (Bench Manager), which exposes an API
Central can call directly. Running a second Frappe app per cluster — with its own
deploy, schema, signing keys, sync protocol, and offline-enforcement edge cases —
duplicates state and doubles the surface for a property (provision-while-Central-is-
down) the product does not actually require.

## Decision

**There is no Subscription Agent. Central is the single application, and it owns
provisioning, usage recording, and enforcement by calling the cluster manager's
API.** All logic previously specced for the Agent moves into `central/billing`.

1. **Central provisions.** A customer subscribes to a plan on Central; Central calls
   the **cluster manager API** to create/change/terminate the VM. The trust-tier cap
   is checked **synchronously by Central at provision time** — no signed token, no
   offline verification.

2. **Central records usage directly.** The event log (subscribed / changed /
   cancelled, per `resource_id` with `shown_rate` + currency) and metered-usage
   rollups are written **in Central** as part of the provisioning/metering it drives
   — not pushed from an agent. The **price-lock** is written by Central at the moment
   it provisions (rate shown = rate locked, guaranteed, because the same component
   does both).

3. **Central enforces via the cluster manager API.** Dunning suspension/termination
   is Central calling the cluster manager to stop/power-off/terminate a VM — **not**
   a cap-0 Entitlement Token the cluster reads offline. The Entitlement Token,
   offline verification, and the token-channel enforcement model are removed.

4. **Trust tier stays.** It remains the team's cap, computed from billing history,
   enforced by Central at provision time (and as the mandate ceiling, see
   [payments-inr.md](../../payments-inr.md)). Only its *delivery mechanism* (was a
   signed token) is gone.

5. **Two-axis state stays.** Operational (`running/stopped/terminated`) vs account
   standing (`current/past_due/suspended`) are still distinct. The operational axis
   is now Central's record of cluster-manager state (reported by / read from the
   cluster manager), not an agent's local truth.

## Consequences

- **Retired:** the Subscription Agent app and [subscription-agent.md](../../subscription-agent.md);
  the Agent's **Plan Cache**, **Plan Subscription Log**, and **Sync Log**; the
  **Entitlement Token** DocType + Ed25519 signing + offline verification; the
  push/ack sync protocol.
- **Re-homed into `central/billing`:** the event log + price-lock ([#03](../../issues/03-agent-event-log-price-lock.md)), the Usage Meter / metered rollups ([#12](../../issues/12-metered-billing-usage-meter.md), [metering.md](../../metering.md)) — written by Central, not received from an agent.
- **Provisioning + enforcement become cluster-manager API calls** (a new outbound integration seam in Central), replacing plan-push, token-issue, and usage-pull. [#07](../../issues/07-trust-tier-entitlement-token.md) (entitlement) and [#14](../../issues/14-retry-dunning-suspension.md) (dunning) change accordingly.
- **"Central unreachable → keep running" still holds, trivially:** the cluster manager only stops a VM on an explicit Central directive, so a Central outage never stops a running resource — without needing offline tokens.
- **The provision path now depends on Central availability.** New provisions can't happen while Central is down (acceptable — provisioning is already a Central-initiated action). No customer resource is harmed by it.
- **Source-of-truth split collapses:** Central is the SOR for intent, money, *and* the recorded runtime it bills from; the cluster manager is the executor Central calls and reads state from. [architecture.md](../../architecture.md) and [README.md](../../README.md) updated.
- **Supersedes** the two-app framing in [ADR 0004](0004-billing-as-central-module-capability-iam.md)'s closing note ("the Agent stays separate") and the Agent rows in the issue index.
