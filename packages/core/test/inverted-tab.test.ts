/**
 * The tablature the other way up (REND-315): the lowest string on top, as a player looking down
 * at the neck sees it; the strings' names, stems, ties and their H, and strum arrows follow.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

/** Each string open from the lowest, a strum down all six, and a hammer-on on the lowest. */
const TEX = [
  '\\track "Guitar"',
  '\\staff {tabs}',
  '\\tuning (E4 B3 G3 D3 A2 E2)',
  ':8 0.6 3.5 2.4 0.3 1.2 0.1 (0.6 2.5 2.4 1.3 0.2 0.1){bd} 3.6{h} 5.6 |',
].join('\n');

function engrave(invertedTab: boolean): Engraving {
  // The strings' names before the tablature, to see their order.
  return engraveTex(TEX, { invertedTab, style: { ...DEFAULT_SCORE_STYLE, tuningPlace: 'tab' } });
}

const system = (view: Engraving): Mark[] => view.marks.filter(mark => mark.partial === 'system');
/** The strings' names at the start, top down. */
const names = (view: Engraving) =>
  system(view)
    .filter(mark => mark.kind === 'text' && /^[A-G]$/.test(mark.name))
    .sort((a, b) => a.y - b.y)
    .map(mark => mark.name);
/** The staff lines' heights, whole or broken around fret numbers. */
const lines = (view: Engraving) =>
  system(view)
    .filter(mark => mark.kind === 'rect' && mark.height < 2 && mark.width > 5)
    .map(mark => mark.y);
/** The frets of the first six beats, one per string from the lowest, by height (on the lines). */
const heights = (view: Engraving) => {
  const top = Math.min(...lines(view)) - 2;
  const bottom = Math.max(...lines(view)) + 2;
  return system(view)
    .filter(mark => mark.kind === 'text' && /^\d$/.test(mark.name) && mark.y > top && mark.y < bottom)
    .sort((a, b) => a.x - b.x)
    .slice(0, 6)
    .map(mark => mark.y);
};

describe('the tablature the other way up (REND-315)', () => {
  it('puts the lowest string on top, its name too', () => {
    expect(names(engrave(false))).toEqual(['E', 'B', 'G', 'D', 'A', 'E']);
    expect(names(engrave(true))).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    // From the lowest string up: going up the page as usual, down it inverted.
    const usual = heights(engrave(false));
    const inverted = heights(engrave(true));
    expect(usual.every((y, index) => index === 0 || y < (usual[index - 1] ?? 0))).toBe(true);
    expect(inverted.every((y, index) => index === 0 || y > (inverted[index - 1] ?? 0))).toBe(true);
  });

  it('turns the strum’s arrow and the lowest string’s hammer-on with the strings', () => {
    const arrows = (view: Engraving) =>
      system(view).filter(mark => mark.kind === 'path' && mark.commands === 'MLLz');
    const slur = (view: Engraving) =>
      system(view).find(mark => mark.kind === 'path' && mark.commands === 'MCCz');
    const h = (view: Engraving) => system(view).find(mark => mark.kind === 'text' && mark.name === 'H');
    const usual = engrave(false);
    const inverted = engrave(true);
    const middle = (view: Engraving) => (Math.min(...lines(view)) + Math.max(...lines(view))) / 2;
    // A strum down, from the lowest string to the highest: its arrow at the top as usual, at the
    // bottom inverted.
    expect(arrows(usual)[0]?.y).toBeLessThan(middle(usual));
    expect(arrows(inverted)[0]?.y).toBeGreaterThan(middle(inverted));
    // The lowest string's hammer-on: under the tablature as usual, over it inverted, H with it.
    expect(slur(usual)?.y).toBeGreaterThan(middle(usual));
    expect(slur(inverted)?.y).toBeLessThan(middle(inverted));
    expect(h(usual)?.y).toBeGreaterThan(middle(usual));
    expect(h(inverted)?.y).toBeLessThan(middle(inverted));
  });
});
