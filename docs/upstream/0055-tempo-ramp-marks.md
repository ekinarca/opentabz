# 0055 — Tempo ramps marked accel. or rit.

## Problem

A linear tempo automation in a Guitar Pro 7+ file is a ramp: the tempo changes gradually up to
the next tempo automation, as OpenTabz plays it (patch 0015). Guitar Pro 8 writes such a ramp
with accel. or rit. by its tempo; alphaTab draws only the tempo it starts from, so a reader cannot
tell a ramp from a held tempo.

## Change

- `src/rendering/glyphs/BarTempoGlyph.ts`: after a ramp's tempo, accel. when the next tempo is
  faster, rit. when it is slower, in the effects' font.

## Proof

`packages/core/test/tempo-ramps.test.ts` (REND-156): a score speeding up from bar 2 and slowing
down from bar 5 is marked accel. in bar 2 and rit. in bar 5, after their tempos, and not at all
once its tempos hold; `apps/web/e2e/tempo-ramps.spec.ts` opens it as a Guitar Pro file in four
browsers.

## Upstream

Worth proposing with the ramps' playback (patch 0015).
