# 0037 — Left-handed chord diagrams

## Problem

Left-handed players read chord diagrams mirrored: the highest string on the left, as they see
the neck of their own guitar. alphaTab always draws the lowest string on the left.

## Change

- `src/NotationSettings.ts`: `leftHandedDiagrams` (false by default).
- `src/rendering/glyphs/ChordDiagramGlyph.ts`: on request, the marks of open and muted strings,
  the dots and the barres are placed from the highest string on the left. The strings, frets,
  nut and first fret's number are drawn as before.

## Proof

`packages/core/test/left-handed.test.ts` (REND-314): every mark of the diagrams above the music
and above their beats has its mirror image across the diagram's centre, the barre too, and the
rest of the score is engraved as before; `apps/web/e2e/chords.spec.ts`.

## Upstream

Not yet proposed: a display setting.
