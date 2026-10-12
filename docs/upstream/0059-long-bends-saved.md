# 0059 — Long bend and whammy curves are saved, as the nearest Guitar Pro 7 curve

## Problem

Guitar Pro 3–5 files draw a bend or a whammy bar as a curve of up to a dozen points; Guitar Pro 7
and 8 keep an origin, a middle held from one offset to another, and a destination. alphaTab's
GPIF writer wrote only curves of four points or fewer, so saving a Guitar Pro 5 score as a .gp
file (EDIT-064) left out every longer bend and whammy bar.

## Change

- `src/exporter/GpifWriter.ts`: `fourBendPoints(points)` reduces a longer curve to four points: its
  first and last, and its point farthest from the origin, held from where the curve first reaches
  that value to where it last has it. `writeBend` and `writeWhammyNode` write every curve through
  it.

## Proof

`packages/core/test/save-gp.test.ts`: every public fixture saved as .gp and opened again has the
same music, bends and whammy bars reaching the same height; a Guitar Pro 5 bend of more than four
points is saved, at its height.

## Upstream

Worth proposing: Guitar Pro 7 converts Guitar Pro 5 files the same way.
