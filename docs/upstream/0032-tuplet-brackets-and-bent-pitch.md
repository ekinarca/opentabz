# 0032 — Tuplets without brackets, bends without the pitch they reach

## Problem

Guitar Pro's stylesheet can leave tuplet brackets out (the number alone says what the notes
are) and can write a bend in standard notation as the note played only, without the small note
of the pitch it reaches. alphaTab always draws both.

## Change

- `src/NotationSettings.ts`: `showTupletBrackets` and `showBentPitch`, both true by default.
- `src/rendering/LineBarRenderer.ts` (`paintTupletHelper`): the bracket's two lines are drawn only
  when `showTupletBrackets` is set; the number is written either way.
- `src/rendering/glyphs/ScoreBeatContainerGlyph.ts`: the `ScoreBendGlyph` (the small notes of the
  pitch a bend reaches and its slur) is added only when `showBentPitch` is set.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-248): a triplet with a rest keeps its number
and loses its bracket; a bend loses its target note; `apps/web/e2e/notation-toggles.spec.ts`:
switched in the stylesheet.

## Upstream

Not yet proposed: two display settings.
