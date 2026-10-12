# 0050 — Fingering as asked

## Problem

Guitar Pro's stylesheet labels the left hand's thumb T or P and the right hand's fingers p i m a
c, p i m a x, p i m a e or t i m a o, puts fingering before the notes or above or below the
staff and above or below the tablature, and sizes it. alphaTab writes t 1 2 3 4 and p i m a c
before the notes only (or one note's finger above the tablature), at one size; its SMuFL symbols
lack the upper-case T and the x, e and o.

## Change

- `src/model/MusicFontSymbol.ts`: `FingeringTUpper` (U+ED16), `FingeringXLower`, `FingeringELower`
  and `FingeringOLower` (U+ED1D to U+ED1F); their boxes in the embedded Bravura metadata,
  measured from Bravura's outlines (t and p measured the same way match alphaTab's own).
- `src/NotationSettings.ts`: `leftHandFingerLabels`, `rightHandFingerLabels`,
  `fingeringPosition`, `tabFingeringPosition` and `fingeringScale` (alphaTab's drawing by
  default).
- `src/rendering/glyphs/FingeringGroupGlyph.ts`: the labels as asked; before the notes only when
  asked there, at the size asked.
- `src/rendering/effects/FingeringEffectInfo.ts`: `FingeringPlaceEffectInfo` and
  `FingeringStackGlyph`, a row of fingers per note stacked as the notes are (by pitch on the
  staff, by line in the tablature), in bands above and below the staff and the tablature
  (`src/Environment.ts`).

## Proof

`packages/core/test/fingering-display.test.ts` (REND-252): each label set; the chord's fingering
stacked above the staff, the ring finger's on top and the thumb's at the bottom, and below it;
above the staff and below the tablature at once; one and a half times the size. The existing
REND-141 and REND-142 test keeps alphaTab's labels by default. `apps/web/e2e/stylesheet.spec.ts`.

## Upstream

Worth proposing: the SMuFL symbols and boxes at least.
