# 0051 — Tablature skips notes without a string

## Problem

OpenTabz shows a keyboard, voice or orchestral part as tablature by giving its notes strings and
frets for the render (REND-190); a note no string reaches keeps none. alphaTab's tablature
draws every visible note, a stringless one on a line below the staff with fret −1, and fails on
a beat none of whose notes has a string.

## Change

- `src/rendering/glyphs/TabBeatGlyph.ts`: only notes with a string get a fret number.
- `src/rendering/TabBeatContainerGlyph.ts`: no ties to or from a note without a string.
- `src/rendering/glyphs/TabNoteChordGlyph.ts`: `getNoteY` of a beat with no stringed note is 0.

Guitar, bass and other stringed parts always give every note a string: nothing changes for them.

## Proof

`packages/core/test/virtual-tab.test.ts` (REND-190): a piano part's A0, below any guitar string,
is left out of its tablature while the rest is written.

## Upstream

Worth proposing: a robustness fix.
