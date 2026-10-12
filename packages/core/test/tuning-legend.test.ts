/**
 * The tuning legend (REND-225): what it says (the name, and the strings when not standard; the
 * name only; the name and every string; or only the strings tuned otherwise), its strings in two
 * columns or on one line, a frame around it, or the strings' names before the tablature of the
 * first system instead.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

/** Drop D, eighteen bars: more than one system. */
function guitar(tuning: string): string {
  const bars = Array.from({ length: 18 }, (_, index) => `${(index % 5) * 2}.6`).join(' | ');
  return ['\\track "Guitar"', '\\staff {score tabs}', `\\tuning (${tuning})`, `:1 ${bars} |`].join('\n');
}
const DROP_D = guitar('E4 B3 G3 D3 A2 D2');
const STANDARD = guitar('E4 B3 G3 D3 A2 E2');

function engrave(tex: string, style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

const header = (view: Engraving): Mark[] => view.marks.filter(mark => mark.partial === 'header');

/** What the legend says: its texts and the strings it lists (1 the highest). */
function legend(view: Engraving) {
  const marks = header(view);
  return {
    texts: marks.filter(mark => mark.kind === 'text').map(mark => mark.name),
    strings: marks
      .filter(mark => mark.kind === 'glyph' && mark.name.startsWith('GuitarString'))
      .map(mark => Number(mark.name.slice('GuitarString'.length))),
  };
}

describe('the tuning legend (REND-225)', () => {
  it('says the name, and every string when the tuning is not standard, as usual', () => {
    expect(legend(engrave(DROP_D))).toEqual({
      texts: ['Guitar Dropped D Tuning', '= E', '= B', '= G', '= D', '= A', '= D'],
      strings: [1, 2, 3, 4, 5, 6],
    });
    expect(legend(engrave(STANDARD)).strings).toEqual([]);
  });

  it('says the name only, the name and every string, or only the strings tuned otherwise', () => {
    expect(legend(engrave(DROP_D, { tuningDetail: 'name' }))).toEqual({
      texts: ['Guitar Dropped D Tuning'],
      strings: [],
    });
    expect(legend(engrave(STANDARD, { tuningDetail: 'all' })).strings).toEqual([1, 2, 3, 4, 5, 6]);
    // The sixth string alone; a standard tuning has nothing to say.
    expect(legend(engrave(DROP_D, { tuningDetail: 'changed' }))).toEqual({ texts: ['= D'], strings: [6] });
    expect(header(engrave(STANDARD, { tuningDetail: 'changed' }))).toEqual([]);
  });

  it('lists the strings in two columns or on one line', () => {
    const rows = (view: Engraving) =>
      new Set(
        header(view)
          .filter(mark => mark.name.startsWith('GuitarString'))
          .map(mark => Math.round(mark.y)),
      ).size;
    const columns = (view: Engraving) =>
      new Set(
        header(view)
          .filter(mark => mark.name.startsWith('GuitarString'))
          .map(mark => Math.round(mark.x)),
      ).size;
    const twoColumns = engrave(DROP_D);
    expect(rows(twoColumns)).toBe(3);
    expect(columns(twoColumns)).toBe(2);
    const oneLine = engrave(DROP_D, { tuningLayout: 'line' });
    expect(rows(oneLine)).toBe(1);
    expect(columns(oneLine)).toBe(6);
  });

  it('draws a frame around the legend on request', () => {
    const frames = (view: Engraving) => header(view).filter(mark => mark.kind === 'rect');
    expect(frames(engrave(DROP_D))).toEqual([]);
    const framed = engrave(DROP_D, { tuningFrame: true });
    const [frame] = frames(framed);
    expect(frame).toBeDefined();
    // Around every mark of the legend.
    for (const mark of header(framed).filter(other => other.kind !== 'rect')) {
      expect(mark.x).toBeGreaterThan(frame?.x ?? 0);
      expect(mark.y).toBeGreaterThan(frame?.y ?? 0);
      expect(mark.y).toBeLessThan((frame?.y ?? 0) + (frame?.height ?? 0));
    }
  });

  it('writes the strings’ names before the tablature of the first system instead', () => {
    const view = engrave(DROP_D, { tuningPlace: 'tab' });
    expect(header(view)).toEqual([]);
    const clefs = view.marks.filter(mark => mark.name === 'SixStringTabClef');
    expect(clefs.length).toBeGreaterThan(1);
    const [first] = clefs;
    const names = view.marks.filter(
      mark => mark.partial === 'system' && mark.kind === 'text' && /^[A-G]$/.test(mark.name),
    );
    // From the highest string down, left of the first system's TAB, each on its line.
    expect(names.map(mark => mark.name)).toEqual(['E', 'B', 'G', 'D', 'A', 'D']);
    for (const mark of names) expect(mark.x + mark.width / 2).toBeLessThan(first?.x ?? 0);
    const ys = names.map(mark => mark.y);
    expect(ys.slice(1).every((y, index) => y > (ys[index] ?? 0))).toBe(true);
    expect(names.every(mark => view.systemOf(mark) === 0)).toBe(true);
  });
});
