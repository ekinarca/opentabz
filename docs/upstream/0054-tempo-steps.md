# 0054 — Tempo changes of Guitar Pro 3–5 and Capella files

## Problem

alphaTab reads every tempo change of a Guitar Pro 3–5 mix table, and every Capella tempo, as a
linear automation. Linear means a ramp: OpenTabz plays a linear tempo automation gradually up to
the next one (patch 0015, as Guitar Pro 7+ files mean it), so a Guitar Pro 5 song going from 120
to 140 at bar 20 and to 100 at bar 40 slowed down over twenty bars instead of holding 140. A
Guitar Pro 5.1 file can also hide a tempo change; alphaTab skipped that flag and drew it.

## Change

- `src/importer/Gp3To5Importer.ts`: a mix table's tempo change holds from where it is written
  on, and is not drawn when the file hides it.
- `src/importer/CapellaParser.ts`: a system's tempo holds from where it is written on.

A mix table can also spread a change over a number of beats; such transitions still change the
tempo at once, until a file shows how Guitar Pro plays them.

## Proof

`packages/core/test/tempo-steps.test.ts`: the tempo changes of the Guitar Pro 3, 4 and 5
fixtures are steps, and a later change after one is played at once, without a ramp; a tempo
change marked hidden (the byte after its transition) is not drawn; a second Capella tempo holds
the first one until it.

## Upstream

Worth proposing: a correctness fix for the importers.
