# 0053 — Sound-change labels

## Problem

Guitar Pro 7 and 8 change a track's sound with sound automations (a clean guitar turning
overdriven at the chorus) and write the new sound's label in the score where it changes; the
label is the sound's own text, which can differ from its name ("Dist."). alphaTab reads a sound
change as bank and program changes only: the label is lost, nothing is drawn, and a Guitar Pro
export writes each sound's name as its label and every change as shown.

## Change

- `src/importer/GpifParser.ts`: each sound keeps its `Label`; the program change read from a
  sound automation carries it as its `text`, and the automation's visibility.
- `src/exporter/GpifWriter.ts`: a sound change is written with its label and visibility.
- `src/NotationSettings.ts`, `src/RenderingResources.ts`: a notation element for the labels,
  `EffectSoundChange`, with the effects' font.
- `src/rendering/effects/SoundChangeEffectInfo.ts` (new), `src/Environment.ts`: the label over the
  staff, on the first beat at or after where the change fires; not for the sound a track starts
  with, nor for a change the file hides.

## Proof

`packages/core/test/sound-changes.test.ts` (REND-206): "Overdriven Guitar" over bar 3 of a Guitar
Pro 7 file and nothing over bar 1; a sound named "Steel Mart(1)" written by its label, "Steel
Mart"; a hidden change left out; label and visibility through a Guitar Pro export.
`packages/core/test/import-golden.test.ts`: the 99 fixtures with Guitar Pro 7+ sound automations,
and only they, import differently (their program changes now carry labels).
`apps/web/e2e/sound-changes.spec.ts` shows the label in four browsers.

## Upstream

Worth proposing: it keeps what Guitar Pro files say and writes it back.
