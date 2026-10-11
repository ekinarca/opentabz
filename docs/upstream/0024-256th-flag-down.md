# 0024 — 256th notes with their stems down

## Problem

`FlagGlyph.getSymbol` returns `Flag128thDown` for a 256th note whose stem points down, so it was
drawn with one flag too few.

## Change

`src/rendering/glyphs/FlagGlyph.ts`: a 256th with its stem down gets `Flag256thDown`.

## Proof

`packages/core/test/render-details.test.ts` (REND-189): a lone 256th below the middle line has
`Flag256thUp`, one above it `Flag256thDown` (it was `Flag128thDown`).

## Upstream

Not yet proposed: a one-line fix.
