# Central Console UI (Team, Identity & Infrastructure)

## Purpose

Specify the **team-facing Central console** screens that sit *next to* billing:
team membership, roles & capabilities, custom roles, the team trust tier, and the
**Atlas** infrastructure surface (asset registry, VMs, region/cluster switch,
cluster-access requests). Companion to [billing-ui.md](billing-ui.md) — same app
shell, same frappe-ui conventions, same capability IAM.

Two grounding tiers, **flagged inline**:

- **✅ Grounded** — backed by an existing DocType/API in these specs or
  [ADR 0004](docs/adr/0004-billing-as-central-module-capability-iam.md)
  (`central.iam`, `Team`/`Team Member`/`Team Role`/`Capability`, `Trust Tier`,
  `get_trust_tier`).
- **🟡 Mockup (dummy data)** — provisioning surfaces (Atlas registry, VM list,
  region switch, cluster-access request) have **no customer API/DocType specced
  yet**. These screens are wireframes over **dummy data**, anchored to the real
  concepts that *do* exist (`resource_id`, `cluster`, `cluster_slices`,
  `allowed_clusters`). API names shown are **proposals to confirm with Central**,
  not existing methods.

> Why a companion file: ADR 0004 frames **Atlas and the team console** as
> Central-owned products that already use the capability IAM, distinct from the
> `billing` module. [billing-ui.md](billing-ui.md) stays billing-scoped; this file
> covers the identity + infrastructure console around it.

## Conventions (shared with billing-ui.md)

- frappe-ui components + semantic tokens only; data via `useCall`/`useList`
  (reads auto-fetch, writes `immediate:false` + `submit`); imperative
  `dialog.confirm`/`toast`; one solid primary per page. See
  [billing-ui.md](billing-ui.md) "Where it lives" / "Cross-cutting UI rules".
- **List & detail layout** is the same as billing — split view (list grows left,
  ~480px detail panel right, *not* a modal), a list toolbar (debounced search +
  filter + status `TabButtons`), detail-panel `Tabs` (**Details** | **Activity**),
  skeleton (`LoadingText`) over spinners, and mobile drawer/full-screen. The
  per-screen **definition-of-done checklist** in billing-ui.md applies here too.
  See [billing-ui.md](billing-ui.md) "List & detail layout".
- All screens mount as Central router children inside the existing
  `Sidebar` + `router-view` shell, scoped to the **current `Team`**.

## Authorisation — who manages identity

Membership and role management are **Central-owned** capabilities (not billing's
`billing:view`/`billing:manage`). Per ADR 0004 the system roles are
`Owner` · `Admin` · `Billing` · `Developer` · `Viewer`.

| Action class | Capability (✅ Central-owned; **confirm exact slug**) | Carried by |
|--------------|------------------------------------------------------|------------|
| View team members, roles, trust tier | `team:view` | all members |
| Add/remove members, assign roles, build custom roles | `team:manage` | `Owner`, `Admin` |
| View Atlas assets/VMs | `atlas:view` 🟡 | all members |
| Provision / switch region / request cluster | `atlas:manage` 🟡 | `Owner`, `Admin` |

Same UI rule as billing: compute `canManageTeam` / `canManageAtlas` once from
`central.iam.can(user, team, …)` and bind to every mutating control; a view-only
member sees the screens read-only. The server re-checks each mutation.

```ts
const caps = useCall<string[]>({ url: '/api/v2/method/central.iam.my_capabilities' })
const canManageTeam  = computed(() => caps.data?.includes('team:manage')  ?? false)
const canManageAtlas = computed(() => caps.data?.includes('atlas:manage') ?? false)
```

## Screen map

```
Team                       (sidebar group)
├─ Members         /team/members      ✅ central.iam — list/add/assign/remove
├─ Roles           /team/roles        ✅ system roles + capability matrix
│   └─ Custom role /team/roles/new    ✅ make_custom_role_team (compose capabilities)
└─ Trust Tier      /team/trust-tier   ✅ get_trust_tier

Atlas                      (sidebar group)        🟡 mockups — dummy data
├─ Registry        /atlas               🟡 asset/resource registry
├─ Virtual Machines/atlas/vms           🟡 VM list
├─ Region          /atlas/region        🟡 switch region/cluster
└─ Access Requests /atlas/access        🟡 request cluster access / activation
```

---

# Part A — Team & Identity  ✅ grounded

## A1. Members — `/team/members`

**Read** the team's members (`central.iam` — `Team Member` rows: user, role,
status, joined). `ListView`; role shown as `Badge`. `team:manage` members get
**Invite member** (header primary) and per-row role/remove actions.

