# Solution alternatives (D1–D4)

For each significant problem: the problem without a solution, why it matters, who
it affects, up to three options, a recommendation, and what a person must decide.
Nothing here is approved. Decisions are numbered in
[product-decisions-required.md](product-decisions-required.md).

---

## CB-21 Payment-method setups that do not finish

**Problem.** Most teams that start adding a payment method end with no usable
method and no record they can see.
**Why it matters.** It gates the welcome credit and paid servers; measured 10 teams.
**Affected.** New customers; support.
**Dependencies.** Root cause per row is unknown. Measure first: classify the 13
pending rows by gateway event history (abandon / decline / lost confirm).

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Show unfinished setups on Payments with the last reason and Retry; resolve failure events to Failed; expire pending rows after N days | Customer and support see the truth; fixes ignored `payment.failed` | Needs the failure-event mapping per gateway; more rows to design |
| B | Only fix the backend: map failure events, expire old rows; no UI | Small; clean data | Customer still sees nothing |
| C | Reduce drop-off in the flow itself (e.g. prefer in-dialog card field over hosted Checkout Session; pre-fill phone) | Attacks the cause, if the cause is friction | Unknown until measured; may not help bank declines |

**Recommend.** Measure, then A. Add C if the measurement shows abandonment.
**Decide.** D-04 expiry period; D-05 whether failed setups count against any limit.

## CB-22 Owed invoices held for accounting sync

**Problem.** Invoices owed by customers cannot be paid because they are not issued.
**Why it matters.** Cash; measured 2 of 2 external owed invoices.
**Affected.** Customers, finance.
**Dependencies.** Confirm the state in live production; find why sync is Pending.

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Operational: alert when an invoice stays held > N hours; Desk action "Retry sync / release" | Fast; uses existing retry | Treats the symptom if sync is misconfigured |
| B | Product: let customers pay a held invoice (issue after payment) | Cash first | Breaks ADR 0019 (ERPNext issues first); tax-invoice timing risk |
| C | Customer copy only: expected date + email when ready | Lowers worry | Collects nothing |

**Recommend.** A + C. B contradicts the ERPNext-authority decision; raise only if
holds turn out to be frequent.
**Decided (9 Nov 2026).** Holds are expected until the accounting integration and
accounts are finalised. Deferred; A and C apply when issuing starts.

## CB-03 + CB-04 Collection mode

**Problem.** Customers cannot see or choose how they pay, and the screen's meaning
of Prepaid differs from the engine's.
**Why it matters.** Every external team is Prepaid; 4 hold a method the engine can
debit.
**Affected.** Customers, finance, support.
**Dependencies.** D-01 must come first.

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Prepaid = credits only. Engine stops debiting methods for Prepaid; customer tops up or switches | Matches the screen and the word | Lower collection; more suspensions when credit runs out |
| B | Prepaid = credits first, then the method. Screen says so; method rows read "Charged when credit runs out" | Matches the engine; keeps cash flowing | Changes what customers were told; needs notice to the 4 teams |
| C | Split: "Credits only" and "Credits, then card" as two choices | Explicit | One more mode to support and test |

Then, in all cases: a "How you pay" card on Payments; no silent mode change on promote.

**Decided (D-01, 9 Nov 2026): B.** Prepaid = credits first, then the method for the
rest. The engine already does this; the work is console copy, removing the silent
mode switch, and the "How you pay" card.
**Still to decide.** D-02 who may change mode; D-12 whether Prepaid stays a separate
mode now that, with a method saved, it behaves like Auto Charge.

## CB-18 Support team view

**Problem.** Answering one billing question takes several lists or impersonation.
**Why it matters.** Every ticket in D1/D2; CB-21 cases are visible only this way.
**Affected.** Support, finance.
**Dependencies.** `get_team_billing` exists; needs extending (methods incl. pending,
mode, events, wallet).

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Desk page "Team billing" (one team, all facts, actions) | Task-shaped; one place | New page to maintain |
| B | Team form: billing connections + a summary HTML block | Uses Frappe built-ins | Summary in a form is cramped; actions spread |
| C | Query report filtered by team | Cheapest | Read-only; no actions |

**Recommend.** B now (connections are near-free), A next.
**Decide.** D-03 who is the support persona and what actions they may take.

## CB-01 Receipt arithmetic

