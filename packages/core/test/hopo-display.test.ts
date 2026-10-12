/**
 * Hammer-ons and pull-offs as the stylesheet asks (REND-251): "H" and "P" written over their
 * slurs or not; in the tablature, a chord's slurs merged over its outer notes or one per note.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, texts, type Engraving } from './engraving.ts';

const TAB = '\\track "Guitar"\n\\staff {tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)\n';

function engrave(body: string, style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(`${TAB}${body}`, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

/** The tablature's slurs: the curves it draws. */
function slurs(view: Engraving): number {
  return view.marks.filter(mark => mark.partial === 'system' && mark.kind === 'path').length;
}

describe('hammer-ons and pull-offs as the stylesheet asks (REND-251)', () => {
  it('writes H and P over their slurs, or leaves them out', () => {
    const body = ':4 5.3{h} 7.3 7.3{h} 5.3 |';
    const letters = (view: Engraving) => texts(view.marks).filter(text => text === 'H' || text === 'P');
    expect(letters(engrave(body))).toEqual(['H', 'P']);
    const without = engrave(body, { hopoLetters: false });
    expect(letters(without)).toEqual([]);
    // The slurs stay.
    expect(slurs(without)).toBe(slurs(engrave(body)));
  });

  it('slurs a chord over its outer notes, or every note of it', () => {
    // Three strings hammered on at once, all slurred above.
    const body = ':4 (5.1{h} 5.2{h} 5.3{h}) (7.1 7.2 7.3) :2 r |';
    expect(slurs(engrave(body))).toBe(1);
    expect(slurs(engrave(body, { tabSlursOnOuterNotes: false }))).toBe(3);
  });
});
