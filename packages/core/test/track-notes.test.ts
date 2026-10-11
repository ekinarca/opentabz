import { describe, expect, it } from 'vitest';
import { summarizeScore } from '../src/document/summary.ts';
import { openScore } from '../src/open/open.ts';
import { collectTrackNotes } from '../src/playback/track-notes.ts';
import {
  NOTE_DEAD,
  NOTE_GHOST,
  NOTE_HARMONIC,
  NOTE_TIED,
  TRACK_BEAT_STRIDE,
  TRACK_NOTE_STRIDE,
  type TrackNotes,
} from '../src/shared/notes.ts';
import { readFixture } from './helpers.ts';

const { score } = openScore(readFixture('alphatex/views/fretboard.atex'), 'fretboard.atex');

interface Read {
  readonly key: number;
  readonly notes: { string: number; fret: number; pitch: number; flags: number }[];
}

/** The beats in score order, with their notes sorted by string. */
function read(notes: TrackNotes): Read[] {
  const beats: Read[] = [];
  for (let index = 0; index < notes.beats.length; index += TRACK_BEAT_STRIDE) {
    const first = notes.beats[index + 1] ?? 0;
    const count = notes.beats[index + 2] ?? 0;
    const beatNotes = [];
    for (let note = first; note < first + count; note++) {
      const base = note * TRACK_NOTE_STRIDE;
      beatNotes.push({
        string: notes.notes[base] ?? -1,
        fret: notes.notes[base + 1] ?? -1,
        pitch: notes.notes[base + 2] ?? -1,
        flags: notes.notes[base + 3] ?? -1,
      });
    }
    beatNotes.sort((a, b) => a.string - b.string);
    beats.push({ key: notes.beats[index + 3] ?? 99, notes: beatNotes });
  }
  return beats;
}

describe('track notes for instrument views', () => {
  it('numbers strings as tablature does and counts frets from the capo', () => {
    const summary = summarizeScore(score, {
      id: 'doc',
      fileName: 'fretboard.atex',
      byteLength: 0,
      format: 'alphatex',
      formatVersion: null,
      extensionMismatch: false,
      truncated: false,
    });
    expect(summary.tracks[0]?.staves[0]).toMatchObject({ stringCount: 7, capo: 2 });

    const guitar = collectTrackNotes(score, 0);
    expect(guitar.staffIndex).toBe(0);
    const beats = read(guitar);
    expect(beats.map(beat => beat.key)).toEqual([-2, -2, -2, -2, -2, -2, -2]);
    // B1 and E2 strings, open and at fret 2, sounding two semitones higher with the capo.
    expect(beats[0]?.notes).toEqual([
      { string: 6, fret: 2, pitch: 40 + 2 + 2, flags: 0 },
      { string: 7, fret: 0, pitch: 35 + 2, flags: 0 },
    ]);
    expect(beats[1]?.notes).toEqual([expect.objectContaining({ string: 5, flags: NOTE_DEAD })]);
    expect(beats[2]?.notes).toEqual([expect.objectContaining({ string: 3, fret: 12, flags: NOTE_HARMONIC })]);
    expect(beats[3]?.notes).toEqual([{ string: 2, fret: 3, pitch: 59 + 2 + 3, flags: NOTE_GHOST }]);
    expect(beats[4]?.notes).toEqual([{ string: 1, fret: 5, pitch: 64 + 2 + 5, flags: 0 }]);
    expect(beats[5]?.notes).toEqual([{ string: 1, fret: 5, pitch: 64 + 2 + 5, flags: NOTE_TIED }]);
    expect(beats[6]?.notes).toEqual([{ string: 1, fret: 17, pitch: 64 + 2 + 17, flags: 0 }]);
  });

  it('reads any number of strings, and nothing from tracks without strings', () => {
    expect(read(collectTrackNotes(score, 1)).map(beat => beat.notes)).toEqual([
      [{ string: 4, fret: 0, pitch: 28, flags: 0 }],
      [{ string: 3, fret: 3, pitch: 36, flags: 0 }],
      [{ string: 2, fret: 5, pitch: 43, flags: 0 }],
    ]);
    const drums = collectTrackNotes(score, 2);
    expect(drums).toMatchObject({ trackIndex: 2, staffIndex: null });
    expect(drums.beats).toHaveLength(0);
    expect(collectTrackNotes(score, 9)).toMatchObject({ staffIndex: null });
  });

  it('reads every staff with pitches, telling them apart (the hands of a piano)', () => {
    const keyboard = openScore(readFixture('alphatex/views/keyboard.atex'), 'keyboard.atex').score;
    const piano = collectTrackNotes(keyboard, 0);
    expect(piano.staffIndex).toBeNull();
    const staves: number[] = [];
    const pitches: number[][] = [];
    for (let index = 0; index < piano.beats.length; index += TRACK_BEAT_STRIDE) {
      staves.push(piano.beats[index + 4] ?? -1);
      const first = piano.beats[index + 1] ?? 0;
      const count = piano.beats[index + 2] ?? 0;
      const beat: number[] = [];
      for (let note = first; note < first + count; note++) {
        // No strings or frets off the fretboard's staff.
        expect([piano.notes[note * TRACK_NOTE_STRIDE], piano.notes[note * TRACK_NOTE_STRIDE + 1]]).toEqual([
          0, 0,
        ]);
        beat.push(piano.notes[note * TRACK_NOTE_STRIDE + 2] ?? 0);
      }
      pitches.push(beat.sort((a, b) => a - b));
    }
    expect(staves).toEqual([0, 0, 0, 1, 1, 1]);
    expect(pitches).toEqual([[72, 76, 79], [74, 77, 81], [76, 79, 84], [48], [43], [36]]);
    // A guitar keeps its strings and frets.
    expect(read(collectTrackNotes(keyboard, 2))[0]?.notes).toEqual([
      { string: 6, fret: 0, pitch: 40, flags: 0 },
    ]);
  });
});
