# 0046 — Slash notation as asked

## Problem

Guitar Pro's stylesheet draws or hides the line behind rhythm slashes and the barlines of slash
staves, and can write a single note's fret and string under its slash. alphaTab always draws the
line and the barlines, and writes nothing under a slash.

## Change

- `src/NotationSettings.ts`: `slashStaffLines`, `slashBarLines` (true by default) and
  `slashSingleNoteFrets` (false).
- `src/rendering/SlashBarRenderer.ts`: no line when asked; room under the line for the frets.
- `src/rendering/glyphs/BarLineGlyph.ts`: a slash staff's plain barlines left out when asked;
  repeats, double and closing barlines stay.
- `src/rendering/glyphs/SlashBeatGlyph.ts`: a single (untied) note's fret, and its string
  circled, under its slash, for stringed instruments.

## Proof

`packages/core/test/slash-notation.test.ts` (REND-229): the line or none; the plain barlines or
only the closing ones; the G string's 5 and the B string's 7 with their strings circled, the
chords with nothing. `apps/web/e2e/notation-toggles.spec.ts` with
`fixtures/alphatex/views/slash.atex`.

## Upstream

Not yet proposed: display settings.
