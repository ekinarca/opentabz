# 0017 — Channels of their own for slap and pop, golpe and unison bends

## Problem

Some techniques need a sound the track's two channels cannot give:

- **Slap and pop** play like plain notes. On a bass they have sounds of their own (General MIDI
  has Slap Bass 1 and 2); elsewhere they are at least struck harder.
- **Golpe** (a knock on the guitar's top, with the thumb or a finger) is silent.
- **Bends are per note** (MIDI 2.0 per-note pitch bend, keyed by pitch): two strings bent from the
  same pitch, as in a unison bend where both strings move, share one curve.

## Change

`MidiFileGenerator._extraChannel(track, use)` adds a channel for a track the first time a use
needs it (`slap`, `pop`, `bend`, `golpe`), numbered after every channel of the score (skipping
General MIDI's drum channel), set up like the track's own (volume, pan, expression, pitch-bend
range, bank, and the track's transposition), and records it in the public
`extraChannels: number[]` as `[track, channel, kind]` (kind 1 for a drum kit). The synthesizer
handles any number of channels, so nothing is limited to 16.

- Slapped and popped notes of a General MIDI bass (programs 32–39) play on channels with
  programs 36 (Slap Bass 1) and 37 (Slap Bass 2); on other instruments they are two dynamic
  steps harder.
- A golpe plays General MIDI drum key 77 (low wood block) for the thumb or 37 (side stick) for a
  finger, a sixteenth long at the beat's dynamic, on a drum-kit channel (bank 127, patch 0007).
- When an earlier note of the same beat already bends from the same pitch, a bent note (and the
  notes tied to it) plays on the track's `bend` channel.

OpenTabz passes `extraChannels` with the playback timeline, and the mixer applies a track's
mute, solo, level and pan to all of its channels, and its instrument, transposition and tuning
to all but drum kits.

## Proof

`packages/core/test/playback-channels.test.ts` (channels, programs, keys, bank select, per-note
bend curves, and in the audio: the golpe is heard, both bent pitches sound) and
`apps/web/src/state/track-channels.test.ts` (the mixer's view of a track's channels).

## Upstream

Not yet proposed: alphaTab's player would need a way to report the added channels (its own
mixer works per track).
