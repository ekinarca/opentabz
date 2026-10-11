# 0027 — Lyrics kept as written

## Problem

Guitar Pro and alphaTex give a track its lyrics as typed text: up to five lines, each with a
start bar, written with line breaks and with comments in brackets (`[Chorus]`).
`Track.applyLyrics` splits the text into syllables and gives them to the beats, and the text
itself is then dropped. An app that shows the lyrics as a song sheet or for karaoke cannot get
back the lines, or the comments that name them.

## Change

- `Track.lyrics`: the `Lyrics` that `applyLyrics` applied, kept as given (`@json_ignore`: it is
  derived input, not part of the score's serialized form).

## Proof

- `packages/core/test/track-lyrics.test.ts` (VIEW-010): OpenTabz splits the kept text into the
  same syllables as alphaTab and keeps its line breaks and comments; each syllable lands on the
  beat alphaTab put it on, for alphaTex and for a Guitar Pro 7 file.
- `import-golden.test.ts`: no fixture imports differently.

## Upstream

Not yet proposed: adds a model field.