**Problem.** The receipt's numbers do not add up when deductions apply.
**Why it matters.** Trust in the bill; not frequent yet (0 affected invoices).
**Affected.** Customers, accounts teams.

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Invoice total → deductions → Amount due | Adds up; matches tax invoice and button | Longer panel |
| B | Amount due only, breakdown on expand | Short | Hides the tax invoice figure |
| C | Rename and reorder only | Smallest change | Still two totals |

**Recommend.** A.
**Decide.** D-10 which figure the list's Amount column shows.

## CB-07 Payment status after Pay

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Poll while in flight (5 s for 2 min, then 30 s up to 15 min) | Works now | Extra requests |
| B | Push via socket.io on attempt change | Instant, no polling | Central has no billing push channel yet |
| C | Static message, no spinner | No engineering | Customer still reloads |

**Recommend.** A, then B with the platform push work.

## CB-02 Removing the last payment method

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Block removal of the last method while an invoice is owed on Auto Charge | Protects collection | Customer may be stuck with a card they want gone |
| B | Allow, with a specific warning: amount owed, what happens next (manual payment, dunning dates) | Customer choice, informed | Collection may fail |
| C | Allow only after replacing ("Replace card" flow) | Smooth | Needs a new flow |

**Recommend.** B now (exposure 0 today), C later.
**Decide.** D-11.

---

## CB-25 What the spending limit means (checkpoint 2)

**Problem.** Customers see the limit compared with figures the gate does not use.
**Why it matters.** 61 of 64 teams are on a $100 / ₹8,300 limit, so refusals will be
frequent and unexplained.
**Affected.** Customers creating servers; support.

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Limit = monthly run-rate of running subscriptions (today's gate); show "Running cost $80 of $100 a month" everywhere | One figure, already enforced; a purchase changes it predictably | Ignores metered usage and partial months |
| B | Limit = projected cycle total before tax; gate checks projected + new server | Matches the bill | Projection moves through the month; harder to explain a refusal |
| C | Two limits, both labelled | No engine change | Two numbers to learn |

**Recommend.** A. **Decide.** D-13.

## CB-23 Budget alerts

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Daily job: forecast before tax ≥ threshold → one email + in-app per cycle to billing members | Keeps the promise | New job and template |
| B | Check on each forecast load in the console only (banner) | No job | Only seen by people already looking |
| C | Remove the dialog until A ships | Honest now | Loses a feature customers may expect |

**Recommend.** C now if A is more than a sprint away, then A.

## Wallet and credits (CB-15 auto-recharge, CB-29, CB-31, CB-32)

| Option | What | Benefit | Drawback |
|---|---|---|---|
| A | Build auto-recharge (threshold + amount on a saved method) | Hands-off Prepaid | Under the decided rule the method is charged for the remainder anyway, so the gain is small |
| B | Remove the switch; explain the rule instead ("Credit pays first, then {method}") | Honest, no build | No top-up automation |
| C | Replace it with "Top up to cover this month" one-click | Simple | Still manual |

**Recommend.** B, with C for the top-up presets (CB-32). **Decide.** D-14.

Wallet history: separate a customer description per entry type from the operator
note; format dates; show expiry and remaining amount per grant; page and export.

## CB-34 + CB-35 Pause, stop and the bill (checkpoint 3)

| Option | For | Against |
|---|---|---|
| **A. Pause closes the segment, Resume reopens at the locked rate; Stop says it keeps billing** | Matches the pause promise and ADR 0010; small engine change | Two verbs stay |
| B. Stop ends billing; Pause removed | One verb | Revenue change; capacity held for free |
| C. Stop bills disk only | Close to cloud norms | New rating rule |

Recommended: A for #175 now (bug against a written promise); D-16 and D-17 settle the rest.

## CB-39 + CB-38 Purchase (checkpoint 3)

Return the credit-funded amount with the purchase state and mark plans above it,
rather than a second call per selection. Show plan + IPv4 = monthly total before
tax with "Taxes are added on top" (D-13).

## CB-41 + CB-42 Desk for support (checkpoint 3)

| Option | For | Against |
|---|---|---|
| **A. External-only cards, Team link, "Needs attention" block, alerts report from `collect()`** | Reuses existing queries; no new DocType | Alerts have no owner |
| B. Alert documents with owner and status | Assignment and history | New DocType and lifecycle |

Recommended: A; B only if alerts need assigning.
