# Partner billing is a resale ceiling, not a sponsorship

Date: 2026-08-25

Partners resell Frappe Cloud. Their customer pays them; they pay us. Today nothing bounds what that
customer can consume except the **trust tier**, which is our assessment of our own credit risk — it
has no opinion about what the customer has paid their partner. So a customer who bought ₹5,000 of
hosting can provision ₹10,000 of servers, and the partner absorbs the difference.

Two framings were available, and they lead to different products.

**Sponsorship**: the partner funds a customer as a favour, the budget is a grant, and the natural
model is a pot the partner tops up. **Resale**: the customer has already paid, the budget is the
ceiling on what they paid for, and the natural model is a limit the partner sets and revises.

The second is what actually happens, and the first was in an early draft of the mock. It misstated
who is out of pocket ("sponsor" implies the partner chose to be generous, when they are simply
exposed between two payments) and it made a control sound like a gift.

## Decision

**1. Partner billing is a resale ceiling.** The vocabulary follows the money: the partner
**allocates a budget**; the card is **Budget allocations**; the field that sets the number says
*what they've paid you for*. Nothing is called a sponsorship, a grant or a credit limit.

**2. The budget is a per-cycle amount that resets.** It does not carry over. A partner who wants to
extend a customer raises the number; a partner reconciling an underspend does it with their customer,
outside Central. (A depleting pot models prepaid resale better and is the most likely revision —
see partner-billing.md, open question 3.)

**3. The budget blocks new purchases and never stops anything running.** A budget lowered below what
is already spent is legal and means "no more", not "off". Suspension remains the consequence of an
unpaid invoice, reached through dunning. Making an administrative number-change capable of taking
down production would make a partner's ordinary bookkeeping indistinguishable from non-payment.

**4. It is a cap in the existing cap check, not a new gate.** Central already evaluates a
quantitative ceiling synchronously at provision time; the budget composes into it:

```
effective cap = min(trust-tier max_spend, remaining budget)
```

The tier cap still applies. It is *our* risk limit and does not stop applying because a third party
is paying. This mirrors how credits-only teams already compose
(`min(tier cap, wallet-covered spend)`).

**5. Consumption is read from the forecast, never stored.** A `consumed_this_cycle` column would be
a second truth about what a team ran, reconcilable against the meter and therefore eventually wrong.

**6. The invoice is raised to the customer and settled by the partner.** The customer keeps a
complete record of what they ran. The partner's cycle total is their own usage plus each customer's,
split line by line in the existing cycle breakdown.

**7. The partner's surface is the ordinary Billing Overview with one card added.** A partner is a
team like any other — it has a wallet, methods, invoices and its own servers, and what its customers
ran *is* its bill. A bespoke partner console would duplicate every card and drift from it. The mock
is literally `BillingOverviewPage.vue` plus one card, and that is the shipping shape.

**8. A budget request appears on the customer's row, and Approve types the number in.** The ask is a
fact about one customer, not a page-level alarm; and the partner confirms the figure they are
committing to rather than approving an amount decided elsewhere.

**9. The partner gets a budget lever and no other access.** No visibility into the customer's
servers, no provisioning on their behalf, no power actions, no data beyond what they are paying for.
The relationship is financial and the access model must not become a back door into another team.
The customer can see who settles their bill; this is concealed from neither side.

## Consequences

- One new DocType (**Budget Allocation**) and one new field (`Billing Profile.settled_by`). No change
  to metering, invoicing, the ledger, or the gateway seam.
- The provision check gains a third input. Its shape does not change.
- Collection follows the **partner's** collection mode. An INR partner aggregating several customers
  will cross the ₹15,000 off-session ceiling routinely, so partners are in practice
  `manual_checkout` or `prepaid` teams — the threshold machinery already handles this and needs
  nothing new.
- A partner can allocate more than they can fund. We show allocated against funded and do not block
  (open question 1).
- **Unresolved and serious:** whether a partner's own dunning cascades to their customers' servers,
  and whether a customer is warned before it does. A partner's suspension currently has no defined
  effect on the teams they settle for.
- **Unresolved:** whether raising our invoice to the customer while a different entity pays it is
  the correct document flow for Indian GST.
