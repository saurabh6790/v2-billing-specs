# Diagrams for the billing write-up

Each `.mmd` here is the source for one diagram in
[`../billing-improvements-explained.md`](../billing-improvements-explained.md). The
matching `.svg` is a rendered Excalidraw export — dark canvas, hand-drawn strokes,
Excalifont — generated from it.

The `.mmd` is the thing you edit. The `.svg` is output; never hand-edit it, because the
next render overwrites it.

## Re-rendering

```
cd tools
npm install
npx playwright install chromium   # once, if you don't already have it
npm run render
```

That bundles Excalidraw for the browser, drives headless Chromium over every `.mmd`, and
writes `<slug>.svg` next to it. Roughly a minute for all eleven.

Fonts are the reason this needs a real browser: the layout is measured against Excalifont,
and headless DOM shims mis-measure every label.

## Three rules the sources have to follow

These are constraints of `mermaid-to-excalidraw`, not of mermaid, so a diagram that looks
fine in a mermaid preview can still convert badly.

**No `subgraph`.** The converter cannot resolve them and silently falls back to embedding
a flat raster image of the plain mermaid render — you get a `.svg` that is one `<image>`
tag, with none of the hand-drawn look and no editable elements. Use separate nodes and let
the labels carry the grouping. Check for this with `grep -c "<image" *.svg` — every file
should report `0`.

**No `<br/>` in labels.** It renders as literal text. Use a mermaid markdown string —
backticks inside the quotes, with real newlines:

```
A["`first line
second line`"]
```

Continuation lines must start at column 0. Indent them and the leading spaces become part
of the label.

**Keep label lines to 26 characters.** Mermaid sizes the box using its own font metrics,
then Excalifont renders wider, so anything longer spills past the border.

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

## Hand-finishing

The export is deliberately plain — boxes, arrows, labels. The framing, titles and floating
annotations that make a diagram feel drawn rather than generated are not something the
converter emits.

To add them: open [excalidraw.com](https://excalidraw.com) in dark mode, **File → Open**
the `.svg`, edit, and export back over the same filename. Anything you add that way is lost
on the next `npm run render`, so either re-apply it or stop re-rendering that diagram.

Colours set with `style X fill:#fee` in the source survive: they are picked in light-mode
values and inverted at export, which is also why `entry.js` uses a *white*
`viewBackgroundColor` to end up with a dark canvas.
