# 0057 — A chord's tablature slurs over its outer notes, or each note's

## Problem

Guitar Pro's stylesheet chooses whether a chord hammered on or pulled off at once is slurred in
the tablature over its outer notes only ("HoPo slur on outer notes") or note by note. alphaTab
always merges the slurs of a chord that go the same way into one, over its outermost note.

## Change

- `src/NotationSettings.ts`: `tabSlursOnOuterNotes`, true by default (alphaTab's drawing).
- `src/rendering/TabBeatContainerGlyph.ts`: when it is false, each note's hammer-on, pull-off or
  legato slide keeps a slur of its own instead of joining its chord's.

## Proof

`packages/core/test/hopo-display.test.ts` (REND-251): three strings hammered on at once are one
slur in the tablature, or three when asked; `apps/web/e2e/notation-toggles.spec.ts` switches it
in four browsers.

## Upstream

Worth proposing as a notation setting.
