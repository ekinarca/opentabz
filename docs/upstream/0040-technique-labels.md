# 0040 — Technique labels as asked

## Problem

Guitar Pro 8's stylesheet changes the words printed for let ring, palm mute, slide, hammer-on,
pull-off, slap, pop, pick scrape, rasgueado and the whammy bar. alphaTab writes them as fixed
strings.

## Change

- `src/NotationSettings.ts`: `techniqueLabels`, the word for each technique by key, and
  `techniqueLabel(key, usual)`, which gives the usual word for keys not given or left empty.
- `src/rendering/effects/LetRingEffectInfo.ts`, `PalmMuteEffectInfo.ts`,
  `PickSlideEffectInfo.ts`, `RasgueadoEffectInfo.ts`, `WhammyBarEffectInfo.ts`,
  `TapEffectInfo.ts` (slap and pop) and `src/rendering/glyphs/TieGlyphLabel.ts` (the slide's
  "sl.", H and P, with the notation settings passed in by both slur glyphs): the words as asked.

## Proof

`packages/core/test/technique-labels.test.ts` (REND-242): every usual word without a stylesheet;
every word replaced, on the staff and in the tablature, none of the usual left; the usual word
where one is left empty. `apps/web/e2e/stylesheet.spec.ts`.

## Upstream

Not yet proposed: a display setting.
