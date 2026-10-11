# 0031 — The first system indented

## Problem

Engraved scores often indent their first system, and Guitar Pro's stylesheet sets how far.
alphaTab starts every system at the page's left padding.

## Change

- `src/DisplaySettings.ts`: `firstSystemIndent: number` (0 by default), in pixels at 100 % like
  the padding.
- `src/rendering/layout/VerticalLayoutBase.ts`: `_indentOf(systemIndex)` is the indent of the
  first system (in the layout's units) and 0 for the others. A system starts at the left padding
  plus its indent, and fills, and is fitted to, the width left: the first system is narrower and
  ends where the others do. Page and parchment layouts alike; the horizontal layout has no first
  system to indent.

## Proof

`packages/core/test/score-style.test.ts` (REND-228): 20 mm moves the first bar of the first
system 75.6 px in while it still ends where it did, and leaves the second system alone;
`apps/web/e2e/stylesheet.spec.ts`: set from the stylesheet, on phones too.

## Upstream

Not yet proposed: a display setting.
