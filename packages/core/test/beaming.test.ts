/**
 * Beaming (REND-175): Guitar Pro 8's beaming modes per beat (forced, broken, broken on the
 * secondary beams, stems turned down or up) and custom beaming rules per bar.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { engraveFixture, engraveTex, type Engraving, type Mark } from './engraving.ts';
import { readFixture } from './helpers.ts';

/** The marks of each bar, left to right. */
function byBar(view: Engraving): Mark[][] {
  return view.bars.map(bar =>
    view.marks.filter(mark => mark.partial === 'system' && mark.x >= bar.left && mark.x < bar.right),
  );
}

const beams = (marks: readonly Mark[]) =>
  marks.filter(mark => mark.kind === 'path' && mark.name === 'fill' && mark.commands === 'MLLLz').length;
const flags = (marks: readonly Mark[]) => marks.filter(mark => mark.name.startsWith('Flag')).length;

describe('beaming', () => {
  it('follows the beaming modes of a Guitar Pro file', () => {
    // Bars: auto, force, break, break secondary, invert to down, invert to up.
    const [auto, force, broken, secondary, down, up] = byBar(
      engraveFixture('alphatab/guitarpro8/beaming-mode.gp', { staffDisplay: 'score' }),
    );
    expect(beams(auto ?? [])).toBe(1);
    expect(flags(force ?? [])).toBe(0);
    expect(beams(force ?? [])).toBeGreaterThan(0);
    // Broken beams: every eighth flagged alone.
    expect(beams(broken ?? [])).toBe(0);
    expect(flags(broken ?? [])).toBe(4);
    expect(beams(secondary ?? [])).toBeGreaterThan(beams(auto ?? []));
    // Stems turned: below the noteheads, then above them.
    const stemBelow = (marks: readonly Mark[]) => {
      const head = marks.find(mark => mark.name === 'NoteheadBlack');
      const stems = marks.filter(mark => mark.kind === 'rect' && mark.width < 2 && mark.height > 15);
      const stem = stems.at(-1);
      return head !== undefined && stem !== undefined && stem.y >= head.y;
    };
    expect(stemBelow(down ?? [])).toBe(true);
    expect(stemBelow(up ?? [])).toBe(false);
  });

  it('groups eighths by the bar’s custom beaming rule', () => {
    const eighths = ':8 C5 C5 C5 C5 C5 C5 C5 C5 |';
    const bars = (rule: string) =>
      byBar(engraveTex(`\\track "Melody"\n\\staff {score}\n\\ts (4 4) ${rule} ${eighths}`)).map(beams);
    // A beam is drawn from note to note: a group of n eighths is n − 1 strokes. By the quarter
    // (the default, 4 × 1), then 3 + 3 + 2 (2 + 2 + 1), by the half bar (3 + 3), none at all.
    expect(bars('')).toEqual([4]);
    expect(bars('\\beaming (8 3 3 2)')).toEqual([5]);
    expect(bars('\\beaming (8 4 4)')).toEqual([6]);
    expect(bars('\\beaming (8 1 1 1 1 1 1 1 1)')).toEqual([0]);
  });

  it('reads the custom beaming rules of a Guitar Pro 8 file', () => {
    const score = openScore(readFixture('alphatab/guitarpro8/custom-beaming.gp'), 'custom-beaming.gp').score;
    const rules = score.masterBars.flatMap(bar =>
      bar.beamingRules === undefined ? [] : [[...bar.beamingRules.groups]],
    );
    expect(rules.length).toBeGreaterThan(0);
  });
});
