# 0047 — Notes written apart from where they sound, string by string

## Problem

Guitar Pro's stylesheet can keep capos and tunings from changing the written notes: a guitar
part is then written as if in standard tuning without a capo, in its own key. alphaTab writes
every note as it sounds and can only shift a whole staff (`displayTranspositionPitch`); a drop
tuning moves one string only. Its key transposition is internal.

## Change

- `src/model/Staff.ts`: `displayStringOffsets`, the semitones each string's notes are written
  apart from where they sound (empty by default, never serialized), and the static
  `transposeKeySignature(key, semitones)` over the internal `ModelUtils.transposeKey`, whose
  table transposes down.
- `src/model/Note.ts`: `displayValueWithoutBend` adds the note's string's offset; playback and
  the tablature are untouched.

OpenTabz sets the offsets (standard tuning minus the string's, minus the capo) and the capo's
keys around each layout and paint, and puts them back (`render/written-pitch.ts`).

## Proof

`packages/core/test/written-pitch.test.ts` (REND-232): a capo-2 part in A written, frets and
all, as the same frets in G without a capo, the tablature unchanged; a Drop D part as the same
frets in standard tuning; a ukulele left alone. `apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Worth proposing with a setting of its own: written pitch for retuned and capoed guitars.
