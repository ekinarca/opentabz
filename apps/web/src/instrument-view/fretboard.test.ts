import { NOTE_TIED, type PlaybackTimeline, type TrackNotes } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  fretboardNotes,
  fretCentre,
  fretCount,
  indexTrackNotes,
  noteName,
  pitchAt,
  wirePosition,
} from './fretboard.ts';

const Q = 960;

/**
 * One bar of four quarter-note slices, then a second bar. Track 0: a half note (beat 101) held
 * through the second slice, a chord (102), a note (103), then beat 104 in the next bar. Track 1
 * plays in every slice and must be ignored.
 */
const TIMELINE: PlaybackTimeline = {
  playbackId: 'test',
  extraChannels: new Int32Array(0),
  endTick: 8 * Q,
  bars: Int32Array.from([0, 4 * Q, 0, 0, 4, 4 * Q, 8 * Q, 1, 4, 1]),
  slices: Int32Array.from([
    0,
    Q,
    0,
    2,
    Q,
    2 * Q,
    2,
    2,
    2 * Q,
    3 * Q,
    4,
    2,
    3 * Q,
    4 * Q,
    6,
    2,
    4 * Q,
    8 * Q,
    8,
    2,
  ]),
  items: Int32Array.from([
    101,
    0,
    0,
    201,
    1,
    0,
    101,
    0,
    0,
    202,
    1,
    Q,
    102,
    0,
    2 * Q,
    203,
    1,
    2 * Q,
    103,
    0,
    3 * Q,
    204,
    1,
    3 * Q,
    104,
    0,
    4 * Q,
    205,
    1,
    4 * Q,
  ]),
};

const NOTES: TrackNotes = {
  trackIndex: 0,
  staffIndex: 0,
  beats: Int32Array.from([101, 0, 1, -1, 102, 1, 2, -1, 103, 3, 1, -1, 104, 4, 1, 2]),
  notes: Int32Array.from([5, 0, 45, 0, 4, 2, 52, 0, 3, 2, 57, 0, 1, 3, 67, 0, 1, 3, 67, NOTE_TIED]),
};
const ROWS = indexTrackNotes(NOTES);

describe('the fretboard model', () => {
  it('shows the notes sounding at a tick, held ones included', () => {
    const first = fretboardNotes(TIMELINE, NOTES, ROWS, 0, 'beat', 0);
    const held = fretboardNotes(TIMELINE, NOTES, ROWS, Q + 10, 'beat', 0);
    expect(first.current).toEqual([{ string: 5, fret: 0, pitch: 45, flags: 0 }]);
    expect(held.current).toEqual(first.current);
    expect(held.next).toEqual([]);
    expect(held.bar).toEqual([]);
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, 2 * Q, 'beat', 0).current).toHaveLength(2);
  });

  it('adds the next notes to play, across a bar line too', () => {
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, Q, 'next', 0).next).toEqual([
      { string: 4, fret: 2, pitch: 52, flags: 0 },
      { string: 3, fret: 2, pitch: 57, flags: 0 },
    ]);
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, 3 * Q, 'next', 0).next).toEqual([
      { string: 1, fret: 3, pitch: 67, flags: NOTE_TIED },
    ]);
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, 5 * Q, 'next', 0).next).toEqual([]);
  });

  it('adds the rest of the bar, each place once, and spells names in the key', () => {
    const notes = fretboardNotes(TIMELINE, NOTES, ROWS, Q, 'bar', 0);
    expect(notes.bar.map(note => note.string)).toEqual([4, 3, 1]);
    // From the chord on, the open A was played already and the chord's places are sounding.
    const later = fretboardNotes(TIMELINE, NOTES, ROWS, 2 * Q, 'bar', 0);
    expect(later.bar.map(note => `${note.string}:${note.fret}`)).toEqual(['5:0', '1:3']);
    expect(notes.flats).toBe(true);
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, 5 * Q, 'bar', 0).flats).toBe(false);
  });

  it('counts frets from the nut with a capo', () => {
    expect(fretboardNotes(TIMELINE, NOTES, ROWS, 2 * Q, 'beat', 2).current.map(note => note.fret)).toEqual([
      4, 4,
    ]);
    expect(fretCount(NOTES, 0)).toBe(24);
    expect(fretCount({ ...NOTES, notes: Int32Array.from([1, 26, 90, 0]) }, 1)).toBe(27);
  });

  it('places frets narrowing up the neck, at most half as wide at the top', () => {
    const wires = Array.from({ length: 25 }, (_, fret) => wirePosition(fret, 24));
    expect(wires[0]).toBe(0);
    expect(wires[24]).toBeCloseTo(1, 10);
    const widths = wires.slice(1).map((wire, fret) => wire - (wires[fret] ?? 0));
    for (let fret = 1; fret < widths.length; fret++) expect(widths[fret]).toBeLessThan(widths[fret - 1] ?? 0);
    expect((widths[0] ?? 0) / (widths[23] ?? 1)).toBeLessThan(2);
    expect(fretCentre(1, 24)).toBeCloseTo((wires[0] ?? 0) / 2 + (wires[1] ?? 0) / 2, 10);
  });

  it('names notes with their octave, middle C being C4', () => {
    expect(noteName(60, false)).toBe('C4');
    expect(noteName(61, false)).toBe('C♯4');
    expect(noteName(61, true)).toBe('D♭4');
    expect(noteName(40, false)).toBe('E2');
    expect(noteName(23, true)).toBe('B0');
  });

  it('finds the note at any place on the neck, none behind a capo', () => {
    const standard = [64, 59, 55, 50, 45, 40];
    expect(pitchAt(standard, 6, 0, 0)).toBe(40);
    expect(pitchAt(standard, 1, 5, 0)).toBe(69);
    expect(pitchAt(standard, 1, 1, 2)).toBeNull();
    expect(pitchAt(standard, 1, 2, 2)).toBe(66);
    expect(pitchAt(standard, 7, 0, 0)).toBeNull();
  });
});
