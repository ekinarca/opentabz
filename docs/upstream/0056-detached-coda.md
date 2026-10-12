# 0056 — Detached coda

## Problem

Guitar Pro draws a coda apart from the music before it: the coda starts a system of its own,
below a gap the stylesheet sets in millimetres. alphaTab runs a coda on in whatever system has
room, and a direction sign over a system's first bar is centred on the bar's start, half out of
the system.

## Change

- `src/NotationSettings.ts`: `detachedCoda`, whether a coda starts a system of its own, and
  `codaGap`, the space above it in the layout's units.
- `src/rendering/layout/PageViewLayout.ts`: a system ends before a coda (or double coda) after
  the first bar shown, and the coda's system is moved down by the gap, both when the score is
  laid out and when only its width changes.
- `src/rendering/glyphs/DirectionsContainerGlyph.ts`: a segno or coda sign over a system's first
  bar starts at the bar instead of being centred on its start.

## Proof

`packages/core/test/detached-coda.test.ts` (REND-200): the coda of a march starts its own system
once detached and runs on attached; 20 mm more gap moves it 20 mm further down; the same after a
width-only relayout; its sign within the system, a segno inside a system still centred on its
barline. `apps/web/e2e/stylesheet.spec.ts` sets the gap and the switch in four browsers.

## Upstream

Worth proposing as layout options; the sign's place is a fix on its own.
