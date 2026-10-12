# 0033 — Tied frets, dashed rests, arpeggio arrowheads and trill notes on request

## Problem

Guitar Pro's stylesheet chooses several details alphaTab always draws one way: tablature can
write the fret of every tied note (alphaTab writes it only where a bar begins), can write quarter
rests as a dash, arpeggios can go without arrowheads, and a trill's second note can be left out
of the tablature.

## Change

`src/NotationSettings.ts`, each false or true as alphaTab draws by default:

- `showTiedTabNotes` (false): `NoteNumberGlyph` writes a tied note's fret, in brackets, wherever
  it falls.
- `dashQuarterRests` (false): `TabRestGlyph` draws a quarter rest as a short dash on the
  tablature's middle line.
- `showArpeggioArrows` (true): `ScoreBrushGlyph` and `TabBrushGlyph` leave the arrowheads of
  arpeggios out when it is false; strums keep theirs.
- `showTrillNote` (true): `NoteNumberGlyph` leaves a trill's second note out when it is false.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-249, REND-250) and
`apps/web/e2e/notation-toggles.spec.ts`: each switched in the stylesheet and seen in the score.

## Upstream

Not yet proposed: four display settings.
