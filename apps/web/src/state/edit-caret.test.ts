/** How the editor's caret moves, and what keys write (EDIT-004). */
import { BEAT_EMPTY, BEAT_REST, type TrackBeats } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  caretAddress,
  durationTicks,
  fretAtCaret,
  restAfter,
  rowOf,
  SECOND_DIGIT_MS,
  stepCaret,
  stepCaretBar,
  stepCaretString,
  steppedDuration,
  stepRight,
  stringFor,
  typedFret,
  voiceRows,
  type Caret,
} from './edit-caret.ts';

/**
 * Two bars of a six-string track: bar 0 holds beats 1 (fret 3 on string 5) and 2 (a rest), and,
 * in voice 1, beat 9; bar 1 holds beat 3, empty.
 */
function beats(): TrackBeats {
  // [beatId, staff, bar, voice, beat, duration, dots, flags, firstNote, noteCount, end, barLength]
  return {
    trackIndex: 0,
    beats: Int32Array.of(
      ...[1, 0, 0, 0, 0, 4, 0, 0, 0, 1, 960, 3840],
      ...[2, 0, 0, 0, 1, 4, 1, BEAT_REST, 1, 0, 2400, 3840],
      ...[9, 0, 0, 1, 0, 2, 0, 0, 1, 1, 1920, 3840],
      ...[3, 0, 1, 0, 0, 4, 0, BEAT_EMPTY | BEAT_REST, 2, 0, 960, 3840],
    ),
    notes: Int32Array.of(5, 3, 0, 2, 7, 0),
    beatMarks: new Int32Array(),
    noteMarks: new Int32Array(),
    texts: [],
    drumSounds: [],
    drumNames: [],
  };
}

const CARET: Caret = { track: 0, staff: 0, voice: 0, beatId: 1, string: 5 };

describe('the caret', () => {
  it('knows where its beat is and what is written on its string', () => {
    expect(caretAddress(beats(), CARET)).toEqual({ track: 0, staff: 0, bar: 0, voice: 0, beat: 0 });
    expect(fretAtCaret(beats(), CARET)).toBe(3);
    expect(fretAtCaret(beats(), { ...CARET, string: 4 })).toBeNull();
    expect(caretAddress(beats(), { ...CARET, beatId: 42 })).toBeNull();
    expect(voiceRows(beats(), 0, 1).map(row => row.beatId)).toEqual([9]);
  });

  it('moves across the beats of its voice, from bar to bar, and stays at the ends', () => {
    expect(stepCaret(beats(), CARET, 1).beatId).toBe(2);
    expect(stepCaret(beats(), { ...CARET, beatId: 2 }, 1).beatId).toBe(3);
    expect(stepCaret(beats(), { ...CARET, beatId: 3 }, 1).beatId).toBe(3);
    expect(stepCaret(beats(), CARET, -1).beatId).toBe(1);
    expect(stepCaretBar(beats(), { ...CARET, beatId: 2 }, 1).beatId).toBe(3);
    expect(stepCaretBar(beats(), { ...CARET, beatId: 3 }, -1).beatId).toBe(1);
    expect(stepCaretBar(beats(), CARET, -1).beatId).toBe(1);
  });

  it('moves up to the next string higher in pitch, down the other way up on inverted tablature', () => {
    expect(stepCaretString(CARET, 6, true, false).string).toBe(6);
    expect(stepCaretString({ ...CARET, string: 6 }, 6, true, false).string).toBe(6);
    expect(stepCaretString(CARET, 6, false, false).string).toBe(4);
    expect(stepCaretString(CARET, 6, true, true).string).toBe(4);
    expect(stepCaretString({ ...CARET, string: 1 }, 6, false, false).string).toBe(1);
  });
});

