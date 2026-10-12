# 0043 — Artificial harmonics in the tablature, as asked

## Problem

Guitar Pro's stylesheet chooses whether the tablature says where an artificial harmonic is
touched, and can write one touched an octave up as its fret and a dot. alphaTab always writes the
touched fret in brackets after the fret (`5 <17>`).

## Change

- `src/NotationSettings.ts`: `showHarmonicTouch` (true by default) and `octaveHarmonicDot` (false).
- `src/rendering/glyphs/NoteNumberGlyph.ts`: an artificial harmonic without its touch when asked,
  and one touched twelve frets up written `5.` when asked; natural and other harmonics as before.

## Proof

`packages/core/test/harmonic-tab.test.ts` (REND-247): the touches as usual, left out with the
natural harmonic's brackets kept, and the octave as a dot with the fifth's touch kept.
`apps/web/e2e/notation-toggles.spec.ts` with `fixtures/alphatex/views/harmonics.atex`.

## Upstream

Not yet proposed: display settings.
