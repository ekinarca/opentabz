/** Bars whose voices do not fill them (EDIT-103). */
import { BEAT_EMPTY, BEAT_REST, type TrackBeats } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { faultyVoices, nextFaulty } from './bar-check.ts';

/**
 * Three bars of 4/4: bar 0's first voice is a quarter short, its second a full bar; bar 1 has
 * a half too many; bar 2 is empty.
 */
function beats(): TrackBeats {
  // [beatId, staff, bar, voice, beat, duration, dots, flags, firstNote, noteCount, end, barLength]
  return {
    trackIndex: 0,
    beats: Int32Array.of(
      ...[1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1920, 3840],
      ...[2, 0, 0, 0, 1, 4, 0, BEAT_REST, 0, 0, 2880, 3840],
      ...[3, 0, 0, 1, 0, 1, 0, 0, 0, 0, 3840, 3840],
      ...[4, 0, 1, 0, 0, 1, 0, 0, 0, 0, 3840, 3840],
      ...[5, 0, 1, 0, 1, 2, 0, 0, 0, 0, 5760, 3840],
      ...[6, 0, 2, 0, 0, 4, 0, BEAT_EMPTY | BEAT_REST, 0, 0, 960, 3840],
    ),
    notes: new Int32Array(),
    beatMarks: new Int32Array(),
    noteMarks: new Int32Array(),
    texts: [],
    drumSounds: [],
    drumNames: [],
  };
}

describe('bars whose voices do not fill them (EDIT-103)', () => {
  it('names each voice short of its bar, or too long for it; an empty bar is none', () => {
    expect(faultyVoices(beats())).toEqual([
      { staff: 0, bar: 0, voice: 0, beatId: 1, missing: 960 },
      { staff: 0, bar: 1, voice: 0, beatId: 4, missing: -1920 },
    ]);
  });

  it('goes to the next faulty bar after one, and round to the first', () => {
    const faulty = faultyVoices(beats());
    expect(nextFaulty(faulty, 0)?.bar).toBe(1);
    expect(nextFaulty(faulty, 1)?.bar).toBe(0);
    expect(nextFaulty([], 0)).toBeNull();
  });
});
