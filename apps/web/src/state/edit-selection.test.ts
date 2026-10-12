/** The editor's selection (EDIT-020): what it covers, and how it reaches other tracks. */
import { BEAT_REST, type TrackBeats } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import type { Caret } from './edit-caret.ts';
import {
  engineSelection,
  everything,
  extendToTrack,
  followCaret,
  selectedBars,
  selectionHolds,
  selectionMark,
  type EditSelection,
} from './edit-selection.ts';

/** Three bars of voice 0: bar 0 beats 1 and 2, bar 1 beats 3 and 4, bar 2 beat 5; voice 1, beat 9. */
function beats(): TrackBeats {
  // [beatId, staff, bar, voice, beat, duration, dots, flags, firstNote, noteCount, end, barLength]
  return {
    trackIndex: 1,
    beats: Int32Array.of(
      ...[1, 0, 0, 0, 0, 2, 0, 0, 0, 1, 1920, 3840],
      ...[2, 0, 0, 0, 1, 2, 0, BEAT_REST, 1, 0, 3840, 3840],
      ...[9, 0, 0, 1, 0, 1, 0, BEAT_REST, 1, 0, 3840, 3840],
      ...[3, 0, 1, 0, 0, 2, 0, 0, 1, 1, 1920, 3840],
      ...[4, 0, 1, 0, 1, 2, 0, 0, 2, 1, 3840, 3840],
      ...[5, 0, 2, 0, 0, 1, 0, 0, 3, 1, 3840, 3840],
    ),
    notes: Int32Array.of(5, 3, 0, 5, 5, 0, 4, 7, 0, 3, 2, 0),
    beatMarks: new Int32Array(),
    noteMarks: new Int32Array(),
    texts: [],
  };
}

const CARET: Caret = { track: 1, staff: 0, voice: 0, beatId: 4, string: 5 };

describe('the selection', () => {
  it('covers the beats from where it started to the caret, either way, across bars', () => {
    const selection: EditSelection = { kind: 'beats', anchor: 2 };
    expect(selectionMark(selection, CARET, beats())).toEqual({
      kind: 'beats',
      track: 1,
      staff: 0,
      beatIds: new Set([2, 3, 4]),
    });
    expect(engineSelection(selection, CARET, beats())).toEqual({
      kind: 'beats',
      track: 1,
      staff: 0,
      voice: 0,
      from: { bar: 0, beat: 1 },
      to: { bar: 1, beat: 1 },
    });
    // Made leftwards: from the caret to where it started.
    const back = engineSelection({ kind: 'beats', anchor: 5 }, { ...CARET, beatId: 3 }, beats());
    expect(back).toMatchObject({ from: { bar: 1, beat: 0 }, to: { bar: 2, beat: 0 } });
    expect(selectedBars(selection, CARET, beats())).toEqual({ from: 0, to: 1 });
  });

  it('is gone with the beat it started on, and holds nothing without a caret', () => {
    const gone: EditSelection = { kind: 'beats', anchor: 42 };
    expect(selectionHolds(gone, CARET, beats())).toBe(false);
    expect(selectionMark(gone, CARET, beats())).toBeNull();
    expect(engineSelection(gone, CARET, beats())).toBeNull();
    expect(engineSelection({ kind: 'beats', anchor: 2 }, null, beats())).toBeNull();
    expect(selectionMark(null, CARET, beats())).toBeNull();
  });

  it('reaches other tracks as whole bars, which then follow the caret', () => {
    const down = extendToTrack({ kind: 'beats', anchor: 2 }, CARET, beats(), 1, 3);
    expect(down).toEqual({ kind: 'bars', fromTrack: 1, toTrack: 2, fromBar: 0, toBar: 1 });
    // No further than the last track; back up past the caret's.
    expect(extendToTrack(down, CARET, beats(), 1, 3)).toMatchObject({ toTrack: 2 });
    const up = extendToTrack(extendToTrack(down, CARET, beats(), -1, 3), CARET, beats(), -1, 3);
    expect(up).toMatchObject({ fromTrack: 1, toTrack: 0 });
    expect(followCaret(up, { ...CARET, beatId: 5 }, beats())).toMatchObject({ fromBar: 0, toBar: 2 });
    expect(engineSelection(up, CARET, beats())).toEqual(up);
    expect(selectionMark(up, null, null)).toEqual(up);
  });

  it('selects every bar of every track', () => {
    expect(everything(3, 12)).toEqual({ kind: 'bars', fromTrack: 0, toTrack: 2, fromBar: 0, toBar: 11 });
  });
});
