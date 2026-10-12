# 0049 — The tablature the other way up

## Problem

Players who learnt from games and apps such as Rocksmith read tablature with the lowest string
on top, as they see the neck when they look down at it. alphaTab always puts the highest string
on top, and several parts of the tablature assume it: which note a stem, a bend or a strum starts
from, and which side of the staff a tie or a hammer-on's slur goes.

## Change

- `src/NotationSettings.ts`: `invertedTab` (false by default).
- `src/rendering/TabBarRenderer.ts`: each string's line counted from the lowest on request, the
  spaces left in the lines for fret numbers too; stems from the top note and to the bottom one,
  whichever strings they are on.
- `src/rendering/glyphs/TabBeatGlyph.ts`, `TabBendGlyph.ts`, `TabBrushGlyph.ts`: the top and
  bottom notes swapped when inverted; strum and arpeggio arrows turned with the strings.
- `src/rendering/glyphs/TabTieGlyph.ts`, `TabSlurGlyph.ts`: ties and slurs over the upper
  strings, whichever those are; a slur anchored on the note on its side.
- The strings' names before the tablature (0041) in the order of its lines.

## Proof

`packages/core/test/inverted-tab.test.ts` (REND-315): the names E A D G B E top down and each
string's fret lower down the page from the lowest; the strum's arrow at the bottom and the low
string's hammer-on with its H over the tablature. `apps/web/e2e/settings.spec.ts`.

## Upstream

Worth proposing: a reading preference several tab apps offer.
