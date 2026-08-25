# Partner Billing — reselling, and the budget that bounds it

> Decision record: [ADR 0024](docs/adr/0024-partner-billing-budget-allocation.md).
> Mock: `/billing/partner-mock` in the console (`dashboard/src/mocks/partner/`), built against
> the real Billing Overview cards.
> Cross-refs: [provisioning-and-entitlements.md](provisioning-and-entitlements.md) (the trust-tier
> cap this sits beside), [credits.md](credits.md) (the wallet that funds it),
> [invoicing.md](invoicing.md) (who is invoiced), [dashboard.md](dashboard.md) (surfaces),
> [tax.md](tax.md) (the open GST question).

## The problem

A **partner** resells Frappe Cloud. Their customer pays *them*; they pay *us* on the customer's
behalf. The money flows in one direction and the service in the other:

```
customer ──pays──▶ partner ──pays──▶ us
   ▲                                  │
   └──────────── runs servers ────────┘
```

That leaves the partner exposed in the middle. A customer who has paid for ₹5,000 of hosting can
provision ₹10,000 of servers, and the bill lands on the partner's card. Nothing in the product
stops it: the only ceiling a team has is its **trust tier**, which is our judgement of *our* credit
risk, not the partner's judgement of *their* customer.

**Partner Billing is that missing ceiling.** The partner allocates a budget per customer; the
customer cannot provision past it.

## What this is not

- **Not sponsorship.** The partner is not giving anything away. They are holding a customer to what
  that customer has already paid them for. The word "sponsor" was in an early draft and is wrong in
  both directions — it misstates who is out of pocket and it makes the budget sound like generosity
  rather than a limit.
- **Not a discount or a margin model.** What the partner charges their customer is between them and
  their customer, and happens outside Central. We bill the partner our rates.
- **Not a new tenancy model.** A billed-through customer is an ordinary Team with ordinary servers.
  Only *who settles the invoice* and *what bounds provisioning* change.

## Concepts

**Partner team**
An ordinary Team that settles invoices for other teams. Nothing about its own billing changes: it
has a wallet, payment methods, invoices and a trust tier like any team, and it pays for whatever it
runs itself in the same cycle.

**Billed-through customer**
An ordinary Team whose invoices are settled by a partner team. It has no payment method of its own
and never meets a gateway.

**Budget allocation**
The amount a partner will let one customer consume in a **billing cycle**. It resets each cycle and
does not carry over. It is the partner's assertion of what that customer has paid for — Central
does not verify it, because the customer→partner payment happens outside Central.

_Avoid_: sponsorship, credit limit, allowance-as-a-gift. It is a **budget**, and the partner
**allocates** it.

**Remaining budget**
`budget − consumed this cycle`. This is the number both sides read: it is what decides whether a
provision is allowed.

## The rule

> A billed-through customer may not provision anything that would push its projected cycle spend
> past its remaining budget. Everything already running keeps running.

Two halves, and the second matters as much as the first.

**Blocking is the enforcement.** A budget that suspends servers would make a partner's
administrative decision — typing a smaller number — indistinguishable from non-payment, and would
take a customer's production down over an accounting ceiling nobody has actually failed to pay.
Suspension stays what it is today: the consequence of an unpaid invoice, via
[dunning](issues/14-retry-dunning-suspension.md).

**A budget lowered below what is already spent is legal**, and does exactly one thing: no further
purchases. The partner sees this stated before they save.

## Where the check lives

The budget is a **second quantitative cap alongside the trust-tier cap**, evaluated in the same
place — Central's synchronous provision check
([provisioning-and-entitlements.md](provisioning-and-entitlements.md)).

```
effective cap = min(trust-tier max_spend, remaining budget)
```

For a billed-through customer the budget will almost always be the binding one; the tier cap
remains because it is *our* risk limit and does not stop applying just because someone else is
paying. Credits-only teams already compose caps this way (`min(tier cap, wallet-covered spend)` —
[credits.md](credits.md)); this is the same shape with a third input.

The same ceiling narrows the **plan menu**: a plan whose rate exceeds the remaining budget is shown
but not purchasable, priced against the gap rather than silently hidden — the customer should be
able to see what they would need to ask for.

## Data model

**Budget Allocation** (new DocType, one row per partner × customer)

| Field | Type | Notes |
|-------|------|-------|
| partner | Link → Team | The team that settles |
| customer | Link → Team | The team that spends |
| budget | Currency | Float, **major units**, per cycle. Resets; does not carry over |
| currency | Link → Currency | Must match both teams' billing currency |
| status | Select | Active / Paused |
| created_at, modified_at | Datetime | |

