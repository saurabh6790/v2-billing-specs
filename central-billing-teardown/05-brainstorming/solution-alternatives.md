# Solution alternatives (D1, D2)

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
**Decide.** D-06 hold alert threshold and owner.

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

**Recommend.** Pick A or B in D-01; avoid C unless customers ask for both.
**Decide.** D-01 meaning; D-02 who may change mode (all teams or INR only).

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
