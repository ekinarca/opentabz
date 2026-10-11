import type { PlaybackTimeline, TrackNotes, TrackSummary } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { indexTrackNotes } from './fretboard.ts';
import {
  BLACK_WIDTH,
  instrumentRange,
  isBlackKey,
  keyboardNotes,
  keyboardSpan,
  keyPlaces,
  PIANO_RANGE,
  playedRange,
} from './keyboard.ts';

const Q = 960;

function track(program: number, tuning: readonly number[] = [], staves = 1): TrackSummary {
  return {
    index: 0,
    name: 'Track',
    shortName: 'T.',
    color: '#000000',
    isPercussion: false,
    program,
    channels: [0, 1],
    mix: { volume: 1, balance: 0, mute: false, solo: false },
    staves: Array.from({ length: staves }, (_, index) => ({
      index,
      showStandardNotation: true,
      showTablature: tuning.length > 0,
      showSlash: false,
      showNumbered: false,
      isPercussion: false,
      stringCount: tuning.length,
      tuning,
      tuningName: '',
      capo: 0,
      displayTransposition: 0,
    })),
  };
}

/** One bar of two half-note slices: a piano's right hand (staff 0) and left hand (staff 1). */
const TIMELINE: PlaybackTimeline = {
  playbackId: 'test',
  extraChannels: new Int32Array(0),
  endTick: 4 * Q,
  bars: Int32Array.from([0, 4 * Q, 0, 0, 2]),
  slices: Int32Array.from([0, 2 * Q, 0, 2, 2 * Q, 4 * Q, 2, 2]),
  items: Int32Array.from([11, 0, 0, 21, 0, 0, 12, 0, 2 * Q, 22, 0, 2 * Q]),
};

const NOTES: TrackNotes = {
  trackIndex: 0,
  staffIndex: null,
  beats: Int32Array.from([11, 0, 3, 0, 0, 21, 3, 1, 0, 1, 12, 4, 3, 0, 0, 22, 7, 1, 0, 1]),
  notes: Int32Array.from([
    ...[0, 0, 72, 0, 0, 0, 76, 0, 0, 0, 79, 0],
    ...[0, 0, 48, 0],
    ...[0, 0, 74, 0, 0, 0, 77, 0, 0, 0, 81, 0],
    ...[0, 0, 43, 0],
  ]),
};
const ROWS = indexTrackNotes(NOTES);

describe('the keyboard model', () => {
  it('takes the range of the instrument: its strings, its sound, or a piano', () => {
    // A guitar in standard tuning: low E to the 24th fret of high E.
    expect(instrumentRange(track(25, [64, 59, 55, 50, 45, 40]))).toEqual({ low: 40, high: 88 });
    expect(instrumentRange(track(73))).toEqual({ low: 60, high: 96 });
    expect(instrumentRange(track(0, [], 2))).toEqual(PIANO_RANGE);
    expect(instrumentRange(track(81))).toEqual(PIANO_RANGE);
  });

  it('draws the range and the notes played, rounded out to octaves, at most 88 keys', () => {
    // A flute: C4 to C7, drawn from C3 to B7, the keys outside its range greyed.
    expect(keyboardSpan({ low: 60, high: 96 }, null)).toEqual({ low: 48, high: 107 });
    // A note beyond the range widens the keyboard.
    expect(keyboardSpan({ low: 60, high: 96 }, { low: 40, high: 70 })).toEqual({ low: 24, high: 107 });
    expect(keyboardSpan(PIANO_RANGE, null)).toEqual(PIANO_RANGE);
    expect(playedRange(NOTES)).toEqual({ low: 43, high: 81 });
    expect(playedRange(null)).toBeNull();
  });

  it('places white keys side by side and black keys between them', () => {
    const { keys, whites } = keyPlaces({ low: 60, high: 71 });
    expect(whites).toBe(7);
    expect(keys.filter(key => key.black).map(key => key.pitch)).toEqual([61, 63, 66, 68, 70]);
    expect([60, 61, 62, 63, 64, 65].map(isBlackKey)).toEqual([false, true, false, true, false, false]);
    const cSharp = keys.find(key => key.pitch === 61);
    expect(cSharp?.width).toBe(BLACK_WIDTH);
    // C♯ straddles the line between C and D, a little to the left.
    expect((cSharp?.x ?? 0) + BLACK_WIDTH / 2).toBeCloseTo(0.9, 6);
    expect(keys.find(key => key.pitch === 64)?.x).toBe(2);
    // The 88 keys: 52 white.
    expect(keyPlaces(PIANO_RANGE).whites).toBe(52);
  });

  it('shows both hands, or the right or left hand alone', () => {
    const both = keyboardNotes(TIMELINE, NOTES, ROWS, 0, 'beat', 'both', 0);
    expect(both.current.map(note => note.pitch).sort()).toEqual([48, 72, 76, 79]);
    const right = keyboardNotes(TIMELINE, NOTES, ROWS, 0, 'beat', 'right', 0);
    expect(right.current.map(note => note.pitch)).toEqual([72, 76, 79]);
    const left = keyboardNotes(TIMELINE, NOTES, ROWS, 0, 'next', 'left', 0);
    expect(left.current.map(note => note.pitch)).toEqual([48]);
    expect(left.next.map(note => note.pitch)).toEqual([43]);
    expect(left.current[0]?.staff).toBe(1);
  });
});
