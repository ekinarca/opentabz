# 0034 — Level beams

## Problem

Guitar Pro's stylesheet can draw beams level, on standard staves and on drum staves apart.
alphaTab always slants them with the notes (by up to a staff space).

## Change

- `src/NotationSettings.ts`: `flatBeams` and `flatDrumBeams`, both false by default.
- `src/rendering/LineBarRenderer.ts`: `initializeBeamDrawingInfo` levels a beam at its end
  furthest from the notes when the renderer's `flatBeams` says so (then the stems are made long
  enough for every note, as before); `flatBeams` is false for tablature, slash and numbered
  staves.
- `src/rendering/ScoreBarRenderer.ts`: `flatBeams` is the setting for drum staves on percussion
  staves, the other one elsewhere.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-246): every beam of a rising and falling run
is level on request, and drum beams follow their own switch; `apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Not yet proposed: a display setting.
