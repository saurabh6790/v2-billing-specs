# Diagrams for the billing write-up

Each `.mmd` here is the skeleton for one diagram in
[`../billing-improvements-explained.md`](../billing-improvements-explained.md). The
published artwork is an Excalidraw export sitting next to it as `<slug>.svg`.

Mermaid is the starting point, not the output. Excalidraw's import gets the boxes and
arrows right; the framing, the annotations and the spacing are done by hand afterwards.

## Making one

1. Open [excalidraw.com](https://excalidraw.com), switch to **dark mode**.
2. Insert → **Mermaid to Excalidraw**, paste the `.mmd`, insert.
3. Hand-finish: title and subtitle top-left, floating annotations on the edges that need
   them, nudge the spacing.
4. Select all → **Export image** → SVG, *with background*, and save as `<slug>.svg`.

Keep the `.mmd` in step with any structural edit, so the next person regenerating a
diagram starts from the shape that is actually in the post.

## The eleven

| File | Diagram |
|---|---|
| `overview.mmd` | The ten pieces of work, grouped |
| `unguarded-doors.mmd` | Billing primitives reachable without an authorization check |
| `double-charge.mmd` | How a crash mid-charge became a double charge |
| `durable-intent.mmd` | Claim first, commit, then charge |
| `fan-out-run.mmd` | The monthly run as a dispatcher over a worker pool |
| `dunning-clock.mmd` | The dunning clock restarts when we are the ones who failed |
| `batched-queries.mmd` | Building one bill, before and after |
| `transition-authority.mmd` | One guarded door for every billing status |
| `operator-alerts.mmd` | The sweeps now page a human |
| `rollup-versioning.mmd` | Correcting locked terms by versioning the row |
| `rerating-flow.mmd` | Preview, decide, then re-issue |

## Two that will need the most hand-work

`overview.mmd` is three subgraphs chained left to right. The import will stack them
plainly — the reference look wants them as labelled zones with room between.

`batched-queries.mmd` is a before/after pair in two subgraphs. Excalidraw will not know
they are meant to read as a comparison; set them side by side with the labels doing the
contrast.

## The red and green nodes

`unguarded-doors`, `double-charge` and `dunning-clock` carry `style` directives marking
the one node that is the problem (red) or the fix (green). The import honours inline
styles, but the tints were picked for a light background — on dark they will need
re-picking by eye.
