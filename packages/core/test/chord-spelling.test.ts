import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { readScoreStyle } from '../src/render/style.ts';
import { readChordName, spellChord } from '../src/shared/chord-spelling.ts';
import { Engraving, texts } from './engraving.ts';
import { readFixture } from './helpers.ts';

describe('chord-symbol spelling (REND-226)', () => {
  it('reads root, quality and bass however the name was written', () => {
    expect(readChordName('F#m7b5/C')).toEqual({ root: 'F#', quality: 'm7b5', suffix: 'm7b5', bass: 'C' });
    expect(readChordName('BbΔ7')?.quality).toBe('maj7');
    expect(readChordName('E♭-7')).toMatchObject({ root: 'Eb', quality: 'm7' });
    expect(readChordName('A7sus4')).toMatchObject({ root: 'A', quality: null, suffix: '7sus4' });
    expect(readChordName('N.C.')).toBeNull();
    expect(readChordName('')).toBeNull();
  });

  it('spells the same chords in a classic, jazz or rock style', () => {
    const chords = ['C', 'Am', 'Gmaj7', 'Dm7', 'Bm7b5', 'Edim7', 'Faug', 'Cm(maj7)', 'Am6/C'];
    expect(chords.map(chord => spellChord(chord, 'classic'))).toEqual([
      'C',
      'Am',
      'Gmaj7',
      'Dm7',
      'Bm7b5',
      'Edim7',
      'Faug',
      'Cm(maj7)',
      'Am6/C',
    ]);
    expect(chords.map(chord => spellChord(chord, 'jazz'))).toEqual([
      'C',
      'A-',
      'GΔ7',
      'D-7',
      'Bø7',
      'E°7',
      'F+',
      'C-Δ7',
      'A-6/C',
    ]);
    expect(chords.map(chord => spellChord(chord, 'rock'))).toEqual([
      'C',
      'Am',
      'GM7',
      'Dm7',
      'Bm7(b5)',
      'Edim7',
      'F+',
      'CmM7',
      'Am6/C',
    ]);
  });

  it('keeps names as written, and what it cannot read', () => {
    expect(spellChord('Gmaj7', 'written')).toBe('Gmaj7');
    expect(spellChord('A7sus4', 'jazz')).toBe('A7sus4');
    expect(spellChord('N.C.', 'rock')).toBe('N.C.');
  });
});

describe('chord names engraved in a style', () => {
  it('writes the chords of the score in the chosen style, and gives the score its names back', () => {
    const score = openScore(readFixture('alphatab/guitarpro7/chords.gp'), 'chords.gp').score;
    const style = readScoreStyle(score);
    expect(texts(new Engraving(score, { style }).marks)).toContain('Cm');
    const jazz = texts(new Engraving(score, { style: { ...style, chordSpelling: 'jazz' } }).marks);
    expect(jazz).toContain('C-');
    expect(jazz).toContain('D-');
    expect(jazz).not.toContain('Cm');
    const names = score.tracks.flatMap(track =>
      track.staves.flatMap(staff => [...(staff.chords?.values() ?? [])].map(chord => chord.name)),
    );
    expect(names).toContain('Cm');
  });
});
