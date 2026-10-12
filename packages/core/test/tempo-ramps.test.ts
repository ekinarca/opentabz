/**
 * Tempo ramps written as Guitar Pro 8 writes them (REND-156): a linear tempo automation, which
 * changes the tempo gradually up to the next one (PLAY-023), is marked accel. when it speeds up and
 * rit. when it slows down, after its tempo; a tempo that holds is not marked.
 */
import { describe, expect, it } from 'vitest';
import { rampScore } from '../scripts/fixtures.ts';
import { Engraving } from './engraving.ts';

/** Each text among `names` drawn, with the bar it starts in. */
function marks(view: Engraving, names: readonly string[]): [string, number][] {
  return view.marks
    .filter(mark => mark.kind === 'text' && names.includes(mark.name.trim()))
    .map(mark => {
      const system = view.systemOf(mark);
      const bar = view.bars.find(
        place => place.system === system && mark.x >= place.left - 1 && mark.x < place.right,
      );
      return [mark.name.trim(), bar?.index ?? -1];
    });
}

describe('tempo ramps (REND-156)', () => {
  it('marks a ramp accel. or rit. by where it goes, after its tempo', () => {
    const view = new Engraving(rampScore());
    expect(marks(view, ['accel.', 'rit.'])).toEqual([
      ['accel.', 1],
      ['rit.', 4],
    ]);
    // Each just after its own tempo mark, on its line: 90 in bar 2, 150 in bar 5.
    const text = (name: string, bar: number) =>
      view.marks.find(
        mark =>
          mark.kind === 'text' &&
          mark.name.trim() === name &&
          view.bars.some(
            place =>
              place.index === bar &&
              place.system === view.systemOf(mark) &&
              mark.x >= place.left - 1 &&
              mark.x < place.right,
          ),
      );
    for (const [ramp, tempo, bar] of [
      ['accel.', '= 90', 1],
      ['rit.', '= 150', 4],
    ] as const) {
      const before = text(tempo, bar);
      const after = text(ramp, bar);
      expect(before, tempo).toBeDefined();
      expect(after, ramp).toBeDefined();
      if (before === undefined || after === undefined) continue;
      // To its right, close (the helper's text widths are estimates), on the same line.
      expect(after.x).toBeGreaterThan(before.x + before.width / 2);
      expect(after.x - before.x).toBeLessThan(80);
      expect(Math.abs(after.y + after.height - (before.y + before.height))).toBeLessThan(4);
    }
  });

  it('leaves a held tempo unmarked', () => {
    const score = rampScore();
    for (const bar of score.masterBars)
      for (const automation of bar.tempoAutomations) automation.isLinear = false;
    expect(marks(new Engraving(score), ['accel.', 'rit.'])).toEqual([]);
  });
});
