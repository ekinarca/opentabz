/**
 * The rhythm in the tablature (REND-244): shown without a staff above it, always or never; its
 * stems from the fret numbers through the staff or outside it; each voice's rhythm below, above
 * or nowhere.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

/** Two voices on a tablature: eighths and quarters on the B string, quarters and a half below. */
const BODY = [
  '\\tuning (E4 B3 G3 D3 A2 E2)',
  '\\voice',
  ':8 5.2 7.2 (5.2 5.3) 7.2 :4 5.1 5.1 |',
  '\\voice',
  ':4 0.6 3.5 :2 0.6 |',
].join('\n');
const TAB = `\\track "Guitar"\n\\staff {tabs}\n${BODY}`;
const BOTH = `\\track "Guitar"\n\\staff {score tabs}\n${BODY}`;

function engrave(tex: string, style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

/** The tablature's lines, top and bottom, and its stems (thin and tall, inside the bar). */
function tab(view: Engraving) {
  const marks = view.marks.filter(mark => mark.partial === 'system');
  const lines = marks
    .filter(mark => mark.kind === 'rect' && mark.width > 100 && mark.height < 3)
    .map(mark => mark.y);
  const top = Math.min(...lines);
  const bottom = Math.max(...lines);
  // Barlines run from the first line to the last; stems are the other thin rules.
  const barline = (mark: Mark) => Math.abs(mark.y - top) < 1 && Math.abs(mark.y + mark.height - bottom) < 3;
  const stems = marks.filter(
    (mark: Mark) => mark.kind === 'rect' && mark.width < 2 && mark.height > 2 && !barline(mark),
  );
  return { top, bottom, stems };
}

describe('the rhythm in the tablature (REND-244)', () => {
  it('shows the rhythm without a staff above it, always, or never', () => {
    expect(tab(engrave(TAB)).stems.length).toBeGreaterThan(0);
    expect(tab(engrave(TAB, { tabRhythm: 'never' })).stems).toEqual([]);
    // Under a staff: only when asked.
    const withStaff = tab(engrave(BOTH)).stems.length;
    expect(tab(engrave(BOTH, { tabRhythm: 'always' })).stems.length).toBeGreaterThan(withStaff);
  });

  it('starts the stems at the fret numbers, or under the tablature', () => {
    const inside = tab(engrave(TAB));
    expect(inside.stems.some(stem => stem.y < inside.bottom)).toBe(true);
    const outside = tab(engrave(TAB, { tabStemsInside: false }));
    expect(outside.stems.length).toBeGreaterThan(0);
    for (const stem of outside.stems) expect(stem.y).toBeGreaterThan(outside.bottom);
  });

  it('puts each voice’s rhythm below, above or nowhere', () => {
    const usual = tab(engrave(TAB));
    // Voice 2's three stems over the tablature, voice 1's six under it.
    const above = tab(engrave(TAB, { tabRhythmVoices: ['below', 'above', 'below', 'below'] }));
    expect(above.stems.filter(stem => stem.y < above.top)).toHaveLength(3);
    expect(above.stems.filter(stem => stem.y + stem.height > above.bottom + 1)).toHaveLength(6);
    const outside = tab(
      engrave(TAB, { tabRhythmVoices: ['below', 'above', 'below', 'below'], tabStemsInside: false }),
    );
    expect(outside.stems.filter(stem => stem.y + stem.height < outside.top)).toHaveLength(3);
    expect(outside.stems.filter(stem => stem.y > outside.bottom)).toHaveLength(6);
    // Without voice 2's rhythm: its three stems gone.
    const none = tab(engrave(TAB, { tabRhythmVoices: ['below', 'none', 'below', 'below'] }));
    expect(usual.stems.length - none.stems.length).toBe(3);
  });
});
