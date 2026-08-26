# Private Clusters — billing the metal, not the workload

> Cross-refs: [atlas-integration/](atlas-integration/README.md) (the lifecycle events and
> enforcement path this extends), [plans-and-pricing.md](plans-and-pricing.md) (rate resolution and
> price-lock), [provisioning-and-entitlements.md](provisioning-and-entitlements.md) (the trust-tier
> cap that stops applying here), [partner-billing.md](partner-billing.md) (where a third-party team
> on someone else's hardware would land), [tax.md](tax.md) (place of supply on a pure service fee).
> Issues: [#112](issues/112-private-cluster-atlas-instance-and-access.md) …
> [#118](issues/118-node-inventory-reconciliation-atlas-ask.md).

## The problem

Today every billable thing is something we own and can switch off. A customer picks a plan, Central
calls Atlas, a VM appears on our metal, and the rate resolves per `(plan, currency, cluster)`. When
the invoice goes unpaid, dunning stops the VM. The whole model rests on one assumption: **the thing
we charge for is the thing we control.**

A customer who brings their own bare-metal server breaks that assumption in both directions.

Charging them per VM would bill them a second time for hardware they have already bought — the rate
card prices compute, and they own the compute. And enforcing non-payment by powering off their VMs
would mean reaching into a machine that belongs to someone else and switching off their production.
Not a policy we would like to defend, and on some readings not one we are entitled to.

So the private cluster inverts both halves:

```
        public cluster                      private cluster
   ┌────────────────────┐              ┌────────────────────┐
   │  our metal         │              │  customer's metal  │
   │  we bill the VM    │              │  we bill the node  │
   │  we stop the VM    │              │  we stop the tools │
   └────────────────────┘              └────────────────────┘
```

**We charge a management fee for the hardware we manage, and the workload runs free. When the fee
goes unpaid we take away the control plane, never the machine.**

## What this is not

- **Not a discount on VM plans.** The workload is not cheap; it is not priced at all. Pricing VMs at
  a fraction of list would make our revenue track how densely the customer packs their own box —
  a number they control and we cannot forecast.
- **Not colocation or a hardware lease.** We neither own, house, power, nor insure the machine. What
  we sell is the control plane and the operational work around it, which is also the outer bound of
  what any SLA can promise.
- **Not a new tenancy model.** A VM on a private cluster is an ordinary Asset owned by an ordinary
  Team, with an ordinary Subscription. Only the rate and the enforcement path change.
- **Not a reseller model** — though a private cluster is one plausible way somebody becomes one.
  See "Somebody else's team on your hardware" below.
- **Not a trial vehicle.** There is no POC period. A registered node bills from the day it goes
  Active.

## Concepts

**Private cluster**
An `Atlas Instance` whose `kind` is `Private` and which has an `owner_team`. There is no separate
cluster DocType and there does not need to be: `Asset.cluster`, `Catalog Rate.cluster` and
`Subscription.cluster` already all point at `Atlas Instance`, and `Region.provider` already carries
`Self-Managed`. A private cluster is an existing thing with two new facts about it.

**Node**
One bare-metal machine inside a private cluster — an Atlas `Server`, mirrored into Central as a
`Cluster Node` carrying only the facts billing needs: how many physical cores, how many threads, how
much memory, and whether it is live. **The node, not the cluster, is the billed subject.**

**Cluster access grant**
A row saying a given team may provision into a given private cluster, and on what terms. The owner
team gets one automatically at registration. Others may be granted one by hand.

**Billing treatment**
The per-grant answer to "what do this team's VMs cost here": `Free` (the owner's own workload — the
normal case) or `Standard` (billed at ordinary region rates).

**Management fee**
The recurring charge for a node. Its size comes from the node's **pricing basis**.

**Pricing basis**
Which of three rate cards this node is priced on: per physical core, per thread, or flat per node.
Chosen per node when it is registered.

_Avoid_: "BYOD" in customer-facing text — it reads as Bring Your Own *Device*, the corporate-laptop
term. The customer-facing word is **private cluster**; the internal field is `kind = Private`.

## The rule

> A private cluster bills the metal we manage, at a fixed monthly fee per node. Workload on it is
> recorded at zero. Nothing we bill for on a private cluster may be powered off or destroyed by us.

## Why the node is the subject

The alternative — one subscription for the whole cluster, with a quantity that goes up as hardware
is added — fails on price-lock. Per [ADR 0010](docs/adr/0010-price-lock-folded-into-subscription-change.md),
a `changed` event closes the open segment and opens a new one at the *current* rate. If the cluster
is the subject, a customer who adds a second node in month nine silently re-prices the node they
registered in month one at today's list price. Growth would cost them their grandfathering, which is
exactly backwards.

With the node as the subject, each node locks its own rate on the day it is registered, a new node
locks at the rate on the day *it* is registered, and a CPU upgrade re-prices only the machine that
was upgraded.

Mechanically the node subject rides on the seam
[ADR 0013](docs/adr/0013-team-level-metered-services-synthesized-subject.md) already cut:
`Subscription` resolves its billing subject as `asset_id or service_subject`, so a node subscription
sets `service_subject = node:<atlas-server-name>` and every downstream reader — segments, rating,
invoice lines, dunning — works unchanged. No new billing concept, and no VM-shaped record pretending
to be a server.

## The three pricing bases

They sit under one new Plan Category, following the polymorphic catalog of
[ADR 0007](docs/adr/0007-polymorphic-catalog-category-masters.md):

```
Plan Category:    Managed Cluster
  Sub-Category:   Per Physical Core   Unit: Core   Quantity = node.physical_cores
  Sub-Category:   Per Thread          Unit: vCPU   Quantity = node.threads
  Sub-Category:   Flat per Node       Unit: Nos    Quantity = 1
```

Per-core is what an enterprise evaluating us against VMware, Nutanix or Proxmox expects to be
quoted. Flat-per-node is what a smaller customer used to Plesk or RunCloud expects. Per-thread
exists because some hardware is sold and reasoned about in threads. The basis is a property of the
node, so a customer can hold a flat-priced small machine and a per-core large one at once.

**The basis is set by us at registration, not chosen by the customer.** Per-thread is roughly
per-core halved on typical SMT-2 hardware, and flat is neither. Exposed as a self-serve menu, these
three are not three products but one arbitrage: the customer with SMT disabled takes per-thread, the
customer with a 128-thread machine takes flat, and every customer takes whichever card is cheapest
for the hardware they happen to own. Set the three rate cards so they are roughly revenue-equivalent
for ordinary hardware, and let sales pick.

**Minimum billable quantity.** A per-core or per-thread plan carries a floor — sixteen is the
sensible starting number — so a four-core machine is not managed at a loss.

**Quantity follows the hardware, visibly.** Adding cores to a node is a `changed` event on that
node's subscription: it re-locks that node's rate and prorates through the existing day/hour
partitioned line computation. The same machinery a VM resize uses.

**Per-customer rates come free.** `Catalog Rate.cluster` is a Link to `Atlas Instance`, so a
negotiated enterprise number is a Catalog Rate row scoped to that customer's private cluster.
Grandfathering, currency resolution and the rate history all apply to it without a special case.

## Workload resolves to zero, and is still recorded

Rate resolution gains one branch: **on a `Private` cluster, a team holding a `Free` grant resolves
workload plans to zero.** A `Standard` grant resolves at ordinary region rates.

Two things about that sentence matter.

**It is a branch, not seeded data.** The tempting alternative is to seed zero-value Catalog Rates
per (plan, private cluster). It looks more declarative and it decays immediately: the day someone
adds a new VM plan, every private cluster starts throwing "no rate for this plan" at provision time,
because the gate treats a missing rate as an error rather than as a price of nothing. A rule
survives new plans; rows do not.

**The Subscription is still created, at `locked_rate = 0`.** Skipping the record would be simpler by
a few lines and would blind every surface that reads subscriptions — inventory, the cycle forecast,
notifications, entitlements, and the admin reports — on precisely the customers paying us the most
per account. A zero-rated segment costs nothing to carry and keeps one code path where there would
otherwise be two.

It also leaves the door open to showing what the workload *would* have cost on a public region,
using the existing `cost_report` invoice type from [#16](issues/16-free-trial-cost-report.md), which
computes without charging. That is the single most persuasive artifact this product can put in front
of a customer at renewal. It is not required for the first version.

## The provision gate stops being about money

The synchronous gate in
[provisioning-and-entitlements.md](provisioning-and-entitlements.md) compares a team's projected
run-rate against its trust-tier cap. On a private cluster with a `Free` grant the projected run-rate
is zero, so the money cap never binds — and it should not. The trust tier is our credit-risk
judgement, and there is no credit risk in a customer running their own metal.

**The tier cap is skipped for `Free` grants. Capacity is the real gate, and it already exists**:
`Atlas Instance.validate_capacity` is in place, and Atlas's placement raises `NoCapacityError`
authoritatively at create time. Nothing new is needed — the ceiling on a private cluster is the
physical machine, which is the honest ceiling anyway.

A `Standard` grant keeps the tier cap: that team is spending our money again.

## Enforcement: take the tools, not the machine

This is where the private cluster genuinely diverges, and it needs to be enforced in code rather
than described in prose — the standard [ADR 0018](docs/adr/0018-invariants-are-enforced-not-observed.md)
sets.

| Cluster kind | How delinquency is enforced |
|---|---|
| **Public** | Calls to Atlas — `stop_vm`, then `terminate_vm` |
| **Private** | **Revoke the team's write capabilities on that cluster.** `vm:create`, resize, power actions, snapshot operations. Every read survives. No Atlas call is made at all. |

The customer keeps seeing their fleet, their invoice, and the button that settles it. What they lose
is the ability to operate. Their ops team is holding a console that will not do anything while
production stays up — real pressure, nothing destroyed.

The ladder:

1. **Day 1 / 3 / 7** — retries and notifications, exactly as [#14](issues/14-retry-dunning-suspension.md)
   already does them. No behavioural change.
2. **Past Due** — the control plane goes read-only, by capability revocation.
3. **Suspended** — managed services stop too: no backups, no monitoring, no patching, no support
   response.
4. **Terminal** — after a stated number of days, the cluster is de-registered and root credentials
   are handed back.

Step 4 is not optional and not merely commercial hygiene. The machine belongs to them; we need a
documented way to stop managing it that returns control, rather than leaving hardware in a
half-managed limbo indefinitely. It is also the first question their procurement will ask.

Three consequences worth stating out loud, because each contradicts how the system behaves today:

**The enforcement client must refuse to act on Private clusters.** Today dunning reconciles "the
team's VMs" wholesale. Pointed at a mixed team it would cheerfully power off hardware we do not own.
This is a guard in the Atlas client with a test behind it, not a policy note.

**Enforcement splits per cluster kind.** A team with public VMs *and* a private cluster, going past
due on one invoice, has its public VMs stopped on the normal ladder while its private cluster only
degrades. The current model cannot express that.

**Downtime does not pause the fee.** A node that is Broken for two weeks still bills — the same
reasoning that keeps a stopped VM billing. Say it in the contract before a customer argues it.

## What Central knows about the metal

Deliberately little, and — for now — nothing new from Atlas.

Atlas's stated boundary is that *"Central supplies what to run, never where — placement is Atlas's
concern"*, and the capacity API repeats that Central *"never sees hosts."* Billing per core pushes
against that, and the resolution is that Central needs to **count** nodes, never to **place** on
them.

Today that lands as:

- **Lifecycle comes from an event Atlas already sends.** `server.status_changed` is emitted by Atlas
  and arrives at Central right now, where it is stored as an `Atlas Event` with status `Ignored` —
  the receiver keeps unhandled types precisely so "a handler added later has history to replay."
  Registering a handler is a Central-side change. `Active` opens the node's billing segment,
  `Archived` closes it, `Draining` and `Broken` keep billing.
- **Inventory is declared by an operator, not discovered.** The payload carries `{name, status}` and
  nothing else, and Atlas's `Server` does not record physical cores at all — only `vcpus_total`,
  which is threads. So core and thread counts are entered in Central when the node is registered.
  This is not a workaround so much as an accurate model of the process: a private cluster is racked,
  validated and contracted by hand, and somebody already knows what is in the box.
- **Reconciliation is deferred, and written down.** When Atlas eventually reports sockets, cores and
  threads, Central should compare its declared inventory against them and flag drift rather than
  silently re-price. That is [#118](issues/118-node-inventory-reconciliation-atlas-ask.md), which
  specifies the contract and changes no Atlas code.

The trade is explicit: a typo in a declared core count becomes a wrong invoice with nothing to catch
it. Against that, the alternative is holding the entire feature behind a change to another team's
app for a fact a human already has to hand.

## Somebody else's team on your hardware

The common case is one team owning a cluster and running its own workload on it. A partner running
their customers' workload on hardware they own is a real, occasional case, and the design keeps the
door open without building for it.

That is the whole purpose of putting `billing_treatment` on the **grant** rather than on the
cluster. `Free` means the owner absorbs it. `Standard` means that team's VMs bill at ordinary region
rates — at which point the money question is no longer a private-cluster question at all, it is the
[partner billing](partner-billing.md) question, and the budget allocation of
[ADR 0024](docs/adr/0024-partner-billing-budget-allocation.md) bounds it.

One field today, no speculative machinery, and a home for the case when it arrives.

## Data model

**Atlas Instance** (existing) gains:

| Field | Type | Notes |
|-------|------|-------|
| kind | Select | `Public` / `Private`. Defaults to Public; every existing instance is Public |
| owner_team | Link → Team | Required when kind is Private, empty otherwise |
| access | Table → Cluster Access | Who may provision here, and on what terms |

**Cluster Access** (new child table)

| Field | Type | Notes |
|-------|------|-------|
| team | Link → Team | |
| billing_treatment | Select | `Free` / `Standard`. The owner's row is Free and is created on registration |

**Cluster Node** (new DocType, one row per bare-metal machine)

| Field | Type | Notes |
|-------|------|-------|
| cluster | Link → Atlas Instance | Must be `kind = Private` |
| atlas_server | Data | Atlas `Server.name` — the stable identity, and the key `server.status_changed` arrives on |
| physical_cores | Int | Operator-declared |
| threads | Int | Operator-declared |
| memory_megabytes | Int | Operator-declared, informational |
| plan | Link → Plan | A Managed Cluster plan; its sub-category is the pricing basis |
| status | Select | Mirrors Atlas: `Pending` / `Active` / `Draining` / `Broken` / `Archived` |
| active_since | Datetime | Stamped on the first `Active` — when billing starts |

**Subscription** (existing) needs no new field. A node subscription carries
`service_subject = node:<atlas_server>`, `cluster` = the private cluster, and the Managed Cluster
plan. `Subscription Change` carries its `locked_rate` and the quantity in force, exactly as it does
for every other subject.

## Surfaces

**Operator — Desk.** Private clusters are ops tooling and live in Desk, per the standing rule that
`/desk` is for the accounts and infrastructure teams and `/dashboard` is customer-only. Registering
a cluster, marking its kind, granting access, registering nodes and setting the basis are all Desk
forms. There is no self-serve path to creating a private cluster, and there should not be: every one
of them starts as a contract.

**Customer — console.**

- The create-server region picker lists private clusters the team holds a grant for, alongside
  public regions.
- Plan cards on a private cluster read **₹0 — covered by your cluster** rather than a price.
- A **Private cluster** page lists the nodes, their basis and quantity, and the management fee for
  the cycle — the one place the customer sees what they actually pay us.
- Past Due shows a banner naming what has been switched off and what settles it, which is also the
  only way the read-only state is discoverable rather than mystifying.

## Commercial and tax notes

- **The fee is a service, not consumption.** In India that means 18% GST, and it is far more likely
  than usage billing to have **TDS withheld** by a corporate customer. The withholding seam from
  [#13](issues/13-tax-gst-sez-tds-seam.md) exists and this is the first offering that will routinely
  exercise it.
- **Place of supply is genuinely open** where the hardware sits in one country and the team is
  registered in another. It needs an accounting answer, not an engineering one.
- **Minimum term.** A customer who has bought a rack is not a monthly customer, and onboarding one
  for a single month is a loss. The existing `Commitment` spend floor and clawback
  ([ADR 0001](docs/adr/0001-commitment-as-team-spend-floor.md)) models this with no change.
- **Onboarding fee.** Racking, validation and network setup is real work and belongs on the first
  invoice as a one-time charge.
- **The SLA covers the control plane.** We cannot promise uptime on a machine we do not own, house
  or power. The document should say what we do promise — response times and control-plane
  availability — rather than leaving the customer to assume the public-cloud SLA came with them.

## Open questions

**1. Guest teams when the owner is delinquent.** If a cluster owner stops paying and their control
plane goes read-only, what happens to a third-party team holding a `Standard` grant on that
hardware? Their VMs are running on somebody else's metal and they have not personally failed to pay
anything. The leaning is that existing VMs keep running and stay operable, but nobody may provision
anything new into a delinquent cluster — the owner should not be able to grow a liability they are
not settling. Undecided, and it is the same shape as the unresolved cascade question in
[partner-billing.md](partner-billing.md).

**2. Physical cores.** Atlas records `vcpus_total` and nothing about sockets or cores. Until that
changes, per-physical-core pricing rests entirely on a declared number. Whether that is acceptable
for the first paying customer, or whether flat and per-thread should be the only bases we sell until
Atlas reports the fact, is a commercial call. See
[#118](issues/118-node-inventory-reconciliation-atlas-ask.md).

**3. Over-subscription policy.** A customer may reasonably want to over-commit vCPU on hardware they
own, and Atlas's placement gate will stop them at the physical ceiling. Whether over-subscription is
permitted on private clusters, and at what ratio, is a policy knob nobody has set.

**4. How long is terminal?** Step 4 of the ladder needs a number of days and a hand-back procedure,
and both belong in the contract before they belong in code.

**5. Whether the value panel ships.** The `cost_report` comparison — "your fleet would have cost X
on public regions" — is cheap to build on machinery that already exists and is the strongest
retention argument available. It is also entirely optional, and it invites the customer to do the
arithmetic in the other direction.
