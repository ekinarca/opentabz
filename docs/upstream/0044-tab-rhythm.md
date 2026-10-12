# 0044 — The rhythm in the tablature, per voice and outside the staff

## Problem

Guitar Pro's stylesheet puts each voice's rhythm in the tablature below it, above it or nowhere,
and can draw the stems outside the staff rather than from the fret numbers through it. alphaTab
draws every voice's rhythm below, its stems from the fret numbers down, and its stems with holes
only when they point down.

## Change

- `src/NotationSettings.ts`: `tabStemsInside` (true by default) and `tabRhythmVoices` (voices 1
  to 4 `below`, `above` or `none`; all `below` by default).
- `src/rendering/TabBarRenderer.ts`: `rhythmPlace(voice)`; beams up for the voices above;
  no beams, flags, stems or tuplets for the voices without; stems outside the staff starting
  under its last line or ending over its first; stems drawn around the fret numbers they pass
  whichever way they point; room for tuplets on their voice's side.
- `src/rendering/glyphs/TabBeatGlyph.ts`: augmentation dots with their voice's rhythm, above or
  below, none without.

## Proof

`packages/core/test/tab-rhythm.test.ts` (REND-244): stems in the tablature without a staff,
always and never; from the frets or all under the staff; voice 2's three stems over the staff
(from the frets or outside) with voice 1's six under it, and gone without its rhythm.
`apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Not yet proposed: display settings.
