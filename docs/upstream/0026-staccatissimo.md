# 0026 — Staccatissimo

## Problem

Guitar Pro 7+ stores a note's articulations as flags (`<Accent>`: 1 staccato, 2 staccatissimo,
4 heavy accent, 8 accent, 16 tenuto). alphaTab read every flag but staccatissimo, and MusicXML's
`<staccatissimo/>` was ignored too: the wedge was not drawn and the note was played full length.

## Change

- `Note.isStaccatissimo` (cloned; serialized when set).
- Read from Guitar Pro 7+ (accent flag 2) and MusicXML (`<staccatissimo/>`), written to Guitar
  Pro 7+, and in alphaTex as the note property `sti`.
- `StaccatissimoGlyph`: `articStaccatissimoAbove` over a note whose stem points down,
  `articStaccatissimoBelow` under one whose stem points up, like accents. Both symbols join
  `MusicFontSymbol`, with Bravura bounding boxes computed from the font's outlines.
- `MidiFileGenerator`: a staccatissimo note sounds a quarter of its length (staccato: half).

## Proof

- `packages/core/test/render-techniques.test.ts` (REND-132): wedges above and below by stem
  direction, kept through a Guitar Pro 7 save and open, read from MusicXML.
- `packages/core/test/playback-articulations.test.ts` (PLAY-042): staccatissimo quarters sound
  for a sixteenth's length, staccato quarters for an eighth's.
- `import-golden.test.ts`: of all fixtures only MusicXML test-suite `32a-Notations.xml`, which
  has a staccatissimo, imports differently.

## Upstream

Not yet proposed: adds a model field.
