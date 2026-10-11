# 0021 — "let ring" as Guitar Pro writes it

## Problem

`LetRingEffectInfo` labels let-ring ranges `LetRing`, the enum-style name. Guitar Pro, like
printed tablature, writes "let ring".

## Change

`src/rendering/effects/LetRingEffectInfo.ts`: the `LineRangedGlyph` label is `let ring`.

## Proof

`packages/core/test/render-techniques.test.ts` (REND-127, REND-128): in three Guitar Pro files
and in alphaTex, "let ring" starts every run of let-ring beats and `LetRing` is drawn nowhere.

## Upstream

Not yet proposed: a one-line label change.
