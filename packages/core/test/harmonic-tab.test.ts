/**
 * Artificial harmonics in the tablature (REND-247): where each is touched after its fret
 * (`5 <17>`), or not; one touched an octave up written as its fret and a dot (`5.`) on request.
 * Natural harmonics are written as before.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, GUITAR } from './engraving.ts';

/** An artificial harmonic an octave up, one a fifth further (seven frets), a natural one. */
const TEX = `${GUITAR}\n:4 5.3{ah 12} 5.2{ah 7} 12.1{nh} r |`;

function tabTexts(style: Partial<ScoreStyle> = {}): string[] {
  const view = engraveTex(TEX, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
  return view.marks
    .filter(mark => mark.kind === 'text' && mark.partial === 'system' && /^[<\d]/.test(mark.name))
    .map(mark => mark.name);
}

describe('artificial harmonics in the tablature (REND-247)', () => {
  it('writes where each is touched after its fret, as usual', () => {
    const written = tabTexts();
    expect(written).toEqual(expect.arrayContaining(['5', '<17>']));
    // The fifth above's touch, and the natural harmonic.
    expect(written.filter(text => text === '<12>')).toHaveLength(2);
  });

  it('leaves out where they are touched on request, natural harmonics as before', () => {
    const written = tabTexts({ harmonicTouch: false });
    expect(written).not.toContain('<17>');
    expect(written.filter(text => text === '5')).toHaveLength(2);
    // Only the natural harmonic at the twelfth fret.
    expect(written.filter(text => text === '<12>')).toHaveLength(1);
  });

  it('writes one touched an octave up as its fret and a dot, on request', () => {
    const written = tabTexts({ octaveHarmonicDot: true });
    expect(written).toContain('5.');
    expect(written).not.toContain('<17>');
    // The fifth above keeps its touch.
    expect(written).toContain('5');
    expect(written.filter(text => text === '<12>')).toHaveLength(2);
  });
});
