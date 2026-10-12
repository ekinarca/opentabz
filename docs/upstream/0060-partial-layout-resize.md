# 0060 — A resize after a partial layout flows each bar once

## Problem

After an edit, OpenTabz lays the score out again only from the system edited on
(`renderScore(score, tracks, { firstChangedMasterBar })`, alphaTab's partial update). The page
and parchment layouts' `doUpdateForBars` takes the systems from that one on away and lays their
bars out anew, but keeps the bar renderers it had made for them in `_allMasterBarRenderers`: the
new renderers are added after them. A resize (`resizeRender`, when only the width changes) flows
that whole list into systems, so the bars laid out again appear twice, the second time with the
renderers and spacing they had before the edit.

When the edit moved where later bars start (a new time signature), the old renderers' spacing is
keyed by the old start times. Laid out again, their beats find springs that were never stretched:
a beat's x is `Infinity`, and painting a dashed effect line (`P.M. - - -`) up to it never ends.
In the app, opening a dialog on a phone after setting a bar's time signature hung the engine
until its watchdog restarted it.

## Change

- `src/rendering/layout/VerticalLayoutBase.ts`, `doUpdateForBars`: once the first bar laid out
  again is known, `_allMasterBarRenderers` keeps only the renderers of the bars before it, and
  `_barsFromPreviousSystem` is emptied, as `doLayoutAndRender` starts them.

## Proof

`packages/core/test/engine-host.test.ts`: after a bar's time signature is set and the score laid
out again from there, views 383, 700 and 412 px wide each lay out every bar once and paint every
system. Without the change the narrower view lays out bars twice and painting fails.
`apps/web/e2e/editing.spec.ts` sets a time signature with the bar dialog and opens it again on a
phone.

## Upstream

Worth proposing: any host that resizes after a partial update meets it.
