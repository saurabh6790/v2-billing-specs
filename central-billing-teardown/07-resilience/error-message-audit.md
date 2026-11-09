# Error message audit

Do the messages a customer or an operator sees say what happened and what to do
next? Paths are at central `a95b491e`.

## How errors reach the screen

- The server raises `frappe.throw(message)`. 185 calls in `central/billing`
  outside tests, demo and patches; 175 wrap the text in `_()`, 10 do not.
- The console reads `messages[0]`, then `exc_message`, then `message`, strips HTML
  and the exception type, and shows it in an Alert or a persistent error banner
  (`dashboard/src/lib/feedback.ts`, `getErrorMessage`, `reportError`).
- So **the server's sentence is the customer's sentence.** A message written for an
  operator or a developer reaches the customer unchanged.
- Gateway failures are wrapped: the customer sees "We could not reach the payment
  provider. Try again in a few minutes." or "The payment provider could not process
  this request. Contact support if this keeps happening." and the raw gateway text
  goes to the Error Log (`gateways/base.py:130-143`).
- Card declines are mapped to "{reason}. Try another card, or add credit to your
  account instead." (`payments/decline.py:160-163`).

## The standard used

A good message says, in the customer's words: **what happened**, **why** if it
helps, and **what to do now**. It names no DocType, field, state or internal
concept the customer has never seen on screen.

## Good examples to copy

| Message | File |
|---|---|
| "The payment could not be confirmed. Check your credit balance and payment history before paying again. Contact support if you were charged but no credit appears." | `api/dashboard/invoices.py:903` |
| "Billing currency is locked to {0}: this team already has a wallet, payment method, or invoice, so it can't be changed." | `api/dashboard/account.py:130` |
| "Complete your billing profile before you can {0}. Missing: {1}." | `doctype/billing_profile/billing_profile.py:138` |
| "This card is already on file for the team — the same card can't be used as both the primary and a backup method." | `doctype/payment_method/payment_method.py:36` |
| "GSTIN state code '{0}' does not match {1} (code {2}). The first two digits of a GSTIN are the registration state's code." | `doctype/billing_profile/billing_profile.py:480` |
| "You can change the payment date {0} times in a billing cycle. You can change it again next month." | `doctype/billing_profile/billing_profile.py:251` |
| "This plan has no price in {0} for this region. Choose another plan." | `catalog/subscriptions.py:382` |

## Messages a customer can reach that need rewriting

Reachability is judged from code (the message is raised on a path an `api/dashboard`
or pilot endpoint calls). Which messages customers actually see, and how often, is
not measured (roadmap A15). Rewrites are proposals, on hold until then.

