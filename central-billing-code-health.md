# central/billing — code health review (readability, locality, debuggability, security)

A sweep of `central/billing` (2026-08-04, branch `develop` @ `61a4de9`) against five
questions a maintainer actually cares about:

1. **Readable** — can you understand a function by reading it?
2. **Local** — can you understand one behaviour without hopping between files?
3. **Debuggable** — when it breaks at 2am, does the code tell you where?
4. **Collaborator-ready** — are the conventions enforced by machine, not by memory?
5. **Secure** — no open loop between the HTTP door and the money.

Companion to [central-billing-review-notes.md](central-billing-review-notes.md) (which covers
domain-model debt) and [security.md](security.md). This one is about the shape of the code,
not what it computes.

**Verdict: the module is in good shape.** 34k lines, 205 modules, 716 test methods across 76
test files. The layering is real and machine-enforced. The findings below are hygiene and one
genuine layer inversion — none are blockers.

---

## Scorecard

| Criterion | Verdict | What the numbers say |
| --- | --- | --- |
| Readable | **Strong** | 17 of 842 functions exceed 60 lines; 52 exceed 40. 71% of functions carry a return annotation. Comments are consistently *why*-comments, not narration. |
| Local | **Mixed** | The layer graph points one way — but 193 function-level imports hide it, and only 52% of modules (107/205) have a docstring. |
| Debuggable | **Strong** | `ARCHITECTURE.md` is 542 lines ending in a symptom→file cheat-sheet. Zero `print()` in production paths. Broad `except`s mostly carry `# noqa: BLE001 —` plus a reason. |
| Collaborator-ready | **Strong** | `tests/test_whitelist_boundary.py` enforces the security layering with an AST walk. Conventions fail a PR, not a reviewer's memory. |
| Secure | **Strong, with hygiene gaps** | Signature-first webhooks, server-confirmed amounts, hashed pilot tokens, parameterised SQL. But 77 of 99 permission bypasses carry no reason. |

### The dependency graph is clean

Cross-package imports, counted by direction:

| Package | Depends on |
| --- | --- |
| `gateways` | nothing but itself |
| `platform` | `revenue` ×1, `payments` ×1 |
| `catalog` | `platform` ×1, `payments` ×1 |
| `revenue` | `catalog` ×9, `platform` ×3, `payments` ×3 |
| `payments` | `gateways` ×8, `revenue` ×6, `platform` ×6, `catalog` ×3, **`api` ×1** |
| `api` | `catalog` ×36, `payments` ×25, `gateways` ×11, `revenue` ×10 |

`api` sits on top and nothing calls back into it — except one arrow (finding 1).

---

## Findings, worst first

### 1. Layer inversion — domain reaches up into the API layer

`payments/provisioning.py:44`:

```python
from central.billing.api.dashboard._shared import currency_for_country
```

This is the only arrow that breaks an otherwise one-way graph, and it's the kind that
multiplies: once one domain module imports from `api/`, the next one has precedent. It also
makes `provisioning` untestable without dragging the dashboard layer in.

**Fix:** move `currency_for_country` down into `catalog/` or `platform/` and have
`api/dashboard/_shared.py` import it from there.

### 2. Gateway specifics leaked into a dashboard endpoint

`api/dashboard/invoices.py:481` — `confirm_topup` is 68 lines of
`if adapter_key == "Razorpay" / elif "Paypal" / else Stripe`, each branch reaching into
gateway-shaped response dicts (`payment["amount"] / 100`, `capture["amount"]`,
`intent["amount_received"]`).

`gateways/base.py` exists precisely to hold this — `GatewayAdapter` is an ABC with 20+
methods and the adapters already normalise charge/refund/webhook. Top-up confirmation is the
one flow that skipped the seam. Adding a fourth gateway currently means editing a dashboard
endpoint.

This is the "no jumping between files" goal inverted: everything *is* in one file, but it's
the wrong file, and the abstraction that should own it is one directory away.

**Fix:** add `GatewayAdapter.confirm_topup(**refs) -> (amount, currency, reference)`, implement
per adapter, and reduce the endpoint to resolve-adapter → confirm → `credits.purchase`.

**Worth keeping:** every branch already re-derives the amount from the gateway and never
trusts the client figure, with a comment saying so. That's the important half and it's right.

### 3. 77 unexplained `ignore_permissions=True`

99 occurrences in non-test, non-demo code; only 22 have an explanatory comment nearby.
`payments/payments.py` has 6 in ~90 lines (`:79, :115, :133, :161, :165, :170`), others at
`settings.py:97`, `states.py:234`, `payments/collection_mode.py:60,81`.

Each one is a deliberate authorization bypass. The 22 that carry a comment read fine; the rest
are indistinguishable from an accident — which is exactly what makes the next audit expensive.
This is already a recorded review convention; it just hasn't been applied retroactively.

