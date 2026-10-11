import type { MasterBarSummary, PlaybackTimeline, TrackChords } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { beatsUntil, chordChanges, chordsAt } from './chords.ts';

const Q = 960;

/**
 * Bar 1 (two half notes: beats 1 and 2), bar 2 (a whole note: beat 3), then bar 1 again (a
 * repeat). Track 1 plays along and carries no chords of track 0.
 */
const TIMELINE: PlaybackTimeline = {
  playbackId: 'test',
  extraChannels: new Int32Array(0),
  endTick: 12 * Q,
  bars: Int32Array.from([0, 4 * Q, 0, 0, 2, 4 * Q, 8 * Q, 1, 2, 1, 8 * Q, 12 * Q, 0, 3, 2]),
  slices: Int32Array.from([
    0,
    2 * Q,
    0,
    2,
    2 * Q,
    4 * Q,
    2,
    1,
    4 * Q,
    8 * Q,
    3,
    1,
    8 * Q,
    10 * Q,
    4,
    1,
    10 * Q,
    12 * Q,
    5,
    1,
  ]),
  items: Int32Array.from([1, 0, 0, 9, 1, 0, 2, 0, 2 * Q, 3, 0, 4 * Q, 1, 0, 8 * Q, 2, 0, 10 * Q]),
};

const CHORDS: TrackChords = {
  trackIndex: 0,
  chords: [
    { name: 'A7', firstFret: 1, strings: [0, 2, 0, 2, 0, -1], barres: [] },
    { name: 'D7', firstFret: 1, strings: [2, 1, 2, 0, -1, -1], barres: [] },
  ],
  // Beat 1: A7, beat 2: A7 again, beat 3: D7; beat 9 of track 1 is not this track's.
  beats: Int32Array.from([1, 0, 2, 0, 3, 1]),
};

const BARS: MasterBarSummary[] = [
  { numerator: 4, denominator: 4, anacrusis: false, section: null },
  { numerator: 6, denominator: 8, anacrusis: false, section: null },
];

describe('the chords model (VIEW-007, VIEW-027)', () => {
  it('finds where each chord starts, in playing order, repeats played out', () => {
    expect(chordChanges(TIMELINE, CHORDS)).toEqual([
      { tick: 0, chord: 0 },
      { tick: 2 * Q, chord: 0 },
      { tick: 4 * Q, chord: 1 },
      { tick: 8 * Q, chord: 0 },
      { tick: 10 * Q, chord: 0 },
    ]);
  });

  it('gives the chord sounding and the next different one', () => {
    const changes = chordChanges(TIMELINE, CHORDS);
    // A chord played again is not the next chord.
    expect(chordsAt(changes, Q)).toEqual({ current: { tick: 0, chord: 0 }, next: { tick: 4 * Q, chord: 1 } });
    expect(chordsAt(changes, 5 * Q)).toEqual({
      current: { tick: 4 * Q, chord: 1 },
      next: { tick: 8 * Q, chord: 0 },
    });
    expect(chordsAt(changes, 11 * Q)).toEqual({ current: { tick: 10 * Q, chord: 0 }, next: null });
    expect(chordsAt([], 0)).toEqual({ current: null, next: null });
  });

  it('counts the beats left in the meter of the bar', () => {
    // Quarter-note beats in 4/4: three beats from the second beat to bar 2.
    expect(beatsUntil(TIMELINE, BARS, Q, 4 * Q)).toBe(3);
    expect(beatsUntil(TIMELINE, BARS, Q + 10, 4 * Q)).toBe(3);
    expect(beatsUntil(TIMELINE, BARS, 4 * Q, 4 * Q)).toBe(0);
    // Eighth-note beats in 6/8.
    expect(beatsUntil(TIMELINE, BARS, 5 * Q, 8 * Q)).toBe(6);
  });
});
