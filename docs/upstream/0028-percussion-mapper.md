# 0028 — The percussion mapper, exported

## Problem

`PercussionMapper` knows a standard drum kit's articulations, their names as Guitar Pro shows
them ("Snare (hit)", "Hi-Hat (open)") and the articulation of a percussion note, whether it is
one of its track's or a standard one. It is internal: an app that shows a drum kit cannot list
its sounds or name the one a note plays without copying alphaTab's tables.

## Change

- `model.PercussionMapper` is exported, declared with its public statics:
  `instrumentArticulations`, `instrumentArticulationNames`, `getArticulation(note)`,
  `getArticulationName(note)` and `getArticulationById(id)`.

## Proof

- `packages/core/test/track-drums.test.ts` (VIEW-006, VIEW-020): every sound of the kit,
  named; each note of a Guitar Pro 5 file playing every piece is given the articulation alphaTab
  plays.

## Upstream

Not yet proposed: widens the public API.
