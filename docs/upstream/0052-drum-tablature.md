# 0052 — Drum tablature

## Problem

Guitar Pro can show a drum kit as a drum tablature: a line for each sound, each hit written as
its MIDI number. OpenTabz gives a drum staff such lines for the render when its tablature is
asked for (REND-191): strings tuned to 0, one per sound the kit plays, and each hit a "fret"
equal to the MIDI number it plays. alphaTab never draws a tablature for a drum staff, and a drum
note given a string stops being one: its standard notation loses its notehead and staff line.

## Change

- `src/model/Note.ts`: `isPercussion` stays true for a note on a drum staff that has a string.
- `src/rendering/TabBarRendererFactory.ts`: a drum staff with strings and its tablature shown
  gets a tablature.
- `src/rendering/TabBarRenderer.ts`: no tuning letters before a drum tablature's lines.

Drum staves keep no strings after a file is read: nothing changes unless a render gives them some.

## Proof

`packages/core/test/virtual-tab.test.ts` (REND-191): a kit's closed hi-hat, snare and kick on
lines of their own, written 42, 38 and 35, with its standard notation as it was;
`apps/web/e2e/track-staves.spec.ts` shows the demo's drums as tablature in four browsers.

## Upstream

Worth proposing with the rest of drum tablature, as an option of the tablature for drums.
