# 0029 — "let ring throughout"

## Problem

Guitar Pro can play a whole track let ring (its automatic let ring), and then prints "let ring
throughout" over the track's first bar instead of marking every note. alphaTab has neither the
track setting nor the marking, so a score played that way read as if it were played as written.

## Change

- `src/model/Track.ts`: `letRingThroughout: boolean` (false by default).
- `src/rendering/effects/LetRingThroughoutEffectInfo.ts`: a shared top effect, sized on its beat
  like the capo's, that writes "let ring throughout" on the first beat of the first voice of the
  first bar of a track's first staff when the track's `letRingThroughout` is set. It follows the
  let-ring element (`NotationElement.EffectLetRing`) for its font and for being shown at all.
- `src/Environment.ts`: the effect is registered next to `CapoEffectInfo`.

OpenTabz sets the flag, for the duration of a layout or paint, on the tracks whose playing style
in the mixer lets every note ring on (patch 0018), so the score says how it is played.

## Proof

`packages/core/test/render-techniques.test.ts` (REND-188): written once, from the first beat, on
standard notation, tablature or both, over the right track of two, never for a keyboard, and the
score is left as it was; `apps/web/e2e/style.spec.ts`: switched on and off from the mixer, and
in the PDF.

## Upstream

Not yet proposed: it would come with reading the setting from Guitar Pro 7+ files.
