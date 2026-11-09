# Duplicate analysis

How symptoms were merged into one problem per root, and how the new IDs map to the
earlier pass. Issue numbers refer to `billing-specs/issues/` (146–174).

## Merged into one problem

| Kept | Symptoms merged | Shared root | Issue |
|---|---|---|---|
| CB-03 | No collection-mode screen; "Billing settings" points nowhere; promote silently switches Prepaid → Auto Charge; payment day only reachable from the Overview | Collection mode has no home in the UI | #148 |
| CB-14 | "Add a card" for a UPI-capable dialog; "Billable"/"Cost Report" subtitle; "gateway" in two toasts; "received" vs "once the gateway confirms"; "locked by billing activity" | No customer glossary | #174 |
| CB-16 | Filter missing Cancelled/Waived; Statement duplicates the list; "Tax invoices are issued separately" | Invoice list and Statement designed separately | #158 |
| CB-17 | Nine markup gaps A-01 to A-09 | No accessibility check in review | #169 |
| CB-21 | Hidden pending rows; ignored failure webhooks; no expiry | Setup outcome not tracked to an end state | #146 |
| CB-18 | Unused `get_team_billing`; no Team connections; sidebar by DocType; retired Entitlement Token in menu | No team-centred operator surface | #149 |
| CB-15 | "Email invoice" disabled; "Auto-recharge" switch that flips back (checkpoint 2) | UI built ahead of its backend | #170 |
| CB-29 | Raw timestamps; operator notes shown; no expiry per grant; 50-entry cap (CB-30, CB-31 folded in) | Wallet history renders ledger rows as stored | #160 |
| CB-32 | Presets ignore currency; GST computed in the browser (CB-33 folded in) | Top-up dialog built without server figures | #161 |
| CB-21 | Unfinished top-up orders (checkpoint 2) added to unfinished method setups | No end state for payment attempts the customer starts | #146 |

## Kept separate on purpose

| Pair | Why separate |
|---|---|
| CB-03 (no mode UI) vs CB-04 (Prepaid meaning) | CB-04 is a behaviour contradiction now a console copy fix after decision D-01; CB-03 is a new control. #150 must ship with or before #148. |
| CB-01 (receipt arithmetic) vs CB-09 (method not named) | Same button, different defects: wrong numbers vs missing information. |
| CB-07 (no refresh) vs CB-22 (held invoice) | Both show a "wait" state, but one is client polling and the other an accounting hold. |
| CB-05 (two controls) vs CB-03 | CB-05 is about charge order among methods; CB-03 about whether methods are charged at all. #171 depends on #148. |
| CB-18 (team view) vs CB-19 (invoice actions) | One is where support looks, the other what support can do. #167 depends on #149 for placement. |
| CB-20 (server error text) vs CB-14 (client copy) | Different code owners and fix shapes (typed errors vs strings). |
| CB-25 (limit basis) vs CB-26 (five cost figures) | One is what the limit means and the gate enforces; the other is page layout. #162 depends on #147. |
| CB-27 (banner flash) vs CB-06 (list error state) | Both are load-state bugs, in different components with different fixes. |
| CB-23 (alert never sent) vs CB-15 (dead controls) | CB-23 saves data and promises delivery; it needs a sender or a decision (D-15), not only removal. |

## Mapping to the earlier pass

| Earlier | Now | Note |
|---|---|---|
| F-02 | CB-02 | Priority lowered P1 → P2: no team on Auto Charge (E4) |
| F-01 | CB-25 | Raised to P1: 61 of 64 teams on the $100 / ₹8,300 tier (E4) |
| F-07 | CB-32 | — |
| F-16 | CB-29 | Confirmed in the browser |
| F-17 | CB-33, in #161 | — |
| F-04 | CB-11 | — |
| F-05 | CB-03 | — |
| F-06 | CB-05 | — |
| F-08 | CB-16 (Statement), CB-26 (Overview) | — |
| F-10 | CB-10 | — |
| F-13 | CB-15 | Email invoice and auto-recharge |
| F-15 (invoice parts) | CB-14, CB-16 | — |
| F-23 | CB-04 | Decision 9 Nov 2026: engine right; console copy fix (#150) |
| F-25 | related to CB-22 | F-25 is about retries stopping; CB-22 is the customer and operator effect of a hold |
| error-message-audit | CB-20 | D1/D2 messages only; the audit keeps the full list |
| F-03 (false success toasts) | — | Pause/project toggles belong to D5, not covered here |

## Overlap with the existing repo backlog

`billing-specs/issues/` was searched for "pending validation", "collection mode",
"team billing", "accounting sync" and "receipt".

| Existing issue | Overlaps | Decision |
|---|---|---|
| **125** Record why adding a payment method or topping up failed (not built at `a95b491e`: no `Payment Setup Attempt` in the code) | CB-21 support and diagnosis side: failure capture, Stripe `setup_intent.*` subscription, support list, failure-rate alert, Team connection to attempts | **#146 is rescoped** to what 125 leaves out: the customer sees the unfinished setup and retries, and the Payment Method reaches an end state. It depends on 125. 125's "connection from Team" also covers part of #149. |
| 93 Derived payment outcomes | Mentions Manual Checkout dunning | No overlap with D1/D2 drafts |
| 127 Partner pays | Uses collection mode | No overlap; #148 must keep the partner rule in mind |

| **145** Send billing operator alerts to Raven (built: settings, `notify_operators`, test button) | CB-42 alert delivery | **#182 is scoped** to the Desk list of open alerts, which 145 does not cover |
| 86 / ADR 0010 price lock folded into Subscription Change | CB-34 pause segments | ADR 0010 says stop/start carries the locked rate; #175 implements that for Pause. No open issue covers it |

| ADR 0025 metered services platform (design branch `docs/metered-services-platform`, not built) | CB-46, CB-48 | #186 and #187 are the billing slices of it, scoped to what Grove and Cargo expose today. Its Service registry and signed reports are not required for them |

No other open issue matches a draft. Check again before publishing.
