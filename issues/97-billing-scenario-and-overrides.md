# 97 — Scenario as a first-class input: the Billing Scenario DocType and config overrides

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

Until now a projection is computed under whatever configuration happens to be live. This slice makes
the configuration an *input* — the thing you vary to ask "what would this change do?" — and gives it a
home so it can be named, saved, shared and re-run.

**Overrides.** Every billing knob already reads through a named accessor on Billing Settings rather
than off the document, which makes the seam a context variable those accessors consult. Nothing
downstream — dunning, invoicing, credits — has to know it is being projected. Overridable in this
slice: the dunning retry ladder, invoice due days, suspend and terminate windows, the forecast notify
ratio, welcome credit amounts and promotional validity. (Catalog rates are #98; they are not a simple
substitution.)

**The DocType.** `Billing Scenario` holds the inputs — subject (team or cohort filter), period range,
outcome mode, overrides — and its last result, following the shape `Rerating Run` already uses for
preview and result payloads. Note the name: *scenario*, never *run*. "Run" means the monthly billing
run, the job that moves money, and nothing read-only borrows the word.

**The write boundary.** The engine stays read-only and returns plain data; saving happens afterwards,
in an ordinary transaction, and may touch the projection DocTypes and nothing else. That restriction
is the only thing between "saves a scenario" and "saves an invoice", so it carries its own test.

## Acceptance criteria

- [ ] Billing Settings accessors consult an override context when one is active and are unchanged
      otherwise; production reads are unaffected.
- [ ] An overridden dunning ladder visibly moves the projected retry, overdue, suspend and terminate
      dates.
- [ ] `Billing Scenario` DocType stores subject, period, outcome mode, overrides and last result, and
      can be reloaded and re-projected to the same output given the same data.
- [ ] The engine call remains inside its read-only transaction and returns plain data; persistence is
      a separate, ordinary transaction.
- [ ] A test asserts that saving a projection writes only projection DocTypes.
- [ ] The Simulator page can compose, save and reload a scenario.
- [ ] Nothing introduced by this slice is named "run".

## Blocked by

- [#92](92-project-one-team-next-month.md)
