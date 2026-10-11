/**
 * Reading aids (VIEW-009, REND-306, REND-317): note names above the notes, beat counts under them.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { countAt, noteName } from '../src/shared/reading-aids.ts';
import { Engraving, engraveTex, GUITAR, texts } from './engraving.ts';

describe('note names and counts', () => {
  it('names notes, with flats in flat keys and the octave if asked', () => {
    expect(noteName(60, false, true)).toBe('C4');
    expect(noteName(61, false, false)).toBe('C#');
    expect(noteName(61, true, false)).toBe('Db');
    expect(noteName(40, false, true)).toBe('E2');
  });

  it('counts beats, eighths, sixteenths and triplets', () => {
    const quarter = 960;
    expect([0, 480, 960, 1440].map(ticks => countAt(ticks, quarter))).toEqual(['1', '&', '2', '&']);
    expect([240, 720].map(ticks => countAt(ticks, quarter))).toEqual(['e', 'a']);
    expect([320, 640].map(ticks => countAt(ticks, quarter))).toEqual(['trip', 'let']);
    // Nothing finer than sixteenths.
    expect(countAt(120, quarter)).toBe('');
    // In 6/8, eighths are the beats.
    expect([0, 480, 960].map(ticks => countAt(ticks, 480))).toEqual(['1', '2', '3']);
  });
});

describe('reading aids in the score', () => {
  const MELODY = `${GUITAR}\n:8 0.6 2.6 3.6 0.5 2.5 0.4 2.4 4.4 |`;

  it('writes each note’s name above it (VIEW-009, REND-306)', () => {
    const plain = texts(engraveTex(MELODY).marks);
    expect(plain).not.toContain('G');
    const named = texts(engraveTex(MELODY, { readingAids: { noteNames: 'letters', counts: false } }).marks);
    for (const name of ['E', 'F#', 'G', 'A', 'B', 'D']) expect(named).toContain(name);
    const octaves = texts(engraveTex(MELODY, { readingAids: { noteNames: 'octaves', counts: false } }).marks);
    expect(octaves).toContain('E2');
    expect(octaves).toContain('F#3');
  });

  it('names a chord’s notes from the lowest up, and spells flat keys with flats', () => {
    const chord = texts(
      engraveTex(`${GUITAR}\n:2 (0.5 2.4 2.3) (1.5 3.4 3.3) |`, {
        readingAids: { noteNames: 'letters', counts: false },
      }).marks,
    );
    expect(chord).toContain('A·E·A');
    const flat = texts(
      engraveTex('\\track "M"\n\\staff {score}\n\\ks F\n:4 Bb4 Eb4 C4 F4 |', {
        readingAids: { noteNames: 'letters', counts: false },
      }).marks,
    );
    expect(flat).toContain('Bb');
    expect(flat).toContain('Eb');
  });

  it('writes the counts under the notes (REND-317), and gives the score its beats back', () => {
    const score = openScore(new TextEncoder().encode(MELODY), 'melody.atex').score;
    const counted = texts(new Engraving(score, { readingAids: { noteNames: 'off', counts: true } }).marks);
    expect(counted.filter(text => text === '&')).toHaveLength(4);
    for (const count of ['2', '3', '4']) expect(counted).toContain(count);
    const beat = score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[1];
    expect(beat?.lyrics ?? null).toBeNull();
    expect(beat?.text ?? null).toBeNull();
  });
});
