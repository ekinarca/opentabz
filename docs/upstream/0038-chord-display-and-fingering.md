# 0038 — What each chord shows, and its fingering

## Problem

Guitar Pro lets each chord show or hide its name, its diagram and its fingering. alphaTab wrote
a chord's name over its beat even when the chord hid it, drew its diagram above the beat even when
the chord hid that, and did not keep the fingering at all: Guitar Pro 4 and 5 files' fingering
and "show fingering" were skipped, and Guitar Pro 7+ files' fingering was only used to find
barres (missing the ring finger, which they name `Ring`, not `Rank`).

## Change

- `src/model/Chord.ts`: `fingers`, the finger holding each string (`Fingers`), in the order of
  `strings`; serialized when known; part of `uniqueId` when known.
- `src/importer/Gp3To5Importer.ts`: the fingering of each string and "show fingering" read from
  Guitar Pro 4 and 5 chords (they followed the barres, omissions and a blank byte).
- `src/importer/GpifParser.ts`: each `Position`'s finger kept for its string; `Ring` read as the
  ring finger.
- `src/rendering/glyphs/ChordDiagramGlyph.ts`: a row under the diagram with the finger on each
  string (T for the thumb), when the chord shows its fingering; mirrored with the diagram (0037).
- `src/rendering/effects/ChordsEffectInfo.ts`: over a beat, the chord's name only if it shows its
  name, its diagram only if it shows its diagram.

## Proof

`packages/core/test/chord-display.test.ts` (REND-208): the same fingering from the Guitar Pro 5,
6 and 7 chord fixtures; each finger under its string's dot, mirrored for left-handed players;
none when the chord hides it; a nameless chord's diagram and a diagramless chord's name.
`packages/core/test/import-golden.test.ts`: the ten fixtures whose scores changed differ only in
`fingers` and (Guitar Pro 4 and 5) `showFingering`. `apps/web/e2e/chords.spec.ts`.

## Upstream

Worth proposing: the fingering is lost on import today.
