/**
 * What the stylesheet shows or leaves out (REND-207, REND-210), and transposing instruments
 * written at concert pitch or as their parts read (REND-032).
 */
import { describe, expect, it } from 'vitest';
import { readScoreStyle } from '../src/render/style.ts';
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

  it('writes tempo marks with their decimals, or rounded (REND-240)', () => {
    const tex = `\\tempo 92.5\n${GUITAR}\n:4 0.6 0.6 0.6 0.6 | \\tempo 120.25 0.6 0.6 0.6 0.6 |`;
    const tempos = (view: Engraving) => texts(view.marks).filter(text => text.startsWith('= '));
    expect(tempos(engraveTex(tex))).toEqual(['= 92.5', '= 120.25']);
    const rounded = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tempoDecimals: false } });
    expect(tempos(rounded)).toEqual(['= 93', '= 120']);
    // The music plays at the tempo written all the same.
    expect(rounded.score.masterBars[0]?.tempoAutomations[0]?.value).toBe(92.5);
  });

  it('shows or hides lyrics', () => {
    const hidden = engraveFixture('alphatex/views/lyrics.atex', {
      style: { ...DEFAULT_SCORE_STYLE, lyrics: false },
    });
    expect(texts(hidden.marks)).not.toContain('Morn-');
  });
});

describe('the stylesheet’s notation switches (REND-248)', () => {
  const PIANO = '\\track "Piano"\n\\staff {score}';

  it('writes 4/4 and 2/2 as C and cut C, or in numbers, as asked', () => {
    const tex = `${PIANO}\n\\ts (4 4)\n:4 C4 C4 C4 C4 | \\ts (2 2) :2 C4 C4 | \\ts (3 4) :4 C4 C4 C4 |`;
    const signs = (view: Engraving) => glyphs(view.marks).filter(name => name.startsWith('TimeSig'));
    expect(signs(engraveTex(tex))).toEqual([
      'TimeSig4',
      'TimeSig4',
      'TimeSig2',
      'TimeSig2',
      'TimeSig3',
      'TimeSig4',
    ]);
    const symbols = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, commonTime: true } });
    expect(signs(symbols)).toEqual(['TimeSigCommon', 'TimeSigCutCommon', 'TimeSig3', 'TimeSig4']);
    // The score keeps what it was given.
    expect(symbols.score.masterBars.map(bar => bar.timeSignatureCommon)).toEqual([false, false, false]);
    // A file that writes C keeps it, unless the stylesheet says numbers.
    const written = `${PIANO}\n\\ts common\n:4 C4 C4 C4 C4 |`;
    expect(signs(engraveTex(written))).toEqual(['TimeSigCommon']);
    const numbers = engraveTex(written, { style: { ...DEFAULT_SCORE_STYLE, commonTime: false } });
    expect(readScoreStyle(numbers.score).commonTime).toBe(true);
    expect(signs(numbers)).toEqual(['TimeSig4', 'TimeSig4']);
  });

  it('writes the pitch a bend reaches, or only the note played', () => {
    const tex = ':4 7.3{b (0 4)} 7.3 7.3 7.3 |';
    const heads = (view: Engraving) => glyphs(view.marks).filter(name => name === 'NoteheadBlack').length;
    const reached = engraveTex(tex);
    const played = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, bentPitch: false } });
    // The bent note's target, a small note after it, is left out.
    expect(heads(played)).toBe(4);
    expect(heads(reached)).toBeGreaterThan(4);
  });

  it('leaves out the rests of voices 2 to 4 on request, and keeps the first voice’s', () => {
    const tex = `${PIANO}\n\\voice\n:4 C5 D5 r F5 |\n\\voice\n:4 r r C4 r |`;
    const rests = (view: Engraving) => glyphs(view.marks).filter(name => name.startsWith('Rest')).length;
    expect(rests(engraveTex(tex))).toBe(4);
    const hidden = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, hideExtraRests: true } });
    expect(rests(hidden)).toBe(1);
    expect(hidden.score.tracks[0]?.staves[0]?.bars[0]?.voices[1]?.beats.some(beat => beat.isEmpty)).toBe(
      false,
    );
  });

  it('brackets tuplets, or writes their numbers alone', () => {
    const tex = `${PIANO}\n:8 C5{tu 3} r{tu 3} E5{tu 3} :4 C5 C5 C5 |`;
    const brackets = (view: Engraving) =>
      view.marks.filter(mark => mark.kind === 'path' && mark.name === 'stroke' && mark.commands === 'MLLMLL')
        .length;
    const bracketed = engraveTex(tex);
    const bare = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tupletBrackets: false } });
    expect(brackets(bracketed)).toBe(1);
    expect(brackets(bare)).toBe(0);
    expect(glyphs(bare.marks)).toContain('Tuplet3');
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
