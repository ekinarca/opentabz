# 0045 — Beams over rests and circled long notes in the tablature

## Problem

Guitar Pro's stylesheet chooses whether the tablature's beams go on over rests within their group
and can circle half and whole notes in a tablature that shows the rhythm. alphaTab always beams
over such rests and never circles a note.

## Change

- `src/NotationSettings.ts`: `tabBeamsOverRests` (true by default) and `tabCircleLongNotes`
  (false).
- `src/rendering/utils/BeamingHelper.ts`: in the tablature, a rest ends the beam when asked.
- `src/rendering/glyphs/NoteNumberGlyph.ts`: a half or whole note's fret circled when asked and
  the tablature shows its voice's rhythm (0044); not a tied note's.

## Proof

`packages/core/test/tab-beams-circles.test.ts` (REND-245): sixteenths beamed over a rest, or the
first left with a flag and the two after the rest beamed; the half and whole notes circled on
their lines, and no circles in a tablature under a staff. `apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Not yet proposed: display settings.
