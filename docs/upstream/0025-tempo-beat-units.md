# 0025 — Tempo marks against any beat unit

## Problem

A tempo is written against a beat unit: a dotted quarter in 6/8, a half note in cut time.
alphaTab converts every tempo to quarter notes per minute when it reads a file and forgets the
unit, so:

- Guitar Pro 7+ files (which store the unit as a code from 1 to 5) were drawn as "♩ = 90" where
  Guitar Pro writes "♩. = 60", and saved back against a quarter.
- MusicXML metronome marks were converted the wrong way round: `per-minute × unit / 4`, so
  "eighth = 120" played at 240 quarters a minute, "half = 60" at 30, and a `long` gave a
  negative tempo. Dots (`beat-unit-dot`) were ignored: "dotted quarter = 60" played at 60.

## Change

- `Automation.referenceDuration` and `referenceDots`: the beat unit of a tempo (a quarter by
  default). `value` stays in quarter notes per minute for playback; `referenceQuarters` is the
  number of quarters in one unit, `referenceValue` the tempo as written, `gpReference` Guitar
  Pro's code for the unit. Cloned, and serialized when not a quarter.
- `buildTempoAutomation` (Guitar Pro 7+) keeps the unit of codes 1–5 (eighth, quarter, dotted
  quarter, half, dotted half); the quarter-note value is unchanged.
- `MusicXmlImporter._parseMetronome`: `value = per-minute × quarters in the unit`, dots
  included, and the unit is kept.
- `BarTempoGlyph` draws the unit's metronome note (whole, half, quarter, eighth, sixteenth) with
  its augmentation dots, and the written value. `MusicFontSymbol` gains `MetNoteWhole`,
  `MetNoteHalfUp` and `MetNote16thUp`, with their Bravura bounding boxes (computed from the
  font's outlines; the same computation reproduces the existing entries exactly).
- `GpifWriter` writes the written value with the unit's code when Guitar Pro has one.

## Proof

`packages/core/test/render-notation.test.ts` (REND-211): MusicXML eighth = 120, quarter = 96,
dotted quarter = 60, half = 60 and dotted half = 40 play at 60, 96, 90, 120 and 120 quarters a
minute and are drawn with their own note, dots and value; a dotted-quarter tempo saved as Guitar
Pro 7 and opened again is still "♩. = 60". Among the fixtures only the two MusicXML test-suite
files with such marks import differently (`import-golden.test.ts`).

## Upstream

Not yet proposed: the MusicXML conversion is a plain bug fix; keeping the unit adds model fields.
