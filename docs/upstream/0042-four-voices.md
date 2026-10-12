# 0042 — Stems and rests of four voices

## Problem

Guitar Pro, like engraving practice, points the stems of voices 1 and 3 up and of voices 2 and 4
down, and moves a rest out of the way on its own voice's side. alphaTab points every voice but
the first down, and (since 0023) moves every colliding rest of a voice but the first below the
others, voice 3's too.

## Change

- `src/rendering/ScoreBarRenderer.ts`: in `_calculateBeamDirection`, voices 1 and 3 (indexes 0 and 2) up, voices 2 and 4 down.
- `src/rendering/utils/BarCollisionHelper.ts`: a colliding rest of voice 3 moves above the
  reserved areas; those of voices 2 and 4 below them, as before.

## Proof

`packages/core/test/four-voices.test.ts` (REND-007): four voices in a bar, each notehead's stem
on its side, voice 3's rest above every note and the rests of voices 2 and 4 below.

## Upstream

Worth proposing: a self-contained engraving fix.
