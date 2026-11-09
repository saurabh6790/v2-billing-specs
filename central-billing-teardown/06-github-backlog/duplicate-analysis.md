# Duplicate analysis

How symptoms were merged into one problem per root, and how the new IDs map to the
earlier pass. "Draft" numbers refer to [issue-drafts/](issue-drafts/), not GitHub
issue numbers.

## Merged into one problem

| Kept | Symptoms merged | Shared root | Draft |
|---|---|---|---|
| CB-03 | No collection-mode screen; "Billing settings" points nowhere; promote silently switches Prepaid → Auto Charge; payment day only reachable from the Overview | Collection mode has no home in the UI | 03 |
| CB-14 | "Add a card" for a UPI-capable dialog; "Billable"/"Cost Report" subtitle; "gateway" in two toasts; "received" vs "once the gateway confirms"; "locked by billing activity" | No customer glossary | 21 |
| CB-16 | Filter missing Cancelled/Waived; Statement duplicates the list; "Tax invoices are issued separately" | Invoice list and Statement designed separately | 15 |
| CB-17 | Nine markup gaps A-01 to A-09 | No accessibility check in review | 16 |
| CB-21 | Hidden pending rows; ignored failure webhooks; no expiry | Setup outcome not tracked to an end state | 01 |
| CB-18 | Unused `get_team_billing`; no Team connections; sidebar by DocType; retired Entitlement Token in menu | No team-centred operator surface | 05 |

## Kept separate on purpose

| Pair | Why separate |
|---|---|
| CB-03 (no mode UI) vs CB-04 (Prepaid meaning) | CB-04 is a behaviour contradiction that needs a product decision (D-01) and can ship as a copy or engine fix alone; CB-03 is a new control. Draft 04 must ship with or before draft 03. |
| CB-01 (receipt arithmetic) vs CB-09 (method not named) | Same button, different defects: wrong numbers vs missing information. |
| CB-07 (no refresh) vs CB-22 (held invoice) | Both show a "wait" state, but one is client polling and the other an accounting hold. |
| CB-05 (two controls) vs CB-03 | CB-05 is about charge order among methods; CB-03 about whether methods are charged at all. Draft 19 depends on draft 03. |
| CB-18 (team view) vs CB-19 (invoice actions) | One is where support looks, the other what support can do. Draft 17 depends on draft 05 for placement. |
| CB-20 (server error text) vs CB-14 (client copy) | Different code owners and fix shapes (typed errors vs strings). |

## Mapping to the earlier pass

| Earlier | Now | Note |
|---|---|---|
| F-02 | CB-02 | Priority lowered P1 → P2: no team on Auto Charge (E4) |
| F-04 | CB-11 | — |
| F-05 | CB-03 | — |
| F-06 | CB-05 | — |
| F-08 (Statement part) | CB-16 | Overview parts stay for D3 |
| F-10 | CB-10 | — |
| F-13 (Email invoice) | CB-15 | Auto-recharge part stays for D4 |
| F-15 (invoice parts) | CB-14, CB-16 | — |
| F-23 | CB-04 | Now measured: 4 teams exposed |
| F-25 | related to CB-22 | F-25 is about retries stopping; CB-22 is the customer and operator effect of a hold |
| error-message-audit | CB-20 | D1/D2 messages only; the audit keeps the full list |
| F-03 (false success toasts) | — | Pause/project toggles belong to D5, not covered here |

## Overlap with the existing repo backlog

`billing-specs/issues/` was searched for "pending validation", "collection mode",
"team billing", "accounting sync" and "receipt".

| Existing issue | Overlaps | Decision |
|---|---|---|
| **125** Record why adding a payment method or topping up failed (not built at `a95b491e`: no `Payment Setup Attempt` in the code) | CB-21 support and diagnosis side: failure capture, Stripe `setup_intent.*` subscription, support list, failure-rate alert, Team connection to attempts | **Draft 01 is rescoped** to what 125 leaves out: the customer sees the unfinished setup and retries, and the Payment Method reaches an end state. It depends on 125. 125's "connection from Team" also covers part of draft 05. |
| 93 Derived payment outcomes | Mentions Manual Checkout dunning | No overlap with D1/D2 drafts |
| 127 Partner pays | Uses collection mode | No overlap; draft 03 must keep the partner rule in mind |

No other open issue matches a draft. Check again before publishing.