| Message today | File | Problem | Rewrite |
|---|---|---|---|
| "This configuration ({0}) exceeds your remaining headroom ({1})." | `catalog/subscriptions.py:1060` | "Headroom" appears nowhere on screen. The screens say "spending limit". | "This server costs {0} a month. Your spending limit leaves room for {1}. Choose a smaller size, or contact support to raise your limit." |
| "Tagging this server into the project would exceed its spending limit (…)" | `catalog/subscriptions.py:1102` | "Tagging" is internal; the button says "Move to project". | "Moving this server to {project} would take the project over its spending limit of {limit}." |
| "{0} requires {1} GB RAM for {2} vCPU (ratio 1:{3}), not {4} GB." | `catalog/composition.py:110` | Ratio jargon; the slider should prevent this. | "With {2} vCPU this server type needs {1} GB of memory." |
| "Unknown optimisation profile {0}." / "A composed config needs an optimisation profile." | `catalog/composition.py:91`, `catalog/subscriptions.py:728` | Internal names for the server type and custom size. | "Choose a server type for your custom size." |
| "This server has no verified regional identity." | `catalog/subscriptions.py:470` | Meaningless to a customer; no next step. | "This server can't be resized right now. Contact support and quote server {id}." |
| "Payment confirmation failed." | `payments/charges.py:430,447` | No reason, no next step, and money may have moved. | Reuse the invoices.py:903 sentence. |
| "No payment method/gateway resolved for {0}" | `payments/charges.py:497` | Developer wording. | "There is no saved payment method that can pay this invoice. Add a card or UPI mandate, or pay it now from Invoices." |
| "A team needs at least one settlement source (autopay or prepaid credits) before it can provision." | `payments/settlement.py:67` | "Settlement source", "provision". | "Add a payment method or credit before you create a server." |
| "{0} {1}: illegal transition {2} → {3}." | `states.py:230` | Surfaces a DocType, a record id and two states. Reached when a customer action races a webhook (for example, paying an invoice that just settled). | Raise a typed error; the API catches it and says "This invoice changed while you were paying. Refresh to see its status." |
| "No billing state machine owns {0}." | `states.py:196` | Developer assertion. | Log it; show the generic "We couldn't complete that" and an error id. |
| "Pick one of Manual Checkout, Prepaid, Auto Charge." | `payments/collection_mode.py:186` | Lists internal mode names. Only reachable with a bad API call, so low priority. | "Choose how you want to pay." |
| "Not permitted for this team." / "Method does not belong to this team." | `api/billing_api.py:39`, `payments/payments.py:320` | Fine for an API, cold for a person. | "You don't have access to this team's billing. Ask a team admin." (the `authz.py:58` sentence is already good) |
| "Project {..} is disabled; its servers bill untagged on {..}'s consolidated invoice." | `doctype/subscription/subscription.py:71` | Not translated (f-string), and "untagged", "consolidated" are internal. | `_("Project {0} is turned off. Turn it on before moving servers into it.")` |
| "Project needs a title." | `api/dashboard/projects.py:78,102` | Not wrapped in `_()`. | `_("Give the project a name.")` |
| "Cannot bill team {0} — unpriced metered usage: {1}." | `revenue/metering.py:478` | Operator-facing. Fine if it never reaches a customer; check that no customer action calls it. | Keep for operators; route to the alert channel. |
| "Refund amount must be > 0 and <= the captured amount." | `payments/refunds.py:55` | Symbols instead of words. Operator-facing. | "Refund an amount between 0 and {captured}." |

## Client-side messages

| Message | File | Problem |
|---|---|---|
| Success toast after Pause / Resume billing, shown even when the call failed | `usePayingFor.ts:99-100` | Wrong message, not only wrong wording (F-03) |
| "Project disabled." / "Project enabled." after a failed toggle | `useProjects.ts:25-26` | Same pattern (F-03) |
| "Payment received. The invoice updates once the gateway confirms." | `usePayInvoiceCheckout.ts` (after confirm) | "Received" and "once the gateway confirms" in one sentence contradict. Use "Payment sent. We'll mark the invoice paid as soon as your bank confirms." |
| "Auto-recharge isn't available yet" | `WalletHistoryPanel.vue:30` | Explains a control that should not be there (F-13) |
| "Couldn't load your spend." with Retry | `SpendCard.vue:210-211` | Good |
| "Payment processing since {date}." | `OutstandingAlert.vue:76` | Good. Consider "We're waiting for your bank" to match the invoice panel. |

## Systemic fixes

1. **Split customer and operator errors.** Domain code raises typed errors
   (`LimitExceeded`, `StaleInvoiceState`, `NoChargeableMethod`). The `api/dashboard`
   layer maps each to one customer sentence. Unknown errors become "We couldn't
   complete that. Try again, or contact support with reference {error_log_id}."
2. **Add a lint rule:** every `frappe.throw` argument is `_()`-wrapped (10 are not).
3. **Ban internal words in customer messages:** headroom, provision, settlement
   source, transition, tagging, consolidated, optimisation profile, regional
   identity, DocType names. A Guard rule over `api/dashboard/**` and the functions
   it calls can catch most of them.
4. **Always pair an error with an action.** Where a support contact is the only
   action, attach the Error Log id so support can find it.
