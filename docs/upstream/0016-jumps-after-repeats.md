# 0016 — Jumps that follow Guitar Pro's rules: pickups, repeats, endings, Dal Segno Segno

## Problem

`MidiPlaybackController` gets single D.C. / D.S. jumps right, but not how they meet the rest of
the form:

- A Da Capo goes back to bar 1 even when it is a pickup bar; Guitar Pro lands on the bar after it.
- A jump inside a repeat fires on the first pass; Guitar Pro (and players) take it on the last.
- After a plain Dal Segno has jumped, a later Dal Segno Segno is never taken: the controller stays
  in its "after the jump" state, which ignores directions. And a D.S.S. placed before the D.S. it
  belongs after is taken too early.
- After any jump every alternate ending is played, one after the other: the controller plays
  every bar once it has jumped.

## Change

- `_handleDaCapo` lands on bar 2 when bar 1 is an anacrusis.
- `_beforeLastPass()`: while the innermost repeat on the stack will be played again (its
  iteration is below the closing bar's `repeatCount - 1`), jumps in normal state wait, and the
  repeat is handled as usual.
- `_takeJump(directions)` takes the first jump of a bar once (`_takenJumps`), in normal state and
  after a plain D.C. / D.S. (state 1), so a D.S.S. after a D.S. is taken. A D.S.S. waits until a
  D.S. has jumped when the score has one (`_hasSegnoJump`, `_segnoJumped`).
- `_findEndings()` groups bars into sets of alternate endings (a bar without endings belongs to
  the ending before it until a repeat starts or the endings start over) and keeps the last ending
  of each set. After a jump, a bar of a set plays only if it belongs to that last ending.

## Proof

`packages/core/test/playback-traversal.test.ts`: six new cases (endings after D.C. and D.S. al
Fine with a two-bar first ending, D.C. after a pickup, D.S. and D.C. inside two- and three-pass
repeats, D.S.S. after a D.S. and before one) check the bar order of the timeline and that the MIDI
sounds those bars; all fail before the patch, and the 27 earlier cases still pass.

## Upstream

Not yet proposed: these are behaviour fixes that match Guitar Pro's documented rules.