```
┌─ Team ▸ Members ──────────────────────────────────────────  [ + Invite member ]
│  Member                     Role            Status     │
│  asha@acme.io   (Owner)     Owner           active     ⋯
│  ravi@acme.io               Billing         active     ⋯
│  dev@acme.io                Developer        active     ⋯
│  intern@acme.io             Viewer          invited    ⋯
│        ⋯ → Change role · Resend invite · Remove
└──────────────────────────────────────────────────────────────────────────
```

### Invite member — *(team:manage)*
Header **Invite member** opens a `Dialog`: email (`FormControl`), role
(`Select` of the team's roles), optional message. `submit({ email, role })` →
`toast.success('Invitation sent')` + reload. The invite creates a pending
`Team Member`; the user accepts via Central's existing invite flow.

```ts
const invite = useCall({
  url: '/api/v2/method/central.iam.invite_member',  // ✅ Central-owned; confirm slug
  method: 'POST', immediate: false,
  onSuccess: () => { toast.success('Invitation sent'); members.reload() },
})
```

### Change role / Remove — *(team:manage)*
Per-row `Dropdown`. **Change role** → inline `Select` or small dialog →
`assign_role({ member, role })`. **Remove** → `dialog.confirm` (`theme:'red'`) →
`remove_member({ member })`. Guard: the UI must not let the **last `Owner`** be
removed or demoted — disable that action with a `Tooltip` reason (server enforces
too).

| Action | Endpoint (✅ Central-owned; confirm slug) |
|--------|-------------------------------------------|
| List members | `central.iam.list_team_members` |
| Invite | `central.iam.invite_member` |
| Assign/change role | `central.iam.assign_role` |
| Remove | `central.iam.remove_member` |

## A2. Roles & Capabilities — `/team/roles`

Lists the team's roles — the **system roles** (`Owner`, `Admin`, `Billing`,
`Developer`, `Viewer`) plus any **custom roles** the team built. Each role expands
to the **capabilities** it carries, rendered as a read-only matrix so a manager can
see exactly what a role grants before assigning it.

```
┌─ Team ▸ Roles ──────────────────────────────────────────  [ + New custom role ]
│  Role        Members   Capabilities                              │
│  Owner          1       team:* · billing:* · atlas:*    (system) │
│  Admin          0       team:manage · atlas:manage      (system) │
│  Billing        1       billing:view · billing:manage   (system) │
│  Developer      1       atlas:view                       (system) │
│  Viewer         1       *:view                            (system)│
│  Finance (RO)   0       billing:view                      custom  ⋯
└──────────────────────────────────────────────────────────────────────────

   Capability matrix (expanded) ─────────────────────────────┐
   Capability        Owner Admin Billing Dev Viewer  Finance  │
   billing:view        ✓     ·      ✓      ·    ✓       ✓      │
   billing:manage      ✓     ·      ✓      ·    ·       ·      │
   team:manage         ✓     ✓      ·      ·    ·       ·      │
   atlas:view          ✓     ✓      ·      ✓    ✓       ·      │
   atlas:manage        ✓     ✓      ·      ·    ·       ·      │
```

System roles are read-only (badge "system"); custom roles have a ⋯ menu
(Edit / Delete, `team:manage`). Capabilities come from Central's registry
(`plane:resource:action`, e.g. `billing:view`); the matrix is display-only — the
UI never invents a capability.

## A3. Custom role builder — `/team/roles/new`  *(team:manage)*

