# 0023 — Rests of lower voices move below the first voice

## Problem

In a bar with several voices, `BarCollisionHelper.applyRestCollisionOffset` moves a rest of a
second voice that collides with what the first voice holds at that moment. Two things went wrong:

- The rest of voice 2, whose stems point down, was moved above the first voice: over the staff,
  above the first voice's notes. Guitar Pro, like engraving practice, puts it below.
- A collision was only found when the rest's top or bottom fell inside a reserved area; a rest
  taller than the area it covers (a quarter rest against a half rest) was not moved, and the two
  rests were drawn over each other.

## Change

`src/rendering/utils/BarCollisionHelper.ts`: any overlap between the rest and a reserved area is
a collision, and a colliding rest of a lower voice moves below the reserved area.

## Proof

`packages/core/test/render-notation.test.ts` (REND-151): a second voice's quarter rest against the
first voice's half rest, and against its B4, sits at least two staff spaces below them; before
the patch the rests shared one position and the rest under the note was drawn over the staff.

## Upstream

Not yet proposed: a self-contained engraving fix.
