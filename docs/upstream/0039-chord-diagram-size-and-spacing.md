# 0039 — Chord diagrams' size and spacing

## Problem

Guitar Pro's stylesheet sizes and spaces the chord diagrams above the music and those above
their beats, each on its own, and can keep them at their size while the whole score is scaled.
alphaTab draws every diagram at one size, sets the diagrams above the music a fixed space apart,
and lets diagrams above beats close together overlap.

## Change

- `src/NotationSettings.ts`: `chordDiagramScale` and `chordDiagramSpacing` for the diagrams above
  the music, `inScoreChordDiagramScale` and `inScoreChordDiagramSpacing` for those above their
  beats (1, 1, 1 and 0 by default: alphaTab's own drawing).
- `src/rendering/glyphs/ChordDiagramGlyph.ts`: the grid, its marks, dots and numbers at the
  diagram's size.
- `src/rendering/glyphs/RowContainerGlyph.ts`, `RowGlyphContainer.ts`,
  `ChordDiagramContainerGlyph.ts`: the space between the diagrams above the music (across and
  between rows) as asked; other rows as before.
- `src/rendering/glyphs/BeatContainerGlyph.ts`: a beat with a diagram above it takes the
  diagram's width times the spacing asked along the staff, so diagrams keep apart.

## Proof

`packages/core/test/chord-diagram-size.test.ts` (REND-227, REND-223): strings, dots and numbers
at the size asked, above the music and above the beats; the space between diagrams growing
evenly from touching; diagrams above beats close together overlapping without room and kept
apart with it; diagrams kept at their size, numbers once, while the music is scaled.
`apps/web/e2e/stylesheet.spec.ts`.

## Upstream

Not yet proposed: display settings.