Create a role by **toggling pre-defined capabilities** — exactly the
`make_custom_role_team` helper from [#45](issues/45-test-suite-update-capability-authz.md)
(it builds the "view-without-manage" role no system role offers). The form is the
capability registry grouped by plane/resource, each a `Switch`:

```
┌─ Team ▸ Roles ▸ New custom role ──────────────────────────────────────────
│  Role name   [ Finance (read-only)            ]
│  Description [ Can see invoices, cannot pay    ]
│  ── Capabilities ───────────────────────────────────────────────
│  Billing
│     [✓] billing:view      View invoices, credits, methods
│     [ ] billing:manage    Pay, top up, edit payment methods
│  Team
│     [ ] team:view         See members & roles
│     [ ] team:manage       Invite/remove, assign roles
│  Atlas
│     [ ] atlas:view        See VMs & assets
│     [ ] atlas:manage      Provision, switch region
│                                          [ Cancel ]  [ Create role ]
```

- The registry is fetched, not hardcoded — `list_capabilities()` returns
  `{ plane, resource, action, slug, label, description }`; group by
  `plane`/`resource`. New capabilities appear automatically.
- **Dependency hint:** when a `:manage` is toggled on without its `:view`, show an
  inline `Alert theme="orange"` ("manage implies view") — but let the server define
  the real implication; the UI only hints.
- Save → `make_custom_role_team({ team, label, capabilities: ['billing:view', …] })`
  → `toast.success` → route to `/team/roles`. Edit reuses the same form prefilled.

```ts
const createRole = useCall({
  url: '/api/v2/method/central.iam.make_custom_role_team',  // ✅ helper from #45; confirm public slug
  method: 'POST', immediate: false,
  onSuccess: () => { toast.success('Role created'); router.push('/team/roles') },
  onError: (e) => toast.error(e.message),
})
```

## A4. Trust Tier — `/team/trust-tier`  ✅ `get_trust_tier`

The team's **trust tier** is the provisioning cap, computed by Central from billing
history ([provisioning-and-entitlements.md](provisioning-and-entitlements.md)).
**Read-only for the team** — promotions are automatic, demotions are
event-driven, overrides are operator-only. The screen explains *where you are, what
it unlocks, and how to advance*.

```
┌─ Team ▸ Trust Tier ───────────────────────────────────────────────────────
│   Current tier   t1 — Established ★
│   ────────────────────────────────────────────────────────────────────────
│   Monthly cap            ₹3,00,000        Max resources        25
│   Allowed clusters       Mumbai, Singapore
│   Allowed plans          Standard, Pro
│   Promoted               2026-03-01  ·  basis: 3 paid months + ≥ ₹50,000
│   ────────────────────────────────────────────────────────────────────────
│   Next: t2 — Trusted
│     ▓▓▓▓▓▓▓░░░  3 / 5 consecutive paid invoices
│     ▓▓▓▓▓▓▓▓░░  ₹38,000 / ₹50,000 cumulative paid
│     Unlocks: ₹6,00,000 cap · all clusters · dedicated IP
└──────────────────────────────────────────────────────────────────────────
```

- Tier ladder + caps from `get_trust_tier` (`tier`, `max_spend`,
  `max_resource_count`, `allowed_plans`, `allowed_clusters`, `promoted_at`,
  `promotion_basis`). Money fields are float `Currency`, major units → `money()` (billing-ui.md).
- "Next tier" progress bars (`Progress`) need the *thresholds + current
  historical-paid counters*. If `get_trust_tier` doesn't yet return the next-tier
  rule + progress, render that block from **dummy data** and flag it 🟡 until the
  API exposes `next_tier`, `progress`. The current-tier block is fully ✅.
- `manual_override` true → `Badge theme="blue" "Admin override"` and hide the
  progress block (auto-demotion exempt).

---

# Part B — Atlas (Infrastructure)  🟡 mockups · dummy data

> **None of Part B has a customer-facing API/DocType in these specs.** ADR 0004
> establishes that Atlas exists and shares the capability IAM, and the provisioning
> spec establishes `cluster` / `allowed_clusters` / `resource_id` and Central-driven
> provisioning via the cluster manager ([ADR 0006](docs/adr/0006-agentless-central-owns-provisioning-and-enforcement.md)) — the screens below are **wireframes over dummy data**
> anchored to those concepts. Every endpoint is a **proposal to confirm with the
> Central/Atlas team**, not an existing method. Build these against a local
> dummy-data module first (`useFetch` against a mock, or a static fixture), then
> swap to `useCall` when the real APIs land.

```ts
// atlas/mock.ts — dummy data until Atlas exposes real endpoints (🟡)
export const MOCK_VMS = [
  { name: 'vm-web-01',  resource_id: 'res_a1b2', cluster: 'mumbai',    plan: 'Standard', vcpu: 2, ram_gb: 4,  status: 'running',    ip: '10.0.1.11',  created: '2026-04-02' },
  { name: 'vm-web-02',  resource_id: 'res_c3d4', cluster: 'mumbai',    plan: 'Standard', vcpu: 2, ram_gb: 4,  status: 'running',    ip: '10.0.1.12',  created: '2026-04-02' },
  { name: 'vm-batch-01',resource_id: 'res_e5f6', cluster: 'singapore', plan: 'Pro',      vcpu: 8, ram_gb: 32, status: 'stopped',    ip: '10.1.4.9',   created: '2026-05-18' },
  { name: 'vm-old-01',  resource_id: 'res_x9y8', cluster: 'mumbai',    plan: 'Standard', vcpu: 2, ram_gb: 4,  status: 'terminated', ip: null,         created: '2026-01-10' },
]
export const MOCK_CLUSTERS = [
  { slug: 'mumbai',    label: 'Mumbai (ap-south-1)',     status: 'active',     allowed: true,  resources: 3 },
  { slug: 'singapore', label: 'Singapore (ap-se-1)',     status: 'active',     allowed: true,  resources: 1 },
  { slug: 'frankfurt', label: 'Frankfurt (eu-central-1)',status: 'available',  allowed: false, resources: 0 },
]
```

## B1. Atlas Registry — `/atlas`  🟡

A single registry of everything the team has provisioned across clusters — VMs,
and (future) other asset types. Landing page of the Atlas group: counts by status,
a cluster breakdown, and a recent-assets list. Each asset carries its
**`resource_id`** (Central's source-of-truth handle for what actually ran, recorded
at provision — [architecture.md](architecture.md)) so it reconciles with billing line items.

```
┌─ Atlas ▸ Registry ──────────────────────────────  [ + Provision resource ] 🟡
│  ┌ Running ┐ ┌ Stopped ┐ ┌ Terminated ┐    By cluster
│  │   2     │ │   1     │ │     1      │     Mumbai     ▓▓▓ 3
│  └─────────┘ └─────────┘ └────────────┘     Singapore  ▓ 1
│  ─── Recent assets ───────────────────────────────────────────────────────
│   vm-web-01    VM   Mumbai      ● running     res_a1b2   [Open]
│   vm-batch-01  VM   Singapore   ● stopped     res_e5f6   [Open]
└──────────────────────────────────────────────────────────────────────────
```

Status `Badge` reuses the **operational axis** (`running`→green, `stopped`→gray,
`terminated`→red), distinct from billing's account-standing axis.
**Provision resource** (`atlas:manage`) is the only mutation — flagged 🟡; opens a
wizard out of scope here (it records a `Subscription` *intent*, then Central checks
the trust-tier cap and provisions via the cluster manager API —
[provisioning-and-entitlements.md](provisioning-and-entitlements.md)).

## B2. Virtual Machines — `/atlas/vms`  🟡

**Split view** (shared layout): VM **list** left, **detail panel** right. List
(dummy data) columns: name, cluster, plan, vCPU/RAM, status, IP — with the standard
toolbar (debounced search, cluster `Select`, status `TabButtons`). Row ⋯ menu:
Start / Stop / Open console / Terminate (`atlas:manage`, each a 🟡 proposed
endpoint; destructive ones via `dialog.confirm theme="red"`).

The **detail panel** has `Tabs`:
- **Details** — `resource_id`, cluster, plan, vCPU/RAM, IP, created, current cap
  slice.
- **Activity** — the resource's **event log** keyed on `resource_id` (subscribed /
  changed / started / stopped — Central's immutable event stream, recorded at
  provision, [architecture.md](architecture.md)).
  🟡 dummy until Central exposes a customer-readable event feed.

