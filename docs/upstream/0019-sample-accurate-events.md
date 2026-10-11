# 0019 — Sample-accurate events

## Problem

The synthesizer renders in blocks of 64 samples. Before each block, the sequencer hands it every
event that falls inside the block, and `TinySoundFont._fillWorkingBuffer` applies them all at
the start of the block before rendering it. A note therefore starts up to 63 samples (1.45 ms at
44.1 kHz) early, and by a different amount every time: notes a steady quarter apart came out
16, 32 or 48 samples off their spacing.

## Change

- `SynthEvent.sampleOffset`: `MidiFileSequencer._fillMidiEventQueueLimited` sets it to the sample
  of the block at which the event falls (its song time from the block's start, divided by the
  song milliseconds per sample at the current speed). Events flushed at the end of a state
  (`fillMidiEventQueueToEndTime`) take effect at the start of the block.
- `_fillWorkingBuffer` renders the voices up to the next event's sample, applies the event, and
  goes on, so a block is split at its events (interleaved output; silent synthesis while seeking
  is unchanged).

## Proof

`packages/core/test/playback-timing.test.ts`: hi-hats a quarter note apart at 125 BPM (21 168
samples, 330.75 blocks) are rendered through alphaTab's synthesizer; the spacing of their onsets
is exact to a sample with the patch and off by up to 48 samples without it.

## Upstream

Not yet proposed: a self-contained accuracy improvement of the synthesizer.
