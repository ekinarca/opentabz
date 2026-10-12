/**
 * Beams over rests and circled long notes in the tablature (REND-245): sixteenths beamed over a
 * rest within their group, or the rest ending the beam; half and whole notes circled on request
 * when the tablature shows the rhythm.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

const BODY = [
  '\\tuning (E4 B3 G3 D3 A2 E2)',
  ':16 5.2 r 7.2 5.2 :8 5.3 5.3 :4 5.4 :2 7.4 |',
  ':1 5.5 |',
].join('\n');
const TAB = `\\track "Guitar"\n\\staff {tabs}\n${BODY}`;
const BOTH = `\\track "Guitar"\n\\staff {score tabs}\n${BODY}`;

function engrave(tex: string, style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

const system = (view: Engraving): Mark[] => view.marks.filter(mark => mark.partial === 'system');
/** Beams: filled four-sided paths. */
const beams = (view: Engraving) =>
  system(view).filter(mark => mark.kind === 'path' && mark.commands === 'MLLLz');
/** Circles: stroked paths of two arcs. */
const circles = (view: Engraving) =>
  system(view).filter(mark => mark.kind === 'path' && mark.commands === 'MAAz');

describe('beams over rests and circled long notes in the tablature (REND-245)', () => {
  it('beams sixteenths over a rest within their group, or lets the rest end the beam', () => {
    const over = engrave(TAB);
    // One beam from the first sixteenth over the rest to the last.
    const first = Math.min(...beams(over).map(beam => beam.x));
    const widest = Math.max(
      ...beams(over)
        .filter(beam => beam.x === first)
        .map(beam => beam.width),
    );
    expect(system(over).filter(mark => mark.name === 'Flag16thDown')).toEqual([]);
    const ended = engrave(TAB, { tabBeamsOverRests: false });
    // The first sixteenth on its own with a flag, the two after the rest beamed together.
    expect(system(ended).filter(mark => mark.name === 'Flag16thDown')).toHaveLength(1);
    expect(Math.max(...beams(ended).map(beam => beam.width))).toBeLessThan(widest);
    expect(beams(ended).every(beam => beam.x > first)).toBe(true);
  });

  it('circles half and whole notes on request, when the tablature shows the rhythm', () => {
    expect(circles(engrave(TAB))).toEqual([]);
    const circled = engrave(TAB, { tabCircleLongNotes: true });
    const texts = system(circled).filter(mark => mark.kind === 'text');
    // The last 7 is the half note, the last 5 the whole note of the second bar.
    const last = (fret: string) => texts.filter(text => text.name === fret).sort((a, b) => b.x - a.x)[0];
    const half = last('7');
    const whole = last('5');
    expect(circles(circled)).toHaveLength(2);
    // Around the half note's 7 and the whole note's 5, on their lines.
    expect(circles(circled).map(circle => circle.y)).toEqual([half?.y, whole?.y]);
    // Under a staff, the tablature shows no rhythm: no circles.
    expect(circles(engrave(BOTH, { tabCircleLongNotes: true }))).toEqual([]);
  });
});
