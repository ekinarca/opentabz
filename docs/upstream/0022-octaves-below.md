# 0022 — Octaves below the staff

## Problem

`OttaviaEffectInfo` handles octave lines above the staff (8va, 15ma) and below it (8vb, 15mb),
depending on its `aboveStaff` flag, but the standard staff's effect bands only register the one
above. 8vb and 15mb passages were played an octave or two lower and drawn as written, with no
sign or line.

## Change

`src/Environment.ts` (the standard staff's renderer factory): `new OttaviaEffectInfo(false)` is
registered as an owned band below the staff, next to the one above.

## Proof

`packages/core/test/render-notation.test.ts` (REND-146): in `guitarpro7/ottavia.gp`, "8vb" and
"15mb" start every run of beats with those octaves, below the noteheads; without the patch
neither is drawn anywhere.

## Upstream

Not yet proposed: a one-line registration.