**Billing Profile** (existing) gains:

| Field | Type | Notes |
|-------|------|-------|
| settled_by | Link → Team | The partner team, when this team is billed through one. Empty for ordinary teams |

`settled_by` is the switch: a profile carrying it is a billed-through customer, and the money-moving
surfaces (add payment method, top up wallet) are replaced rather than gated.

**Consumption** is not a stored field. It is the customer's cycle spend, read from the same forecast
the console already shows ([metering.md](metering.md)) — a second counter would be a second truth to
reconcile.

## Settlement

The invoice is **raised to the customer and settled by the partner**. The customer keeps a complete
billing record of what they ran; the partner's wallet and payment methods pay it.

The partner's own cycle total is therefore two things at once: what they run themselves, plus what
each of their customers ran. The cycle breakdown splits it line by line — this is why the partner's
Billing Overview is the ordinary one with a card added, not a bespoke page.

Collection follows the partner's collection mode, not the customer's: the ₹15,000 off-session
ceiling ([payments-inr.md](payments-inr.md)) applies to the partner's aggregate debit, which will
cross it far sooner than any single customer's bill. A partner on INR is therefore a likely
`manual_checkout` or `prepaid` team in practice.

## Requesting more budget

A customer at their limit can ask for more. The request carries an amount and an optional reason,
and appears **on that customer's row** in the partner's Budget allocations card — a customer wanting
more money is a fact about that customer, not a page-level alarm.

The partner answers it in the same dialog where they set the number: **Approve types the requested
amount into the field** rather than committing it behind a button, so the partner always sees and
confirms the figure they are agreeing to. Declining clears the request and changes nothing.

## Surfaces

**Partner — Billing › Overview.** The ordinary overview (cycle estimate + breakdown, wallet +
history, next payment + schedule, what you're paying for, payment methods, contact & tax) with one
card added after "What you're paying for": **Budget allocations**. One row per customer — name,
server count, a budget meter, and remaining-of-total on the right. A badge only where something
needs deciding: `Near limit`, `At limit`, `Paused`, or a pending request. The row opens the budget
dialog.

**Customer — Billing › Overview.** The ordinary overview with two changes:

- **Payment methods is replaced by "Budget this cycle"** — how much is left, of how much, allocated
  by whom. A billed-through customer has no method to order and no gateway to reach.
- **The plan menu is gated** on the remaining budget, and at zero the card states the block and
  offers the request.

Everything else — invoices, spend history, reports — is unchanged. The customer's invoices show
what they ran and who settled them.

## What a partner cannot do

Deliberately, the partner gets a budget lever and nothing else. They cannot see inside the
customer's servers, cannot provision on the customer's behalf, cannot power a customer's resource
off, and cannot read anything about the customer beyond what they are paying for. The relationship
is financial; the access model is not a back door into another team.

The customer can see who settles their bill. This is not concealed from either side.

## Open questions

**1. Over-allocation against the partner's wallet.** Nothing stops a partner allocating ₹22,500
across customers while holding ₹12,000 in their wallet — a promise they cannot fund. Options: cap
total allocation at wallet + method headroom; warn but allow; or leave it entirely to the partner.
Leaning toward **warn on the card** (allocated vs. funded is a comparison the partner can only make
if we show it) without blocking, since a working payment method makes the wallet balance a poor
proxy for capacity.

**2. What happens when the partner cannot pay.** A partner whose own invoice goes unpaid enters
dunning like any team — but their suspension would take *their customers'* servers down. Whether
enforcement cascades, and whether a customer is warned before it does, is undecided and is the most
serious unanswered question here.

**3. Unused budget.** A monthly allowance that resets means a customer who paid for ₹5,000 and used
₹3,200 forfeits ₹1,800 from Central's point of view — and the partner has to reconcile that with
their customer outside the product. If partners are actually reselling *prepaid amounts* rather than
monthly ceilings, a depleting pot models it better than a resetting allowance. Worth revisiting once
a real partner has used this.

**4. Overage to the customer's own card.** Whether a customer may exceed the budget by attaching
their own payment method for the excess. It splits the bill across two payers and needs the customer
to hold a method — deliberately out of scope for the first version.

**5. GST on the resale.** The customer→partner transaction is the partner's own supply and lives
outside Central, but our invoice is raised to the customer while a different entity pays it. Whether
that is the correct document flow for Indian GST — or whether the invoice should be raised to the
partner with the customer's consumption as line items — needs an accounting answer before this
ships. See [tax.md](tax.md).
