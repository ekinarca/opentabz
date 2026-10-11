# 0018 — A track's playing style: let ring, strummed chords, palm-mute damping, accentuation

## Problem

Guitar Pro plays each track with an _interpretation_: notes can ring on until the string is played
again (let ring throughout), chords can be strummed, palm mutes damped lightly or heavily, and
strong beats stressed. alphaTab plays every track as written, with no way to ask for any of it.

## Change

`MidiFileGenerator.trackInterpretations: Map<trackIndex, { letRing, brush, palmMute, accent }>`
(set before `generate()`; tracks left out play as written):

- `letRing`: every fretted note is treated as let ring (alphaTab's own let-ring rule: it rings
  until a rest or the next note on its string, at most a bar).
- `brush`: a beat without a brush of its own that strikes two or more strings is strummed down,
  60 ticks (a sixty-fourth note) from the first string to the last.
- `palmMute` (0 to 1): the palm-mute length is `80 × 2^(1 − 2 × palmMute)` of alphaTab's units:
  twice as long when light, as written at 0.5, half as long when heavy.
- `accent`: the first beat of a bar is a dynamic step (16 velocity units) stronger, and the middle
  of an even bar (beat 3 of 4/4, the second half of 6/8) half a step.

OpenTabz sends each track's style with `preparePlayback`; a change regenerates the MIDI and the
synth worker swaps it in while playing (`replaceMidiFile`, patch 0009), keeping the position.

## Proof

`packages/core/test/playback-interpretation.test.ts` (note lengths, strum offsets, palm-mute
lengths and velocities with and without each style; without the patch the generator has no
`trackInterpretations` and the tests fail) and `apps/web/e2e/style.spec.ts` (changed while
playing without stopping, remembered for the file).

## Upstream

Not yet proposed: it would fit alphaTab as per-track player settings.