describe('→ past the last beat', () => {
  it('puts a rest after the last beat of a bar with room, a bar after the last of the score', () => {
    expect(stepRight(beats(), CARET)).toEqual({ kind: 'move', caret: { ...CARET, beatId: 2 } });
    expect(stepRight(beats(), { ...CARET, beatId: 2 })).toMatchObject({ kind: 'beat', row: { beatId: 2 } });
    // An empty bar has no beat written to follow: on to the next bar, or a new one at the end.
    expect(stepRight(beats(), { ...CARET, beatId: 3 })).toMatchObject({ kind: 'bar', row: { beatId: 3 } });
  });

  it('makes the rest as long as the beat before it, or as long as the bar has room for', () => {
    expect(durationTicks(4, 0)).toBe(960);
    expect(durationTicks(4, 1)).toBe(1440);
    expect(durationTicks(2, 2)).toBe(3360);
    expect(durationTicks(-2, 0)).toBe(7680);
    const dotted = rowOf(beats(), 2);
    if (dotted === null) throw new Error('No beat 2.');
    expect(restAfter(dotted)).toBeNull();
    expect(restAfter({ ...dotted, end: 3360 })).toEqual({ duration: 8, dots: 0 });
    expect(restAfter({ ...dotted, end: 3800 })).toEqual({ duration: 64, dots: 0 });
  });
});

describe('keys', () => {
  it('join two digits typed quickly on the same note into one fret, up to 99', () => {
    const typed = { beatId: 1, string: 5, fret: 1, at: 1000 };
    expect(typedFret(typed, CARET, 2, 1200)).toBe(12);
    expect(typedFret(typed, CARET, 2, 1000 + SECOND_DIGIT_MS)).toBe(2);
    expect(typedFret(typed, { ...CARET, string: 4 }, 2, 1200)).toBe(2);
    expect(typedFret({ ...typed, fret: 0 }, CARET, 7, 1200)).toBe(7);
    expect(typedFret({ ...typed, fret: 12 }, CARET, 3, 1200)).toBe(3);
    expect(typedFret({ ...typed, fret: 9 }, CARET, 9, 1200)).toBe(99);
    expect(typedFret(null, CARET, 4, 1200)).toBe(4);
  });

  it('make a note a step longer or shorter, a whole note to a sixty-fourth', () => {
    expect(steppedDuration(4, true)).toBe(2);
    expect(steppedDuration(4, false)).toBe(8);
    expect(steppedDuration(1, true)).toBeNull();
    expect(steppedDuration(64, false)).toBeNull();
    // A double whole note and a 128th step in among them.
    expect(steppedDuration(-2, false)).toBe(1);
    expect(steppedDuration(128, true)).toBe(64);
  });
});

describe('a note moved from string to string (EDIT-052)', () => {
  // Standard tuning, the highest string first.
  const TUNING = [64, 59, 55, 50, 45, 40];

  it('goes to the next string free with a fret for its pitch, either way', () => {
    // Beat 1: fret 3 on string 5 (the B string): lower, the G string's 7th; the high E has no fret
    // that low.
    const row = rowOf(beats(), 1);
    if (row === null) throw new Error('No beat 1.');
    expect(stringFor(row, TUNING, 5, false)).toBe(4);
    expect(stringFor(row, TUNING, 5, true)).toBeNull();
    expect(stringFor({ ...row, notes: [{ string: 4, fret: 5, flags: 0 }] }, TUNING, 4, true)).toBe(5);
    // No note there; no lower string than the low E.
    expect(stringFor(row, TUNING, 2, true)).toBeNull();
    expect(stringFor({ ...row, notes: [{ string: 1, fret: 0, flags: 0 }] }, TUNING, 1, false)).toBeNull();
    // A string played is passed.
    expect(
      stringFor(
        {
          ...row,
          notes: [
            { string: 5, fret: 3, flags: 0 },
            { string: 4, fret: 2, flags: 0 },
          ],
        },
        TUNING,
        5,
        false,
      ),
    ).toBe(3);
  });
});
