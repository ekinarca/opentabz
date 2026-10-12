/**
 * The chord builder (EDIT-040, EDIT-041, EDIT-134 … EDIT-141): names as Guitar Pro writes them,
 * tones, inversions, voicings on a guitar's strings with their barres, and chords recognised from
 * notes.
 */
import { describe, expect, it } from 'vitest';
import {
  autoBarres,
  chordIntervals,
  chordName,
  chordTones,
  chordVoicings,
  firstFretOf,
  inversionBasses,
  plainChord,
  recognizeChord,
  voicingPitches,
  type ChordSpec,
} from '../src/shared/chord-builder.ts';

const GUITAR = [64, 59, 55, 50, 45, 40];

function chord(spec: Partial<ChordSpec> & Pick<ChordSpec, 'root'>): ChordSpec {
  return { ...plainChord(spec.root), ...spec };
}

describe('chord names and tones (EDIT-134 … EDIT-139)', () => {
  it('names chords as Guitar Pro writes them', () => {
    expect(chordName(plainChord('C'))).toBe('C');
    expect(chordName(chord({ root: 'A', quality: 'minor', extension: '7' }))).toBe('Am7');
    expect(chordName(chord({ root: 'G', extension: '7', ninth: 'flat' }))).toBe('G7b9');
    expect(chordName(chord({ root: 'C', quality: 'diminished', extension: '7' }))).toBe('Cm7b5');
    expect(chordName(chord({ root: 'C', quality: 'diminished', extension: 'dim7' }))).toBe('Cdim7');
    expect(chordName(chord({ root: 'D', quality: 'sus4' }))).toBe('Dsus4');
    expect(chordName(chord({ root: 'E', quality: 'power' }))).toBe('E5');
    expect(chordName(chord({ root: 'C', extension: 'add9' }))).toBe('Cadd9');
    expect(chordName(chord({ root: 'C', quality: 'minor', extension: 'maj7' }))).toBe('Cm(maj7)');
    expect(chordName(chord({ root: 'C', fifth: 'flat' }))).toBe('C(b5)');
    expect(chordName(chord({ root: 'F#', extension: '13', eleventh: 'sharp' }))).toBe('F#13#11');
    expect(chordName(chord({ root: 'C', extension: '7', omit: ['third'] }))).toBe('C7(no3)');
    expect(chordName(chord({ root: 'A', quality: 'minor', extension: '7', bass: 'G' }))).toBe('Am7/G');
  });

  it('builds the tones from the triad, extensions and alterations, less those left out', () => {
    expect(chordIntervals(chord({ root: 'C', extension: '7' }))).toEqual([0, 4, 7, 10]);
    expect(chordIntervals(chord({ root: 'C', quality: 'diminished', extension: '7' }))).toEqual([
      0, 3, 6, 10,
    ]);
    expect(chordIntervals(chord({ root: 'C', extension: '9', ninth: 'sharp' }))).toEqual([0, 4, 7, 10, 15]);
    // An altered ninth on a seventh chord without one is put in.
    expect(chordIntervals(chord({ root: 'C', extension: '7', ninth: 'flat' }))).toEqual([0, 4, 7, 10, 13]);
    expect(chordIntervals(chord({ root: 'C', extension: '13', thirteenth: 'flat' }))).toEqual([
      0, 4, 7, 10, 14, 17, 20,
    ]);
    expect(chordIntervals(chord({ root: 'C', omit: ['fifth'] }))).toEqual([0, 4]);
    expect(chordTones(chord({ root: 'Bb', extension: '7' }))).toEqual([10, 2, 5, 8]);
  });

  it('offers the chord’s tones for its inversions (EDIT-138)', () => {
    expect(inversionBasses(plainChord('C'))).toEqual(['C', 'E', 'G']);
    expect(inversionBasses(chord({ root: 'C', extension: '7' }))).toEqual(['C', 'E', 'G', 'Bb']);
  });
});

describe('voicings and barres (EDIT-040, EDIT-141)', () => {
  it('finds a chord’s shapes on the strings, its bass the lowest note, every tone it needs', () => {
    const shapes = chordVoicings(plainChord('C'), GUITAR);
    expect(shapes.slice(0, 3).map(shape => shape.strings)).toContainEqual([0, 1, 0, 2, 3, -1]);
    for (const shape of shapes) {
      const pitches = voicingPitches(shape, GUITAR);
      expect((pitches[0] ?? 0) % 12).toBe(0);
      // The root and the third, the fifth if it can.
      const classes = new Set(pitches.map(pitch => pitch % 12));
      expect([0, 4].every(tone => classes.has(tone))).toBe(true);
      expect([...classes].every(tone => [0, 4, 7].includes(tone))).toBe(true);
    }
    expect(
      shapes.slice(0, 8).every(shape => voicingPitches(shape, GUITAR).some(pitch => pitch % 12 === 7)),
    ).toBe(true);
    // E major: the open shape first.
    expect(chordVoicings(plainChord('E'), GUITAR)[0]?.strings).toEqual([0, 0, 1, 2, 2, 0]);
    // F major: the barre on the first fret.
    expect(chordVoicings(plainChord('F'), GUITAR)[0]).toEqual({
      strings: [1, 1, 2, 3, 3, 1],
      firstFret: 1,
      barres: [1],
    });
    // C over E: the low E string's open note in the bass.
    const slash = chordVoicings(chord({ root: 'C', bass: 'E' }), GUITAR);
    expect(slash.length).toBeGreaterThan(0);
    for (const shape of slash) expect((voicingPitches(shape, GUITAR)[0] ?? 0) % 12).toBe(4);
  });

  it('holds a barre where one finger can, and starts the diagram where the shape is', () => {
    expect(autoBarres([1, 1, 2, 3, 3, 1])).toEqual([1]);
    expect(autoBarres([3, 5, 5, 5, 3, -1])).toEqual([3]);
    expect(autoBarres([0, 1, 0, 2, 3, -1])).toEqual([]);
    // An open string between the lowest frets: no barre.
    expect(autoBarres([2, 0, 2, -1, -1, -1])).toEqual([]);
    expect(firstFretOf([8, 10, 10, 9, 8, 8])).toBe(8);
    expect(firstFretOf([0, 1, 0, 2, 3, -1])).toBe(1);
  });
});

describe('chords recognised from notes (EDIT-041)', () => {
  it('names the chord the notes make, as plainly as can be', () => {
    const name = (pitches: number[]) => {
      const found = recognizeChord(pitches);
      return found === null ? null : chordName(found);
    };
    expect(name([48, 52, 55])).toBe('C');
    expect(name([57, 60, 64, 67])).toBe('Am7');
    expect(name([52, 60, 64, 67])).toBe('C/E');
    expect(name([43, 47, 50, 53])).toBe('G7');
    expect(name([60, 63, 66])).toBe('Cdim');
    expect(name([60, 62, 67])).toBe('Csus2');
    expect(name([40, 47, 52])).toBe('E5');
    expect(name([40])).toBeNull();
  });
});
