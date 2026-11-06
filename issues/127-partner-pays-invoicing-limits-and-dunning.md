# 127 — Invoice the partner when it pays, ask the partner above the limit, and handle partner dunning

**Type:** AFK · **Milestone:** post · **Area:** `central/central/doctype/partner_client_link/`, `central/billing/revenue/invoicing/generate.py`, `central/billing/revenue/invoicing/run.py`, `central/billing/doctype/invoice/`, `central/billing/payments/collection.py`, `central/billing/payments/collection_mode.py`, `central/billing/catalog/entitlements.py`, `central/billing/revenue/dunning.py`, `fixtures/notification_event_type.json`

## Problem

Central PR [frappe/central#508](https://github.com/frappe/central/pull/508) lets a customer choose "Partner pays, and bills me". It stores `paid_by_partner`, `spend_limit` and `buffer` on the Partner Client Link, and while the partner pays, the Partner role on the client team gets `billing:manage`.

Billing does not read any of these fields. The client team is still invoiced, and Central still charges the client team's own payment methods. Nothing enforces the limit or the buffer. When a partner's own payment fails, nothing tells its clients, and the operator cannot hold client notifications while a partner arranges to pay.

In v1, a customer often bought or upgraded a service without telling the partner, and the partner found out only when the bill came. The limit and buffer stop that.

## Decisions

These replace the parts of [ADR 0024](../docs/adr/0024-partner-billing-budget-allocation.md) and [partner-billing.md](../partner-billing.md) that they contradict.

| # | Decision |
|---|---|
| 1 | **The invoice goes to the partner.** One invoice per cycle, with one section per client team. It uses the partner's billing profile, GSTIN and place of supply, so the partner can claim input tax credit and then bill its client. The client team gets no invoice of its own for a cycle the partner pays. |
| 2 | **One currency.** A partner and its client always bill in the same currency, INR or USD. Central refuses to accept a link when the two billing currencies differ. Nothing converts between currencies. |
| 3 | **The Partner Client Link holds the payer and the limits.** No `Budget Allocation` DocType and no `Billing Profile.settled_by`. A team is paid for by a partner when it has an Active link with `paid_by_partner` set. |
| 4 | **Access follows PR 508.** A partner that pays keeps the Partner role on the client team and also gets `billing:manage`. This replaces ADR 0024 §9. |
| 5 | **The partner sets the limit and the buffer.** The customer cannot change either one. |
| 6 | **Purchases up to `spend_limit + buffer` need no approval.** This covers a new server, a site, a plan upgrade, an add-on, or a resize. Central compares the client's forecast spend for the cycle, including the new purchase, with the limit. |
| 7 | **A purchase that goes past `spend_limit + buffer` waits for the partner.** Central saves it as an approval request and does not run it. The partner approves or declines it. Approve runs the purchase. Decline, or no answer by the expiry date, cancels it and tells the customer. |
| 8 | **Nothing is blocked or suspended because of the limit.** Resources keep running. Metered usage on running resources (such as AI tokens or storage) is not a purchase and never needs approval. The partner pays for it. |
| 9 | **When a partner payment fails, the partner and its clients are told.** Clients are told the partner's payment failed. They are not asked to switch payer, because a client may have paid the partner in advance. |
| 10 | **An operator can hold client notifications.** When a partner asks for more time ("I will pay on the 13th"), the operator records a promise-to-pay date on the partner invoice. Until that date, clients get no dunning notices and dunning waits. On that date, if the invoice is still unpaid, only the internal team is notified. |
| 11 | **7 days before Terminate, Central warns the internal team and the clients.** The internal team gets an alert, and each client gets a serious notice that its resources are at risk. A hold from decision 10 stops the client notice but not the internal alert. |

## Defaults chosen in this issue

Change one in review if it is wrong.

- **Who pays changes at the next cycle.** If a link starts paying, stops paying, or ends partway through a cycle, the payer at the start of that cycle pays the whole cycle. A link that ends partway through stays in an Ending state until the cycle closes. Splitting a cycle between two payers is not done.
- **The partner is told at `spend_limit`.** Between `spend_limit` and `spend_limit + buffer`, a purchase goes ahead and the partner gets one notice for that cycle. No approval is needed.
- **The client's wallet does not pay the partner invoice.** Only the partner's wallet and payment methods pay it. While the partner pays, the client cannot top up its wallet or add a payment method.
- **The trust tier check uses the partner's tier** against the partner's total forecast: its own usage plus every client it pays for.
- **Collection follows the partner's collection mode.** All clients together often go over the ₹15,000 auto-debit limit, so the existing Action Required flow applies to the partner.

## TODO — invoice the partner

- [ ] When generating a cycle's invoices, group each team that has an Active `paid_by_partner` link under its partner. Make one partner invoice per currency and cycle, and skip a separate invoice for those client teams.
- [ ] Add a `client_team` link to Invoice Line Item, and show a subtotal for each client on the invoice, the PDF and the ERPNext Sales Invoice.
- [ ] Take tax from the partner's Billing Profile (GSTIN, place of supply, SEZ).
- [ ] Refuse `PartnerClientLink.accept` and a later switch to `paid_by_partner` when the partner's and the client's billing currencies differ.
- [ ] Apply the cycle-boundary rule when `paid_by_partner` changes or a link ends partway through a cycle.
- [ ] In the client's console billing pages, show usage per cycle and "Paid by <partner>". Hide top-up and payment-method actions while the partner pays.

## TODO — limit, buffer and approval

- [ ] Add the check in the synchronous provision check next to the tier cap (`entitlements.get_team_caps`). If the forecast after the purchase stays at or below `spend_limit + buffer`, the purchase goes ahead. Above that, Central makes an approval request.
- [ ] Add a `Partner Approval Request` DocType: client team, partner team, link, the held Resource Action or plan change, amount, forecast after the purchase, status (Pending, Approved, Declined, Expired), expiry, and who decided. Index `team`, `partner_team` and `status`, and wire query conditions and `has_permission` to both teams.
- [ ] Hold the Resource Action as Awaiting Approval. Approve releases it. Decline or Expire cancels it with a reason the customer can read.
- [ ] Add console surfaces: the customer sees the pending request and its state, and the partner sees its clients' requests and can approve or decline them.
- [ ] Notify the partner at `spend_limit` (once per cycle) and on each new approval request. Notify the customer when a request is approved, declined or expires.
- [ ] Remove the description "before Central stops charging the partner" from `buffer` in `partner_client_link.json`. The buffer marks where approval begins. It does not stop charges.

## TODO — partner dunning

- [ ] Add a notification event for a client team: "<partner>'s payment for your hosting failed." Send it on the first failed charge of a partner invoice. It must not ask the client to pay or to switch payer.
- [ ] Add a promise-to-pay date and a reason to Invoice, with a desk Action button "Record promise to pay". It calls `defer_dunning` so the dunning clock waits until that date, and it stops client dunning notices for that invoice.
- [ ] On the promise-to-pay date, if the invoice is still unpaid, notify the internal team only.
- [ ] 7 days before the Terminate stage of a partner invoice, notify the internal team and send each client the at-risk notice, unless a hold is active.
- [ ] Let an operator turn off client dunning notices for one partner invoice, with a reason, from desk.

## TODO — documents

- [ ] Update [partner-billing.md](../partner-billing.md) and ADR 0024 with the decisions above. Remove the Budget Allocation model, the access rule in §9, and open questions 1, 2 and 5 now that they are answered.

## Acceptance criteria

- [ ] A cycle with one partner and two paid-for clients produces one invoice to the partner, with a subtotal for each client and the partner's tax details. The clients get no invoice of their own.
- [ ] Accepting a link with a USD partner and an INR client is refused with a clear message.
- [ ] Changing who pays partway through a cycle changes the payer only from the next cycle.
- [ ] A purchase that stays within `spend_limit + buffer` runs at once. A purchase past it waits as a Pending request and runs only after the partner approves it.
- [ ] A declined or expired request does not run, and the customer sees why.
- [ ] No resource is blocked or suspended because of the limit. Metered usage past the limit is billed to the partner.
- [ ] A failed partner charge notifies the partner and each client, and the client notice does not ask the client to pay.
- [ ] With a promise-to-pay date recorded, clients get no dunning notices before that date, and the internal team is notified on it if the invoice is unpaid.
- [ ] The internal team and the clients are warned 7 days before Terminate.
- [ ] Each permission rule on Partner Approval Request has a test, including the denial case and the cross-team case.

## Open question

- **What do Suspend and Terminate do to client resources?** The partner invoice covers the clients' usage, so the partner's dunning stages would reach the clients' servers. Decide before this ships whether a client keeps running after the partner is suspended, and for how long.

## Blocked by

Central PR [frappe/central#508](https://github.com/frappe/central/pull/508) (Partner Client Link, `paid_by_partner`, `spend_limit`, `buffer`).
