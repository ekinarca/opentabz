# 0061 — The model's beat and note cloners are exported

## Problem

OpenTabz's editor copies beats and bars (EDIT-020) and duplicates tracks (EDIT-030). A copy must
hold every property of a beat and its notes (durations, tuplets, techniques, bends and whammy
points, lyrics, automations…) and none of the links alphaTab works out between them. alphaTab
generates exactly that, `BeatCloner` and `NoteCloner` (from the model's `@cloneable` classes),
and uses them itself, but does not export them: a host would have to copy each property by hand
and follow every property alphaTab adds.

## Change

- `src/model/_barrel.ts`: `BeatCloner` and `NoteCloner` (`src/generated/model/`) are exported with
  the model, and declared in the typings.

Nothing else changes: the cloners are the generated ones, which give each copy its own id and
leave it in no voice (a beat) or beat (a note).

## Proof

`packages/core/test/edit.test.ts`: beats and bars copied and pasted, in the same score and
another, and tracks duplicated, keep what they hold; writing in a copy leaves the original as it
was; in every public fixture, runs of copies, pastes and duplicated tracks are undone and redone
exactly, and the score opened afresh links its notes as the edited one does.

## Upstream

Worth proposing: editors built on alphaTab's model need copies of beats and notes.
