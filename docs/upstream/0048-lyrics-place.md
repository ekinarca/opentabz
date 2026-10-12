# 0048 — Where the lyrics go

## Problem

Guitar Pro's stylesheet puts the lyrics above a track's staves or below them. alphaTab has one
place for them, a band shared on top of the tablature: between a staff and its tablature, under
a staff alone, over a tablature alone.

## Change

- `src/NotationSettings.ts`: `lyricsPlace`: `between` (alphaTab's place, by default), `above` or
  `below`.
- `src/rendering/effects/LyricsEffectInfo.ts`: an info per place, each drawing only when its
  place is asked; `src/Environment.ts`: the `above` band shared on top of the slash staff (the
  first staff shown), the `below` band shared at the bottom of the tablature (the last).
- `src/rendering/glyphs/LyricsGlyph.ts`: a staff space above lyrics below the staves.

## Proof

`packages/core/test/lyrics-place.test.ts` (REND-239): syllables between the staff and its
tablature, above both, or below both (and below a tablature alone), clear of the last line;
none when hidden. `apps/web/e2e/stylesheet.spec.ts`.

## Upstream

Not yet proposed: a display setting.