```
┌─ Atlas ▸ Virtual Machines ──────────────────────────────┐ vm-web-01      ✕ │
│ 🔎  Cluster [All▾]  [running·stopped·terminated]  [+VM]🟡│ Details Activity │
│ Name        Cluster    Plan      vCPU/RAM Status   IP    │ ──────────────── │
│ ▸vm-web-01  Mumbai     Standard  2/4GB  ● running 10.0.1.│ res_a1b2         │
│  vm-web-02  Mumbai     Standard  2/4GB  ● running 10.0.1.│ Mumbai · Standard│
│  vm-batch-01Singapore  Pro       8/32GB ● stopped 10.1.4.│ 2 vCPU · 4 GB    │
│  vm-old-01  Mumbai     Standard  2/4GB  ●terminated —    │ 10.0.1.11        │
│       ⋯ → Start · Stop · Open console · Terminate        │ ───────────────  │
│                                                          │ [Stop] [Console] │
└──────────────────────────────────────────────────────────┴─────────────────┘
   (Activity tab → vm-web-01 event log, keyed on res_a1b2)
   2026-04-02  subscribed   Standard  Mumbai
   2026-04-02  started      res_a1b2
```

```ts
// 🟡 swap MOCK_VMS → useList({ doctype: 'Atlas VM', ... }) when Atlas ships it
const vms = ref(MOCK_VMS)
function statusTheme(s) {
  return ({ running: 'green', stopped: 'gray', terminated: 'red' })[s] ?? 'gray'
}
```

A new VM and Start/Stop are bounded by the **trust tier** (`max_resource_count`,
`allowed_plans`, `allowed_clusters`), enforced by Central at provision. The
UI should pre-check against `get_trust_tier` and disable "New VM" in a cluster the
team can't use, linking to **Access Requests** (B4) — the cap is real (✅) even
though the VM CRUD is mocked (🟡).

