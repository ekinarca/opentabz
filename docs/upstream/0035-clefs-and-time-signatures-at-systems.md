# 0035 — Clefs and time signatures at the start of systems and sections

## Problem

Guitar Pro's stylesheet chooses whether the clef starts every system or only the first, and
whether the time signature is written again at the start of every system or of every section.
alphaTab writes the clef on every system and the time signature only where it changes.

## Change

- `src/NotationSettings.ts`: `clefOnEverySystem` (true), `timeSignatureOnEverySystem` and
  `timeSignatureAtSections` (false).
- `src/rendering/ScoreBarRenderer.ts`: the clef starts a system only on the first system of the
  rendering when `clefOnEverySystem` is off; it is still written where it changes.
- `src/rendering/LineBarRenderer.ts`: `repeatsTimeSignature` is true at the start of a system or a
  section as the settings ask; standard, tablature, slash and numbered staves write the time
  signature there too.

## Proof

`packages/core/test/notation-toggles.test.ts` (REND-231): over several systems of 3/4 with a
section in mid-system, one clef or one per system, and the time signature once, on every system,
or again at the section; `apps/web/e2e/notation-toggles.spec.ts`.

## Upstream

Not yet proposed: display settings.
