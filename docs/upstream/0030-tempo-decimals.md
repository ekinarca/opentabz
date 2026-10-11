# 0030 — Tempo marks with their decimals, or rounded

## Problem

Guitar Pro 8 keeps tempos with decimals (92.5 beats per minute) and its stylesheet chooses
whether tempo marks show them. alphaTab always prints the tempo as stored, so a score could not
be printed with whole tempos.

## Change

- `src/NotationSettings.ts`: `showTempoDecimals: boolean` (true by default, as before).
- `src/rendering/glyphs/BarTempoGlyph.ts`: the tempo after the beat unit's note is the tempo as
  stored when the setting is on, and rounded to the nearest whole number when it is off. Only
  what is printed changes: playback keeps the tempo as stored.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-240): 92.5 and 120.25 are written as such,
or as 93 and 120, while the score keeps 92.5; `apps/web/e2e/notation-toggles.spec.ts`: switched
in the stylesheet.

## Upstream

Not yet proposed: a small display setting.
