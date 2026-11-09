# Central Billing teardown

An independent audit of Central Billing: every customer billing screen, the data it
shows, the errors it gives, and the system behind it, from discovery to a roadmap.
The main focus is UX: how easy each task is, which data helps, what is repeated or
adds nothing, and whether errors tell people what to do next.

Start with [10-final-assessment/executive-summary.md](10-final-assessment/executive-summary.md).

## Rules

Three rules govern every finding.

1. **Evidence before conclusions.** A finding states what was observed and where
   (`path:line`), then the mechanism, then how to verify it. Verdicts such as
   "unreliable" or "strong" are not findings.
2. **Code is not operation.** A retry function, a unique key or an audit job existing
   in code does not prove it works in production. Each finding and each control
   carries an evidence level:

   | Level | Meaning |
   |---|---|
   | E1 | Code present: found by search, not traced end to end |
   | E2 | Code traced: full path read; the behaviour follows from the code |
   | E3 | Test-backed: an existing automated test asserts it |
   | E4 | Operational: seen in production data, logs or a running system |

   This pass reached E1–E2 only.
3. **Measure before changing.** The teardown changes no code. For each finding it
   records what is not yet known (how often, what it costs) and a read-only way to
   find out. Proposed changes are on hold until then; severities are provisional.
   The [roadmap](10-final-assessment/prioritized-roadmap.md) runs measure, decide,
   change in that order.

## Method

- Code read at central `upstream/develop`, commit `a95b491e` (9 Nov 2026), from a
  read-only snapshot. No source, configuration, data or job was changed or run.
- Each customer screen was read from its route through every component, and each
  value it shows was traced to its composable and API.
- All 185 `frappe.throw` calls in `central/billing` (tests, demo, patches excluded)
  were extracted with an AST script and read.
- Every finding cites `path:line` at that commit. Paths start at the central repo
  root (`dashboard/src/...`, `central/billing/...`).
- **Verified** = read in code and follows from it. **Inferred** = follows from code,
  not seen running. Nothing was checked in a browser or against production data.

## Layout

| Folder | Files |
|---|---|
| [01-discovery](01-discovery/) | [system-overview.md](01-discovery/system-overview.md), [module-inventory.md](01-discovery/module-inventory.md), [dependency-map.md](01-discovery/dependency-map.md), [api-inventory.md](01-discovery/api-inventory.md), [jobs-and-hooks.md](01-discovery/jobs-and-hooks.md), [data-model-map.md](01-discovery/data-model-map.md), [outbound-call-sites.md](01-discovery/outbound-call-sites.md), [workflows.md](01-discovery/workflows.md), [docs-and-tests.md](01-discovery/docs-and-tests.md), [screen-map.md](01-discovery/screen-map.md), [phase-1-summary.md](01-discovery/phase-1-summary.md) |
| [02-domain-model](02-domain-model/) | [domain-model.md](02-domain-model/domain-model.md), [data-dictionary.md](02-domain-model/data-dictionary.md), [entity-ownership.md](02-domain-model/entity-ownership.md), [duplicated-and-low-value-data.md](02-domain-model/duplicated-and-low-value-data.md) |
| [03-workflows](03-workflows/) | [workflow-inventory.md](03-workflows/workflow-inventory.md), [customer-to-cash.md](03-workflows/customer-to-cash.md), [lifecycle-diagrams.md](03-workflows/lifecycle-diagrams.md), [screen-teardown.md](03-workflows/screen-teardown.md) |
| [04-financial-integrity](04-financial-integrity/) | [financial-integrity-review.md](04-financial-integrity/financial-integrity-review.md), [calculation-risks.md](04-financial-integrity/calculation-risks.md) |
| [05-integrations](05-integrations/) | [integration-inventory.md](05-integrations/integration-inventory.md), [integration-risk-register.md](05-integrations/integration-risk-register.md) |
| [06-processing](06-processing/) | [job-inventory.md](06-processing/job-inventory.md), [asynchronous-processing-review.md](06-processing/asynchronous-processing-review.md) |
| [07-resilience](07-resilience/) | [failure-scenario-matrix.md](07-resilience/failure-scenario-matrix.md), [resilience-review.md](07-resilience/resilience-review.md), [error-message-audit.md](07-resilience/error-message-audit.md) |
| [08-operations](08-operations/) | [support-operations-review.md](08-operations/support-operations-review.md), [manual-intervention-register.md](08-operations/manual-intervention-register.md) |
| [09-security](09-security/) | [security-review.md](09-security/security-review.md), [observability-review.md](09-security/observability-review.md) |
| [10-final-assessment](10-final-assessment/) | [executive-summary.md](10-final-assessment/executive-summary.md), [findings-register.md](10-final-assessment/findings-register.md), [risk-register.md](10-final-assessment/risk-register.md), [prioritized-roadmap.md](10-final-assessment/prioritized-roadmap.md), [open-questions.md](10-final-assessment/open-questions.md) |

Four files sit beside the requested ones because they carry the UX work:
`screen-map.md`, `screen-teardown.md`, `duplicated-and-low-value-data.md` and
`error-message-audit.md`.

## Severity

| Level | Meaning |
|---|---|
| P0 | Money taken or lost wrongly, data loss, or a security hole. None observed in code; not ruled out in operation. |
| P1 | Customer misled about money or service, or a failure only an engineer can clear. |
| P2 | A task is hard, screens contradict each other, or support load rises. |
| P3 | Polish, noise, dead code. |

Progress and coverage: [progress.md](progress.md).
