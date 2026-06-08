# Commitment as a team-level spend floor, not a prepaid plan or resource lock

Frappe Cloud runs on recurring revenue and needs a way for customers to trade a term for a better
rate, but it has no lock-in today and `invoicing.md` bans prepaid-for-fixed billing (it would
require the banned pro-rata credit notes). We model a **Commitment** as a team-level monthly
**fixed-bundle spend floor** held for a fixed term, with the discount applied to each
monthly-in-arrears invoice. It is **resource-agnostic** — upgrades, downgrades, and swaps are free
as long as committed bundle spend stays at or above the floor — so it stays fully decoupled from
the per-`resource_id` **price-lock**, which exists only for rate grandfathering. Metered usage and
one-off add-ons are variable: they bill at list, never count toward the floor, and never receive
the discount. Dropping below the floor before term-end triggers a **clawback** that repays only the
discount the team enjoyed on the months already consumed.

## Considered Options

- **Upfront prepaid annual** — rejected: needs the banned pro-rata proration and charges at
  sign-up, which `invoicing.md` (pure postpaid) forbids.
- **Per-resource term commitment** (bind the commitment to a `resource_id`) — rejected: an upgrade
  closes the old lock and would fire a clawback, penalizing customers for spending *more*, which
  fights the recurring-revenue goal.
- **Remaining-term fee** on early exit — rejected: bills for service never rendered, is
  dispute-prone, and needs a separate fee schedule.

## Consequences

- Requires a **team-level fixed-bundle spend rollup** per month to test the floor, apply the
  discount, and compute clawback on breach.
- `billing_cycle = annual` on the Plan is just the first concrete commitment term; the field is a
  shorthand, not a separate billing path.
