# 0041 — The tuning legend as asked

## Problem

Guitar Pro's stylesheet chooses what the tuning legend says (the name only, the name and the
strings, or only the strings tuned other than standard), lays its strings out in two columns or
on one line, frames it, or writes the strings' names before each track's tablature instead.
alphaTab always writes the tuning's name, adds every string in two columns when the tuning is
not standard, and writes nothing in the tablature.

## Change

- `src/NotationSettings.ts`: `tuningDetail` (`auto`, `name`, `all`, `changed`), `tuningLayout`
  (`columns`, `line`), `tuningFrame` and `tuningInTab`; alphaTab's own drawing by default.
- `src/rendering/glyphs/TuningGlyph.ts`: the strings listed as the detail asks (those tuned
  other than `Tuning.getDefaultTuningFor` their count for `changed`, without the name), in
  columns or on a line, inside a frame on request.
- `src/rendering/layout/ScoreLayout.ts` (the legend above the music): only the legends with something
  to say, and none when the tuning is written in the tablature.
- `src/rendering/TabBarRenderer.ts`: the strings' names at the start of their lines, before the
  TAB of the first system (`TuningLettersGlyph`), on request.

## Proof

`packages/core/test/tuning-legend.test.ts` (REND-225): each detail on Drop D and standard
tunings, two columns and one line, the frame around every mark of the legend, and the strings'
names before the first system's TAB only. `apps/web/e2e/stylesheet.spec.ts`.

## Upstream

Not yet proposed: display settings.