## B3. Region / Cluster switch — `/atlas/region`  🟡

The "current region" determines where new resources default to provision. Switching
is allowed only among the team's **`allowed_clusters`** (✅ from `get_trust_tier`);
clusters outside that set are shown locked with a **Request access** CTA → B4.

```
┌─ Atlas ▸ Region ──────────────────────────────────────────────────────────
│   Current region:  ● Mumbai (ap-south-1)
│   ────────────────────────────────────────────────────────────────────────
│   ◉ Mumbai (ap-south-1)        active · 3 resources        [ current ]
│   ○ Singapore (ap-se-1)        active · 1 resource         [ Switch ]
│   🔒 Frankfurt (eu-central-1)  not in your tier            [ Request access ]
└──────────────────────────────────────────────────────────────────────────
```

- Render with `radio`-style selection (or `Select`); the locked row is disabled with
  a `Tooltip` explaining the tier gate. **Switch** (`atlas:manage`) → `dialog.confirm`
  → `set_current_region({ cluster })` 🟡 → `toast.success` + reload. Existing
  resources don't move — switching only changes the **default** for new provisions
  (matches the cluster-scoped, pre-partitioned cap model — multi-cluster slices are
  enforced per cluster).
- The allowed/locked split is ✅ (driven by `allowed_clusters`); the switch endpoint
  and "current region" persistence are 🟡.

## B4. Cluster access / activation request — `/atlas/access`  🟡

When a team wants a cluster **not** in `allowed_clusters` (e.g. a new region, or
activating a cluster on a trial that's single-cluster), they request it here. The
request is a lightweight record an operator reviews (or which auto-resolves on the
next trust-tier promotion that widens `allowed_clusters`).

```
┌─ Atlas ▸ Access Requests ─────────────────────────  [ + Request cluster access ] 🟡
│  Cluster                  Reason                 Status        Requested   │
│  Frankfurt (eu-central-1) GDPR data residency    ● Pending     2026-06-08
│  Singapore (ap-se-1)      Batch workloads         ● Approved    2026-05-15
│  Frankfurt (eu-central-1) Early test              ● Declined    2026-04-30  (tier too low)
└──────────────────────────────────────────────────────────────────────────

   New request (Dialog) ─────────────────────────────────┐
   Cluster   [ Frankfurt (eu-central-1) ▾ ]  (locked ones)│
   Reason    [ GDPR data residency for EU customers      ]│
   ⓘ Approval may require reaching tier t2. See Trust Tier.│
   [ Cancel ]                            [ Submit request ]│
```

- **Request** (`atlas:manage`) opens a `Dialog`: cluster `Select` (locked clusters
  only), reason `FormControl type="textarea"` →
  `request_cluster_access({ cluster, reason })` 🟡 → `toast.success('Request
  submitted')`. Status `Badge`: Pending→orange, Approved→green, Declined→red.
- Tie-in to the real model: an approved request widens the team's
  `allowed_clusters` / trust-tier cap; the spec note tells the user a tier
  promotion may grant it automatically (links B2/A4). The request *record* and its
  review workflow are 🟡 — confirm whether Central models this as a DocType or folds
  it into the existing operator console.

---

## Grounded vs. mocked — summary

| Screen | Grounding | Real artifact |
|--------|-----------|---------------|
| Members | ✅ | `central.iam`, `Team Member`/`Team Role` (slugs to confirm) |
| Roles & capability matrix | ✅ | Central capability registry, system roles (ADR 0004) |
| Custom role builder | ✅ | `make_custom_role_team` ([#45](issues/45-test-suite-update-capability-authz.md)) |
| Trust Tier (current) | ✅ | `get_trust_tier`, `Trust Tier` DocType |
| Trust Tier (next-tier progress) | 🟡 | needs `next_tier`/`progress` on `get_trust_tier` |
| Atlas Registry | 🟡 | concept only (`resource_id`, cluster); no API |
| VM list + actions | 🟡 | no `Atlas VM` DocType/API specced |
| Region switch | 🟡 | allowed set ✅ (`allowed_clusters`); switch endpoint 🟡 |
| Cluster access request | 🟡 | no request DocType/workflow specced |

**Open items for Central/Atlas owners:** confirm the exact `central.iam` method
slugs (members/roles), the `team:manage` / `atlas:*` capability names, whether
`get_trust_tier` will expose next-tier progress, and whether Atlas asset/VM/region/
access-request surfaces become real DocTypes + whitelisted APIs (replacing the
dummy-data modules above) or live entirely in a separate Atlas app.
