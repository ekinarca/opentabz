# 0036 — Technique lines over rests

## Problem

Guitar Pro's stylesheet can carry the lines of techniques such as palm mute over the rests
between two beats that have them, as one line. alphaTab ends the line at the rest and starts a new
one, label and all, after it.

## Change

- `src/NotationSettings.ts`: `linesOverRests` (false by default).
- `src/rendering/EffectBand.ts`: `shouldCreateGlyph` also takes a rest whose nearest beats either
  side draw the line of palm mute, let ring, a harmonic or a pick slide (`_continuesOverRest`), and
  the grouping of glyphs looks at the previous beat the same way, so the glyphs either side of the
  rest are one line.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-243): two palm-muted runs either side of a
rest are one "P.M." line on request, reaching the run after the rest and not the rests after it;
`apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Not yet proposed: a display setting.
