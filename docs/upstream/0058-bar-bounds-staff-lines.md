# 0058 — A bar's bounds name their staff and where its lines are

## Problem

The editor's caret (EDIT-004) marks the beat and the string the next fret is written on, so it
must sit on a line of the tablature. alphaTab's bounds lookup gives each bar's bounds once per
staff it is drawn on (standard notation, tablature, slash, numbered), but says neither which staff
that is nor where the staff's lines are: the lines' places come from the staff's own layout
(padding, line spacing, the tablature the other way up), which only its bar renderer knows.

## Change

- `src/rendering/utils/BarBounds.ts`: `staffId` (the staff's id: `score`, `tab`, `slash`,
  `numbered`…) and `lineYs` (the y of each line drawn, from the top one, or null for a staff
  without lines), scaled in `finish` with the other bounds.
- `src/rendering/BarRendererBase.ts`: `boundsLineYs(cy)`, null by default; `buildBoundingsLookup`
  fills both fields.
- `src/rendering/LineBarRenderer.ts`: `boundsLineYs(cy)` gives the middle of each line drawn, as
  `paintStaffLines` draws them.

## Proof

`packages/core/test/engine-host.test.ts`: the bounds of a guitar track give a tablature staff
with six lines, evenly spaced, in each system, and a standard-notation staff with five above it;
the editor's caret is drawn on them (`apps/web/e2e/editing.spec.ts`).

## Upstream

Worth proposing: other hosts drawing on top of the music (cursors, annotations) need the same.
