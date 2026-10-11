/**
 * What the stylesheet shows or leaves out (REND-207, REND-210), and transposing instruments
 * written at concert pitch or as their parts read (REND-032).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import { engraveFixture, engraveTex, glyphs, GUITAR, texts, type Engraving } from './engraving.ts';

function count(view: Engraving, name: string): number {
  return glyphs(view.marks).filter(glyph => glyph === name).length;
}

describe('notation shown or left out', () => {
  it('leaves the bracketed comments of lyrics out of the score (REND-207)', () => {
    const written = texts(engraveFixture('alphatex/views/lyrics.atex').marks);
    expect(written).toContain('Morn-');
    expect(written.some(text => /Verse|Chorus|\[/.test(text))).toBe(false);
  });

  it('shows or hides tempo marks (REND-210)', () => {
    const tex = `\\tempo 120\n${GUITAR}\n:4 0.6 0.6 0.6 0.6 | \\tempo 90 0.6 0.6 0.6 0.6 |`;
    expect(count(engraveTex(tex), 'MetNoteQuarterUp')).toBe(2);
    const hidden = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tempoMarks: false } });
    expect(count(hidden, 'MetNoteQuarterUp')).toBe(0);
    expect(texts(hidden.marks).some(text => text.includes('= 90'))).toBe(false);
  });

  it('shows or hides lyrics', () => {
    const hidden = engraveFixture('alphatex/views/lyrics.atex', {
      style: { ...DEFAULT_SCORE_STYLE, lyrics: false },
    });
    expect(texts(hidden.marks)).not.toContain('Morn-');
  });
});

describe('transposing instruments (REND-032)', () => {
  // A B♭ clarinet's part is written a whole tone above what sounds: C major sounds, D major reads.
  const clarinet = [
    '\\track "Clarinet"',
    '\\staff {score}',
    '\\displaytranspose 2',
    '\\ks C',
    ':4 C4 D4 E4 F4 | G4 A4 B4 C5 |',
  ].join('\n');

  it('writes the part as it reads, or at concert pitch', () => {
    const written = engraveTex(clarinet);
    const concert = engraveTex(clarinet, { concertPitch: true });
    // D major: two sharps in the key signature (and none needed in concert C).
    expect(count(written, 'AccidentalSharp')).toBeGreaterThanOrEqual(2);
    expect(count(concert, 'AccidentalSharp')).toBe(0);
    // The notes themselves sit a step higher in the part.
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    const [firstWritten] = heads(written);
    const [firstConcert] = heads(concert);
    expect((firstWritten ?? 0) < (firstConcert ?? 0)).toBe(true);
  });

  it('keeps the octave an instrument reads in, a guitar’s', () => {
    // A guitar's part reads an octave above what sounds: that stays at concert pitch.
    const guitar = `${GUITAR}\n\\displaytranspose -12\n:4 0.6 2.5 2.4 0.3 |`;
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    expect(heads(engraveTex(guitar, { concertPitch: true }))).toEqual(heads(engraveTex(guitar)));
  });

  it('writes every transposing track of a Guitar Pro file at concert pitch', () => {
    const path = 'alphatab/guitarpro8/transposition-tonality-a.gp';
    const tracks = [0, 1, 2, 3, 4, 5];
    const written = engraveFixture(path, { trackIndexes: tracks });
    const concert = engraveFixture(path, { trackIndexes: tracks, concertPitch: true });
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    expect(heads(concert)).not.toEqual(heads(written));
  });
});