**Fix:** a one-line `# why` on each (usually "system-authored ledger row, no user in the
request"). Cheapest security work available in this module. Consider an AST test in the shape
of `test_whitelist_boundary.py` that requires a comment on the same or preceding line.

### 4. A silent swallow in the reconciliation path

`payments/reconciliation.py:227`:

```python
except Exception:  # noqa: BLE001
    pass
```

No log, no context. This is the code path that finds charged-but-never-webhooked payments — if
it ever fires, nobody will know, and the failure mode it's hiding is money that moved without a
record. Every other broad `except` in the module either logs (`frappe.log_error`) or explains
why swallowing is correct (`platform/invariants.py:403` — "One broken check must not blind the
other six" — is the model).

**Fix:** `frappe.log_error(title=..., message=frappe.get_traceback())` and say why it's
best-effort.

### 5. `SyntaxWarning` on every import of `payments/payments.py`

Line 12, inside the module docstring's ASCII state diagram:

```
    pending_validation --(micro-charge ok)--> active --(monthly expiry)--> expired
                       \--(micro-charge fail)--> failed
```

`\-` is an invalid escape sequence. Python warns today and will error in a future version.

**Fix:** make it a raw docstring (`r"""`). One character.

### 6. Oversized functions in the presentation layer

The five largest production functions:

| Lines | Where |
| --- | --- |
| 138 | `api/dashboard/catalog.py:51` `get_eligible_plans` |
| 111 | `revenue/metering.py:328` `_metered_lines` |
| 94 | `payments/charges.py:329` `apply_webhook` |
| 85 | `revenue/dunning.py:129` `process_invoice_dunning` |
| 84 | `revenue/invoicing/lifecycle.py:20` `open_and_collect` |

Only the first is a real smell — it's the biggest function in the module *and* it's in the
API layer, which should be assembling a response, not computing eligibility. The rest are
domain flows where the length reflects genuine sequence.

**Fix:** push plan-eligibility computation into `catalog/`, leave shaping in the endpoint.

### 7. Function-level imports hide the collaborator graph

193 function-level `from central...` imports in non-test code, concentrated in
`payments/collection_mode.py`, `payments/payments.py`, `payments/settlement.py`,
`payments/refunds.py`, `payments/provisioning.py`, `payments/mandates.py`, `catalog/trials.py`,
`payments/charges.py`.

Most are cycle-dodges and defensible individually. The cost is that a file's collaborators
aren't visible from the top — which is precisely the "I have to jump between files to
understand one thing" tax.

**Fix (cheap, no refactor):** give the 98 modules currently missing a docstring one that names
what the module owns and who it talks to. The import can stay deferred; the *knowledge*
shouldn't be. Combined with `ARCHITECTURE.md` §1, that closes the locality gap without
restructuring anything.

---

## What to keep as the model

**`tests/test_whitelist_boundary.py`** is how a convention should be enforced. The 2026-07
audit found domain primitives carrying `@frappe.whitelist()` — credit minting, payment-method
mutation, invoice charging, all reachable over `/api/method/...` by any logged-in user.
`security.md` §3 already forbade it; the rule was violated because it was checked by hand.

The fix was not a stronger doc. It was a test that:

1. walks the AST of every billing file and fails any `@frappe.whitelist()` outside
   `billing/api/**`, with a `BOUNDARY_ALLOWLIST` where each entry carries its reason;
2. fails any API endpoint whose body doesn't call the authz seam on entry
   (`require_billing_manage`, `_resolve_team`, `pilot_credential_auth`, …);
3. keeps one regression per exploited primitive, asserting `frappe.is_whitelisted` still
   raises `PermissionError`.

That single file does more for onboarding a collaborator than any amount of prose, because it
fails their PR instead of a reviewer's memory. **Every convention in this doc that matters
should end up shaped like that** — finding 3 is the obvious next candidate.

Other things worth not regressing:

- **`payments/webhooks.py`** — HMAC verified as the first operation on payload content, before
  any content-keyed lookup or write, with the reason in the module docstring. No gateway SDK
  imported at the receiver.
- **`api/billing_api.py:25`** — `_team()` returns the team bound to the verified credential,
  with the comment "never a request param". The whole pilot surface is `allow_guest` and safe
  because identity comes from the token, not the body.
- **`_as_operator()`** (`api/billing_api.py:36`) — elevation is a context manager with
  `try/finally`, so nothing later in the request keeps operator rights.
- **`PilotCredential.verify`** — token stored hashed, and re-checked against the freshly loaded
  row because the lookup and the load are two reads (a concurrent `rotate()` would otherwise
  admit a superseded token once). That comment is the standard for why-comments here.
- **`tests/e2e.py`** — 16 `allow_guest` seed endpoints, hard-gated on `frappe.conf.allow_tests`
  and checked *before* elevation, with the reasoning in the module docstring.
- **`ARCHITECTURE.md` §7** — symptom → where-to-look. The single highest-leverage page for a
  new collaborator.

---

## Suggested order of work

| # | Finding | Size |
| --- | --- | --- |
| 1 | `SyntaxWarning` in `payments/payments.py` (5) | one character |
| 2 | Log instead of swallow in `reconciliation.py:227` (4) | one line |
| 3 | Move `currency_for_country` out of `api/` (1) | small |
| 4 | Comment the 77 bare `ignore_permissions` (3) | mechanical, do in one pass |
| 5 | Module docstrings for the 98 without one (7) | mechanical |
| 6 | `GatewayAdapter.confirm_topup` seam (2) | real refactor, own branch |
| 7 | Split `get_eligible_plans` (6) | real refactor, own branch |
