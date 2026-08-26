# 103 — Cassette record/replay: golden-master regression on real shapes

**Type:** AFK · **Milestone:** SIM · **ADR:** [0020](../docs/adr/0020-the-simulator-is-the-billing-engine-run-forward.md)

## What to build

The regression harness that answers *"did that refactor change anyone's bill?"* against the actual
shape of the book rather than against the fixtures we happened to write.

The obvious version does not work. Snapshot the book, deploy, re-run, diff — and the two runs happen
at different times, with the data moved in between. Teams resize, top up, get invoiced and pay, and
every one of those legitimately changes the projection. The diff drowns in deltas nobody can attribute
to the deploy, and an unattributable diff is ignored within a fortnight.

So stop diffing across *time* and diff across *code with the inputs held fixed*. A thin recording layer
beneath the read seam captures every `(query → result)` the engine consumed; the cassette is stored
with the snapshot; after the deploy the new code is replayed **against the cassette** rather than the
live database. Inputs are bit-identical by construction, so every surviving delta is attributable to
code.

A read the new code makes that is *absent* from the cassette is itself worth reporting — the rating
path now consults something it did not before, which is a change worth knowing about even when the
number is unmoved.

The seam sits at the database layer, underneath the state/reference split, so nothing needs threading
through the decision functions. The engine already accepts the recorder and replay parameters from
#92; this slice fills them in.

Scope the cohort deliberately — a few hundred teams chosen to cover the interesting shapes (each
currency, each collection mode, metered and fixed, commitment and not, trial and paid) beats the whole
book, and keeps the cassettes small enough to store and diff quickly.

## Acceptance criteria

- [ ] A recorder captures every read the engine performs during a projection, keyed so replay is
      deterministic.
- [ ] Replaying a cassette reproduces the recorded projection exactly, with the live database
      unreachable during replay.
- [ ] A read absent from the cassette is reported as a distinct finding, not an error.
- [ ] Cassette plus result snapshot is stored per team, for a configurable regression cohort.
- [ ] The diff reports per-team deltas with the line and the field that moved, ordered by magnitude.
- [ ] An intentional change to rating produces a clean, attributable diff on a test cassette; an
      unrelated refactor produces none.
- [ ] Recording adds no measurable cost to a projection run with the recorder off.

## Blocked by

- [#92](92-project-one-team-next-month.md)
