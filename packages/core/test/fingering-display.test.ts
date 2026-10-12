/**
 * Fingering as the stylesheet asks (REND-252): the left hand's thumb as t, T or p; the right
 * hand's fingers p i m a c, p i m a x, p i m a e or t i m a o; before the notes, above or below
 * the staff, and above or below the tablature, a row of fingers per note stacked as the notes
 * are; at the size asked.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, GUITAR, type Engraving, type Mark } from './engraving.ts';

/**
 * A chord fingered thumb, middle and ring from the lowest string; an index; a little finger of
 * both hands; a right-hand thumb.
 */
const TEX = `${GUITAR}\n:4 (0.6{lf 1} 2.5{lf 3} 2.4{lf 4}) 3.5{rf 2} 5.4{lf 5 rf 5} 0.3{rf 1} |`;

function engrave(style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(TEX, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

const fingering = (view: Engraving): Mark[] =>
  view.marks.filter(mark => mark.partial === 'system' && mark.name.startsWith('Fingering'));
const names = (view: Engraving) => fingering(view).map(mark => mark.name);

/** Each staff's top and bottom lines, top down (whole or broken lines). */
function staves(view: Engraving): [number, number][] {
  const ys = [
    ...new Set(
      view.marks
        .filter(
          mark => mark.partial === 'system' && mark.kind === 'rect' && mark.height < 2 && mark.width > 5,
        )
        .map(mark => Math.round(mark.y * 10) / 10),
    ),
  ].sort((a, b) => a - b);
  const found: [number, number][] = [];
  for (const y of ys) {
    const last = found.at(-1);
    if (last !== undefined && y - last[1] < 20) last[1] = y;
    else found.push([y, y]);
  }
  return found;
}

describe('fingering as the stylesheet asks (REND-252)', () => {
  it('labels the thumbs and little fingers as asked', () => {
    const usual = names(engrave());
    expect(usual).toEqual(expect.arrayContaining(['FingeringTLower', 'FingeringCLower', 'FingeringPLower']));
    const capital = names(engrave({ leftHandFingerLabels: 'T1234', rightHandFingerLabels: 'pimax' }));
    expect(capital).toContain('FingeringTUpper');
    expect(capital).not.toContain('FingeringTLower');
    expect(capital).toContain('FingeringXLower');
    expect(capital).not.toContain('FingeringCLower');
    expect(
      names(engrave({ leftHandFingerLabels: 'p1234' })).filter(name => name === 'FingeringPLower'),
    ).toHaveLength(2);
    expect(names(engrave({ rightHandFingerLabels: 'pimae' }))).toContain('FingeringELower');
    // t i m a o: the right hand's thumb a t, its little finger an o.
    const timao = names(engrave({ rightHandFingerLabels: 'timao' }));
    expect(timao).toContain('FingeringOLower');
    expect(timao).not.toContain('FingeringPLower');
    expect(timao.filter(name => name === 'FingeringTLower')).toHaveLength(2);
  });

  it('stacks the fingering above or below the staff, as the notes are', () => {
    const above = engrave({ fingeringPosition: 'above' });
    const [staff] = staves(above);
    expect(fingering(above)).toHaveLength(7);
    for (const mark of fingering(above)) expect(mark.y).toBeLessThan(staff?.[0] ?? 0);
    // The chord's: the ring finger's on the highest note on top, the thumb's at the bottom.
    const chord = fingering(above)
      .filter(mark => mark.x < (fingering(above).find(other => other.name === 'FingeringILower')?.x ?? 0))
      .sort((a, b) => a.y - b.y)
      .map(mark => mark.name);
    expect(chord).toEqual(['Fingering3', 'Fingering2', 'FingeringTLower']);
    const below = engrave({ fingeringPosition: 'below' });
    const [score, tab] = staves(below);
    for (const mark of fingering(below)) {
      expect(mark.y).toBeGreaterThan(score?.[1] ?? 0);
      expect(mark.y).toBeLessThan(tab?.[0] ?? 0);
    }
  });

  it('writes the fingering above or below the tablature too, on request', () => {
    const view = engrave({ fingeringPosition: 'above', tabFingeringPosition: 'below' });
    const [score, tab] = staves(view);
    expect(fingering(view).filter(mark => mark.y < (score?.[0] ?? 0))).toHaveLength(7);
    expect(fingering(view).filter(mark => mark.y > (tab?.[1] ?? 0))).toHaveLength(7);
  });

  it('draws the fingering at the size asked', () => {
    const usual = fingering(engrave());
    const larger = fingering(engrave({ fingeringSize: 1.5 }));
    expect(larger.map(mark => mark.name)).toEqual(usual.map(mark => mark.name));
    larger.forEach((mark, index) => {
      expect(mark.width).toBeCloseTo((usual[index]?.width ?? 0) * 1.5, 1);
    });
  });
});
